# PUBLISHED_AT — Progress

**Status:** 27/27 items · Complete ✅

## Current Focus
All phases complete. Feature fully implemented.
Next step: none
Blocker: none

## Progress

### Phase 1: DB + Schema ✅
- [x] Create migration `db/migrations/2026-05-08-add-published-at.sql`
- [x] Update `db/schema.sql` — add `published_at` column to engines
- [x] Update `schemas/api.ts` — add `published_at` to `EngineRecordSchema`

### Phase 2: Service layer ✅
- [x] Add `EngineImmutableError` and `EngineNotPublishedError` error classes
- [x] Add `publishEngine(id, db?)` function
- [x] Guard `updateEngine()` — reject if published
- [x] Guard `deleteEngine()` — reject if published
- [x] Guard `activateEngine()` — reject if not published
- [x] Extend `listEngines()` — accept `status`, `orderBy`, `sort` params

### Phase 3: Route handlers ✅
- [x] New `POST /api/engines/:id/publish` endpoint
- [x] Modify `PATCH/DELETE /api/engines/:id` — catch `EngineImmutableError`
- [x] Modify `POST /api/engines/:id/activate` — catch `EngineNotPublishedError`
- [x] Modify `GET /api/engines` — accept `?status=`, `?orderBy=`, `?sort=` query params

### Phase 3.5: Remove project activation ✅
- [x] DB migration `2026-05-08-drop-projects-is-active.sql` + `db/schema.sql` — drop `is_active` from projects
- [x] Remove `activateProject()`, `getActiveProject()` from `services/projects.ts`
- [x] Delete `app/api/projects/[id]/activate/` and `app/api/projects/active/` routes
- [x] Remove `is_active` from `ProjectSchema`, delete Bruno files (`activate-project.bru`, `get-active-project.bru`)
- [x] Update `stores/engineStore.ts` — remove `isActive` from Project, use workspaceStore in `loadFromAPI` + `deleteProject` + `getActiveRecord`
- [x] Update `ProjectsLibrary` — use `workspaceStore.selectedProjectId` for selection (ATIVO → SELECIONADO)
- [x] Remove activation tests from `services/projects.test.ts` (225 → 220 tests)

### Phase 4: Calc Active endpoint ✅
- [x] `GET/POST /api/calc/active?projectId=X` — resolve active engine, execute, return `engineId`

### Phase 5: Tests ✅
- [x] `services/engines.test.ts` — tests for publish, immutability guards, status filter (220 tests passing)

### Phase 6: Bruno + Docs ✅
- [x] Bruno requests: `publish-engine.bru`, `calculate-active.bru`
- [x] ADR 010 + update `@todo/CONTEXT.md` + `.clinerules`

### Phase 7: Front-end — status labels + publish flow ✅
- [x] `stores/engineStore.ts` — add `publishedAt` to `EngineRecord` + `mapEngine()` + `publishEngine()` action
- [x] `/engines` list — status text per row (SAVED/PUBLISHED) + conditional actions + publish confirmation
- [x] `/builder` header — status label (DRAFT/SAVED/PUBLISHED) + conditional Save/Publish buttons
- [x] `/builder` — read-only mode for published engines (pointer-events-none + opacity)
- [x] Confirmation modals for Save and Publish actions

## Decisions Made During Execution
- 2026-05-08: Used `?status=saved` (not `draft`) since DRAFT is client-side only
- 2026-05-08: Added `name` to sortable columns whitelist
- 2026-05-08: Added `?orderBy=` and `?sort=` params to `listEngines` alongside `?status=`
- 2026-05-08: Fixed deprecated `z.string().datetime()` → `z.iso.datetime()` (Zod v4) across all schemas
- 2026-05-08: Phase 3.5 — "ATIVO" badge renamed to "SELECIONADO" in ProjectsLibrary (project selection is client-only, not a DB concept)
- 2026-05-08: Phase 4 — `resolveEngine()` helper extracts engine resolution logic (direct ID vs active) to avoid duplication in GET/POST
- 2026-05-08: Phase 7 — Read-only mode uses `pointer-events-none` + `opacity-60` on editing panels (left sidebar + center) instead of propagating a `readOnly` prop to every child component. Test panel (right sidebar) remains interactive for running calculations on published engines.
- 2026-05-08: Phase 7 — EngineLibrary confirmation modal reused for both delete and publish (via `useConfirm` hook) with contextual message text
