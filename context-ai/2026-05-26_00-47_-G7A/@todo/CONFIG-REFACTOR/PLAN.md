# Config Refactor — Plan

## Context

The `src/config/` layer has several architectural issues that make it hard to test, debug, and extend:

1. **Masked circular dependencies** — `EmbeddingManager`, `VectorStoreManager`, and `ProviderRegistry` use lazy imports inside methods/properties to avoid import cycles. This hides the real dependency graph and makes failures appear at runtime instead of import time.

2. **Singletons via unmanaged global state** — 6+ managers use the same pattern: module-level `_instance = None` + `get_manager()` function. No thread safety, no lifecycle management, no unified reset mechanism (makes testing painful).

3. **No validation of manual config edits** — Users can edit `~/.context-ai/config.json` manually, but the system doesn't validate the file on read. Invalid values (wrong model name, bad API key format, unknown provider) silently propagate until they cause cryptic errors deep in the stack.

### Confirmed circular dependency instances

```python
# EmbeddingManager.metadata_dir (src/config/embeddings.py)
@property
def metadata_dir(self) -> Path:
    if self._metadata_dir is None:
        from .storage import get_storage_manager  # lazy import
        storage = get_storage_manager()
        self._metadata_dir = storage.path_manager.embeddings_dir
    return self._metadata_dir

# VectorStoreManager (src/core/embeddings/vector_store.py)
def _get_storage_manager(self):
    if self._storage_manager is None:
        from config.storage import get_storage_manager  # lazy import
        self._storage_manager = get_storage_manager()
    return self._storage_manager

# ProviderRegistry (src/config/providers/registry.py)
def __init__(self, config_core=None):
    if config_core is None:
        from config.core import get_config_core  # lazy import
        config_core = get_config_core()
```

### Confirmed singleton pattern instances

All follow this pattern with no reset/cleanup:
- `ConfigCore` → `get_config_core()` / `reset_config_core()`
- `SettingsManager` → `get_settings_manager()` (no reset)
- `StorageManager` → `get_storage_manager()` / `reset_storage_manager()`
- `EmbeddingManager` → `get_embedding_manager()` / `reset_embedding_manager()`
- `ProviderRegistry` → `get_provider_registry()` (no reset)
- `LanguagesRegistry` → `get_languages_registry()` (no reset)
- `ModelManager` → `get_model_manager()` (no reset)

Only `ConfigCore`, `StorageManager`, and `EmbeddingManager` have reset functions. The rest don't.

## Goals

1. Eliminate masked circular dependencies by using explicit constructor injection
2. Add `reset()` functions to ALL singletons (enables proper test isolation)
3. Add config.json validation on read (using Pydantic, which is already a dependency)
4. Ensure user-edited config files are validated gracefully with clear error messages

## Scope

**In scope:**
- Refactor lazy imports → explicit constructor injection in `EmbeddingManager`, `VectorStoreManager`, `ProviderRegistry`
- Add missing `reset_*()` functions to `SettingsManager`, `ProviderRegistry`, `LanguagesRegistry`, `ModelManager`
- Create a Pydantic model for `config.json` schema validation
- Validate config.json on every `ConfigCore` read, with clear error messages for invalid values
- Add a `context-ai config validate` CLI subcommand

**Out of scope:**
- Application Factory / DI container (over-engineering for a CLI tool)
- Event-driven architecture (unnecessary)
- Async support (CLI is synchronous)
- File watching / hot-reload of config changes
- Changing the config file format (keep JSON)

## Decisions

- **Constructor injection over DI container.** Simple, explicit, no framework needed. Each manager receives its dependencies in `__init__()`, with the `get_*()` factory wiring them together.
- **Pydantic for validation.** Already a project dependency (v2). Natural fit for config schema validation.
- **Graceful degradation on invalid config.** Show a clear Rich error message with what's wrong and how to fix it, instead of crashing with a traceback.

## Key Files Affected

| File | Change |
|---|---|
| `src/config/embeddings.py` | Constructor injection for `storage_manager` |
| `src/config/providers/registry.py` | Add `reset_provider_registry()`, keep existing DI |
| `src/config/settings.py` | Add `reset_settings_manager()` |
| `src/config/languages/registry.py` | Add `reset_languages_registry()` |
| `src/core/embeddings/model_manager.py` | Add `reset_model_manager()` |
| `src/core/embeddings/vector_store.py` | Constructor injection for `storage_manager` |
| `src/config/core.py` | Add Pydantic validation on config read |
| `src/config/models.py` | Add `ConfigSchema` Pydantic model |
| `src/commands/config.py` | Add `validate` subcommand |

## Phases

### Phase 1: Add missing reset functions (small)
- Add `reset_settings_manager()` to `settings.py`
- Add `reset_provider_registry()` to `providers/registry.py`
- Add `reset_languages_registry()` to `languages/registry.py`
- Add `reset_model_manager()` to `model_manager.py`
- Create a `reset_all_managers()` utility for tests

### Phase 2: Resolve circular dependencies (medium)
- Refactor `EmbeddingManager.__init__()` to accept `storage_path_provider` parameter
- Refactor `VectorStoreManager.__init__()` to accept `storage_manager` parameter
- Update `get_embedding_manager()` and `get_vector_store()` factories to wire dependencies
- Remove all lazy imports in config/core layer
- Verify no import cycles with `python -c "import src.config"`

### Phase 3: Config validation (medium)
- Create `ConfigSchema` Pydantic model in `src/config/models.py` covering:
  - `active_provider`: must be a registered provider name
  - `model`: must be a valid model for the active provider
  - `api_key`: non-empty string (no format validation — provider-specific)
  - `max_tokens`: positive integer within model limits
  - `prompt_mode`: one of [minimal, standard, comprehensive, strict]
- Add validation in `ConfigCore._load_config()` with clear error messages
- Add `context-ai config validate` CLI subcommand
- Handle graceful degradation: if config is invalid, show what's wrong + suggest fix
