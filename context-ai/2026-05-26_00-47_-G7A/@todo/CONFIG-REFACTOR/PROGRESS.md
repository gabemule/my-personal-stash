# Config Refactor — Progress

**Status:** 0/3 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Add missing `reset_*()` functions to all singleton managers
Blocker: none

## Progress

### Phase 1: Add missing reset functions
- [ ] Add `reset_settings_manager()` to `settings.py`
- [ ] Add `reset_provider_registry()` to `providers/registry.py`
- [ ] Add `reset_languages_registry()` to `languages/registry.py`
- [ ] Add `reset_model_manager()` to `model_manager.py`
- [ ] Create `reset_all_managers()` utility

### Phase 2: Resolve circular dependencies
- [ ] Refactor `EmbeddingManager` — constructor injection for storage
- [ ] Refactor `VectorStoreManager` — constructor injection for storage
- [ ] Update factory functions to wire dependencies
- [ ] Remove all lazy imports in config/core layer
- [ ] Verify no import cycles

### Phase 3: Config validation
- [ ] Create `ConfigSchema` Pydantic model
- [ ] Add validation in `ConfigCore._load_config()`
- [ ] Add `context-ai config validate` CLI subcommand
- [ ] Handle graceful degradation with clear error messages

## Decisions Made During Execution
(none yet)
