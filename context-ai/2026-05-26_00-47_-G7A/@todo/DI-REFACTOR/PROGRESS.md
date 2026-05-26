# DI Refactor — Progress

**Status:** 0/4 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Evaluate DI approach (App Context vs library vs hand-rolled)
Blocker: Deferred until FastAPI work begins or TESTING needs mock support

## Progress

### Phase 1: Design DI approach
- [ ] Evaluate App Context vs DI library vs hand-rolled
- [ ] Write design doc / prototype
- [ ] Decide on pattern

### Phase 2: Create DI infrastructure
- [ ] Implement chosen DI pattern
- [ ] Create container with all current singletons
- [ ] Add `reset()` for testing
- [ ] Add scoping for FastAPI requests

### Phase 3: Migrate singletons
- [ ] Migrate `ConfigCore`
- [ ] Migrate `SettingsManager`
- [ ] Migrate `StorageManager`
- [ ] Migrate `LanguagesRegistry`
- [ ] Migrate `ModelManager`
- [ ] Migrate `TokenManager`
- [ ] Migrate `ContextFormatter`
- [ ] Update all call sites

### Phase 4: Verify & update docs
- [ ] Run `make lint`
- [ ] Update ADR-005
- [ ] Update `@todo/CONTEXT.md`

## Decisions Made During Execution
(none yet)
