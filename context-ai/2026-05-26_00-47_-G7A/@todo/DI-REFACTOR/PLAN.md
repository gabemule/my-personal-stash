# DI Refactor — Plan

## Context

The codebase uses 6+ module-level singletons via `get_<thing>()` factory functions (see ADR-005). This pattern works for CLI-only usage but is fundamentally incompatible with:

1. **FastAPI** — concurrent requests share mutable global state (race conditions)
2. **Testing** — no way to reset or mock singletons between tests
3. **Explicit dependencies** — any module can access any singleton without declaring the dependency

Current singletons: `ConfigCore`, `SettingsManager`, `StorageManager`, `LanguagesRegistry`, `ModelManager`, `TokenManager`, `ContextFormatter`.

## Goals

1. Replace global singletons with a **Dependency Injection** pattern
2. Make all dependencies explicit and injectable
3. Enable concurrent-safe usage for FastAPI
4. Enable test isolation with mock/stub dependencies
5. Maintain ergonomic API for CLI usage (don't make simple things hard)

## Scope

**In scope:**
- Design and implement DI approach (App Context object or DI container)
- Migrate all 6+ singletons to the new pattern
- Add `reset` / `override` capabilities for testing
- Ensure CLI startup performance is not degraded
- Update ADR-005 to reflect the migration

**Out of scope:**
- FastAPI implementation itself (separate TODO)
- Writing tests (tracked in `@todo/TESTING/`)

## Decisions

- **Approach TBD:** Choose between:
  1. **App Context Object** — single `AppContext` dataclass passed through call chain. Simple, no library dependency. Best for our size.
  2. **`dependency-injector` library** — full DI container with scoping. More powerful but adds dependency and boilerplate.
  3. **Hand-rolled registry** — lightweight DI container built in-house. Middle ground.
- **Decision deferred** until FastAPI work begins, to have a concrete use case for scoping.

## Key Files Affected

| File | Change |
|---|---|
| All `get_*()` factory functions | Replace with DI wiring |
| `src/config/core.py` | Remove global `_config_core` |
| `src/config/settings.py` | Remove global `_settings_manager` |
| `src/config/storage.py` | Remove global `_storage_manager` |
| `src/config/languages/registry.py` | Remove global `_languages_registry` |
| `src/core/embeddings/model_manager.py` | Remove global `_model_manager` |
| `src/core/ai/token_manager.py` | Remove global `_token_manager` |
| `src/core/formatting/context_formatter.py` | Remove global `_context_formatter` |
| All call sites using `get_*()` | Receive dependencies via constructor/parameter |

## Phases

### Phase 1: Design DI approach (small)
- Evaluate App Context vs DI library vs hand-rolled
- Write a design doc / prototype with one singleton
- Decide on the pattern

### Phase 2: Create DI infrastructure (medium)
- Implement chosen DI pattern
- Create `AppContext` or container with all current singletons
- Add `reset()` for testing
- Add scoping for future FastAPI requests

### Phase 3: Migrate singletons (large)
- Replace each `get_*()` call site with DI-provided instance
- Remove global `_*` variables
- Ensure lazy initialization is preserved (startup perf)

### Phase 4: Verify & update docs (small)
- Run `make lint`
- Update ADR-005 to reflect completed migration
- Update `@todo/CONTEXT.md`
