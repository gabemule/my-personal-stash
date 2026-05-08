# PUBLISHED_AT — Progress

**Status:** 0/20 items · Phase: Not started

## Current Focus
[Not started]
Next step: Execute RENAME_DELETED_AT prerequisite first
Blocker: Depends on RENAME_DELETED_AT completion (`disabled_at` → `deleted_at`)

## Progress

### Phase 1: DB + Schema
- [ ] Create migration `db/migrations/2026-05-XX-add-published-at.sql`
- [ ] Update `db/schema.sql` — add `published_at` column to engines
- [ ] Update `schemas/api.ts` — add `published_at` to `EngineRecordSchema`

### Phase 2: Service layer
- [ ] Add `EngineImmutableError` and `EngineNotPublishedError` error classes
- [ ] Add `publishEngine(id, db?)` function
- [ ] Guard `updateEngine()` — reject if published
- [ ] Guard `deleteEngine()` — reject if published
- [ ] Guard `activateEngine()` — reject if not published
- [ ] Extend `listEngines()` — accept `status?: "published" | "draft"` filter

### Phase 3: Route handlers
- [ ] New `POST /api/engines/:id/publish` endpoint
- [ ] Modify `PATCH/DELETE /api/engines/:id` — catch `EngineImmutableError`
- [ ] Modify `POST /api/engines/:id/activate` — catch `EngineNotPublishedError`
- [ ] Modify `GET /api/engines` — accept `?status=` query param

### Phase 3.5: Remove project activation
- [ ] DB migration + `db/schema.sql` — drop `is_active` from projects
- [ ] Remove `activateProject()`, `getActiveProject()` from `services/projects.ts`
- [ ] Delete `app/api/projects/[id]/activate/` and `app/api/projects/active/` routes
- [ ] Remove `is_active` from `ProjectSchema`, delete Bruno files, update `workspaceStore`
- [ ] Remove activation tests from `services/projects.test.ts`

### Phase 4: Calc Active endpoint
- [ ] `GET/POST /api/calc/active?projectId=X` — resolve active engine, execute, return `engineId`

### Phase 5: Tests
- [ ] `services/engines.test.ts` — tests for publish, immutability guards, status filter

### Phase 6: Bruno + Docs
- [ ] Bruno requests: `publish-engine.bru`, `calculate-active.bru`
- [ ] ADR 010 + update `@todo/CONTEXT.md` + `.clinerules`

## Decisions Made During Execution
(none yet)
