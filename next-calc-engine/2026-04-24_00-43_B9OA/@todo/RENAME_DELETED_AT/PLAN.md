# RENAME_DELETED_AT — Plan

## Context

The codebase uses two different column names for soft-delete:
- `disabled_at` — on `projects` and `engines` tables (ADR 004)
- `deleted_at` — on `api_keys` table

This inconsistency causes confusion and will complicate the Drizzle migration (which needs a single `softDelete` helper). The rename should happen **before** the Drizzle migration to keep that migration scope clean.

## Goals

1. Rename the DB column `disabled_at` → `deleted_at` on `projects` and `engines` tables
2. Update all application code referencing `disabled_at` to use `deleted_at`
3. Update Zod schemas, tests, docs, ADRs, and project rules to reflect the new name
4. Zero behavioral change — soft-delete logic stays identical, only the column name changes

## Scope

### In scope
- SQL migration: `ALTER TABLE ... RENAME COLUMN disabled_at TO deleted_at`
- `services/engines.ts` — ~12 refs (`.is("disabled_at", null)`, `disabled_at` in update payloads)
- `services/projects.ts` — ~10 refs (same pattern)
- `schemas/api.ts` — 2 refs (`disabled_at` field in `ProjectSchema` and `EngineRecordSchema`)
- `db/schema.sql` — 2 refs (column definitions)
- `db/migrations/2026-05-02-soft-delete.sql` — references `disabled_at`
- `services/engines.test.ts` — mock data and assertions referencing `disabled_at`
- `services/projects.test.ts` — same
- `docs/adr/004-soft-delete.md` — rename rationale and all `disabled_at` mentions
- `@todo/CONTEXT.md` — update "Known Pitfalls" and "Conventions" sections
- `.clinerules` — update soft-delete references

### Out of scope
- Changing soft-delete behavior (still `timestamptz`, still filter `.is("deleted_at", null)`)
- Touching `api_keys` (already uses `deleted_at`)
- RLS policies (current RLS doesn't filter by `disabled_at` anyway)
- Any Drizzle or Auth.js migration work

## Decisions

| Decision | Rationale |
|---|---|
| Rename to `deleted_at` (not keep `disabled_at`) | Aligns with `api_keys`, industry convention, and simplifies future Drizzle schema |
| Single migration file | One `ALTER TABLE RENAME COLUMN` per table — atomic, no data transformation needed |
| Update ADR 004 in-place | The ADR rationale for `disabled_at` over `deleted_at` is now reversed — update the ADR to reflect the new decision |
| Keep migration idempotent | Use `DO $$ ... IF EXISTS` block so migration can be re-run safely |

## Phases

### Phase 1: Database migration (~5 min)
- Create `db/migrations/2026-05-XX-rename-disabled-to-deleted.sql`
- Update `db/schema.sql` to use `deleted_at`

### Phase 2: Application code (~15 min)
- `services/engines.ts` — find/replace `disabled_at` → `deleted_at`
- `services/projects.ts` — find/replace `disabled_at` → `deleted_at`
- `schemas/api.ts` — rename field in `ProjectSchema` and `EngineRecordSchema`

### Phase 3: Tests (~10 min)
- `services/engines.test.ts` — update mock data and assertions
- `services/projects.test.ts` — update mock data and assertions
- Run `yarn test` to verify

### Phase 4: Documentation (~10 min)
- `docs/adr/004-soft-delete.md` — update column name throughout, update rationale
- `@todo/CONTEXT.md` — update conventions, known pitfalls, DB schema section
- `.clinerules` — update soft-delete references
- `db/migrations/2026-05-02-soft-delete.sql` — update column name reference