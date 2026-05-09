# URL_DRIVEN_LOADING — Progress

**Status:** 10/10 items · Phase: Complete

## Current Focus
All phases complete. Ready for manual testing and commit.

## Progress

### Phase 0: Backend micro-additions
- [x] Add `GET /api/engines/:id` endpoint (uses existing `getEngineById`)
- [x] Invert `listEngines` semantics: `undefined`=all, `null`=orphans, `string`=by project

### Phase 1: Infrastructure
- [x] Create `hooks/useRouteState.ts` — URL ↔ store sync hook
- [x] Refactor `engineStore` — add `loadProjects`/`loadEngines`/`loadEngineById`

### Phase 2: Builder + Calc + WorkspaceSelector
- [x] Refactor `WorkspaceSelector` — remove own fetch, become presentational
- [x] Refactor `EngineBuilder` — URL-driven init with `?engineId`
- [x] Refactor `Calculator` — URL-driven init with `?engineId`

### Phase 3: Engines page
- [x] Refactor `EngineLibrary` — URL-driven filter with `?projectId`, kill N+1

### Phase 4: Cleanup
- [x] Removed dead code: WorkspaceSelector.fetchEngines, EngineLibrary.fetchAllEngines

### Phase 5: Docs
- [x] Update PROGRESS.md and CONTEXT.md

## Decisions Made During Execution
- 2026-05-08: Changed `listEngines` semantics instead of adding `?all=true` flag. `projectId: undefined` → all engines (no filter), `null` → orphans, `string` → by project. Cleaner API, user preferred this approach.
- 2026-05-08: `useRouteState` hook handles both `engineId` and `projectId` params. EngineLibrary uses `useSearchParams` directly instead (different behavior: no auto-redirect, optional filter).
- 2026-05-08: EngineLibrary links now include `?engineId` in builder/calc URLs for direct deep-linking from engine cards.
- 2026-05-08: `loadFromAPI()` kept as legacy wrapper — not removed, used nowhere after refactor but safe to keep for backward compat.
