# URL_DRIVEN_LOADING — Progress

**Status:** 0/14 items · Phase: Not started

## Current Focus
[Not started]
Next step: Create `hooks/useRouteState.ts` hook
Blocker: none

## Progress

### Phase 1: Infrastructure
- [ ] Create `hooks/useRouteState.ts` — central hook resolving URL params ↔ workspaceStore
- [ ] Refactor `engineStore` — split `loadFromAPI()` into `loadProjects()`, `loadEngines()`, `loadEngineById()`

### Phase 2: Builder + Calc
- [ ] Refactor `WorkspaceSelector` — remove internal fetch, become presentational
- [ ] Refactor `EngineBuilder` — URL-driven init via `?engineId`
- [ ] Refactor `Calculator` — URL-driven init via `?engineId`

### Phase 3: Engines page
- [ ] Refactor `EngineLibrary` — URL-driven filter via `?projectId`, kill N+1 fetches
- [ ] Evaluate `GET /api/engines` "all" mode — may need route handler tweak

### Phase 4: Cleanup + Polish
- [ ] Remove dead code (`fetchEngines`, `fetchAllEngines`, direct `loadFromAPI` calls)
- [ ] Sync workspaceStore with URL on every resolve
- [ ] Test: `/builder` without params → resolves first engine
- [ ] Test: `/builder?engineId=invalid` → fallback
- [ ] Test: back/forward navigation between engines
- [ ] Test: `/engines` without params → shows all grouped

### Phase 5: Docs
- [ ] Update `@todo/CONTEXT.md` — document URL-driven loading pattern

## Decisions Made During Execution
(none yet)