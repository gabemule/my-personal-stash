# RENAME_DELETED_AT — Progress

**Status:** 11/11 items · Phase: Complete ✅

## Current Focus
All phases complete. Ready to commit.

## Progress

### Phase 1: Database migration
- [x] Create `db/migrations/2026-05-08-rename-disabled-to-deleted.sql`
- [x] Update `db/schema.sql` — rename `disabled_at` → `deleted_at` on both tables

### Phase 2: Application code
- [x] `services/engines.ts` — replace all `disabled_at` refs with `deleted_at`
- [x] `services/projects.ts` — replace all `disabled_at` refs with `deleted_at`
- [x] `schemas/api.ts` — rename field in `ProjectSchema` and `EngineRecordSchema`

### Phase 3: Tests
- [x] `services/engines.test.ts` — update mock data and assertions
- [x] `services/projects.test.ts` — update mock data and assertions
- [x] Run `yarn test` — all green (212/212 passed)

### Phase 4: Documentation
- [x] `docs/adr/004-soft-delete.md` — update column name and rationale
- [x] `@todo/CONTEXT.md` + `docs/api-flow.md` — update soft-delete references
- [x] `db/migrations/2026-05-02-soft-delete.sql` — update column name reference

## Decisions Made During Execution
- 2026-05-08: Also updated JSDoc in `app/api/engines/[id]/route.ts` and `app/api/projects/[id]/route.ts` (not in original plan, found during audit)
