# RENAME_DELETED_AT — Progress

**Status:** 0/11 items · Phase: Not started

## Current Focus
[Not started]
Next step: Create SQL migration file `db/migrations/2026-05-XX-rename-disabled-to-deleted.sql`
Blocker: none

## Progress

### Phase 1: Database migration
- [ ] Create `db/migrations/2026-05-XX-rename-disabled-to-deleted.sql`
- [ ] Update `db/schema.sql` — rename `disabled_at` → `deleted_at` on both tables

### Phase 2: Application code
- [ ] `services/engines.ts` — replace all `disabled_at` refs with `deleted_at`
- [ ] `services/projects.ts` — replace all `disabled_at` refs with `deleted_at`
- [ ] `schemas/api.ts` — rename field in `ProjectSchema` and `EngineRecordSchema`

### Phase 3: Tests
- [ ] `services/engines.test.ts` — update mock data and assertions
- [ ] `services/projects.test.ts` — update mock data and assertions
- [ ] Run `yarn test` — all green

### Phase 4: Documentation
- [ ] `docs/adr/004-soft-delete.md` — update column name and rationale
- [ ] `@todo/CONTEXT.md` + `.clinerules` — update soft-delete references
- [ ] `db/migrations/2026-05-02-soft-delete.sql` — update column name reference

## Decisions Made During Execution
(none yet)