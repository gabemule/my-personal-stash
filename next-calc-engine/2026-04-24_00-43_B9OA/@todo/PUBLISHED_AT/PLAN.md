# PUBLISHED_AT — Plan

## Context

Engines currently have no concept of "finality." Any engine can be edited, deleted, or activated at any time. This is problematic for production use: when a contract is calculated using a specific engine version, that version must remain intact for auditability and recalculation.

The solution is a **publish lifecycle**: engines start as drafts, are freely editable, and once published become immutable. Only published engines can be activated. The active engine for a project is the one used by the BFF/M2M callers.

Additionally, a "calc active" endpoint allows callers to execute calculations by project (resolving the active engine automatically), returning the `engineId` so callers can track which version produced each result.

**Prerequisite:** RENAME_DELETED_AT should be executed first (renames `disabled_at` → `deleted_at`) so new code references the final column name.

## Goals

1. Add `published_at timestamptz` column to `engines` table
2. Published engines are **immutable** — cannot be edited, soft-deleted, or unpublished
3. Only published engines can be **activated** (`is_active = true`)
4. New endpoint: `POST /api/engines/:id/publish`
5. New endpoint: `GET/POST /api/calc/active?projectId=X` — resolve active engine and execute
6. Status filter on listing: `GET /api/engines?projectId=X&status=published|draft`
7. Remove `is_active` from projects — workspace selection is client-side only (Zustand)
8. ADR 010 documenting the rules

## Scope

### In scope

- DB migration: `ALTER TABLE engines ADD COLUMN published_at timestamptz DEFAULT NULL`
- `db/schema.sql` — add column definition
- `schemas/api.ts` — add `published_at` to `EngineRecordSchema`
- `services/engines.ts`:
  - New: `publishEngine(id, db?)`
  - New error classes: `EngineImmutableError`, `EngineNotPublishedError`
  - Guard in `updateEngine()` — reject if published
  - Guard in `deleteEngine()` — reject if published
  - Guard in `activateEngine()` — reject if not published
  - `listEngines()` — accept `status?: "published" | "draft"` filter
  - `getEngineDefinition()` — `unstable_cache` with `revalidate: false` for published engines; draft engines bypass cache
- `app/api/engines/[id]/publish/route.ts` — new endpoint
- `app/api/engines/[id]/route.ts` — catch `EngineImmutableError` → 409
- `app/api/engines/[id]/activate/route.ts` — catch `EngineNotPublishedError` → 422
- `app/api/engines/route.ts` — accept `?status=` query param
- `app/api/calc/[...segments]/route.ts` — handle `active` segment with `?projectId=`
- `services/engines.test.ts` — tests for all new behaviors
- `bruno/engines/publish-engine.bru` — new request
- `bruno/calc/calculate-active.bru` — new request
- `docs/adr/010-engine-publishing.md`
- Remove `is_active` from projects:
  - `services/projects.ts` — remove `activateProject()`, `getActiveProject()`
  - `app/api/projects/[id]/activate/route.ts` — delete endpoint
  - `app/api/projects/active/route.ts` — delete endpoint
  - `schemas/api.ts` — remove `is_active` from `ProjectSchema`
  - `db/schema.sql` — drop `is_active` column from projects
  - `bruno/projects/activate-project.bru`, `get-active-project.bru` — delete
  - `stores/workspaceStore.ts` — ensure workspace selection is Zustand-only (first project on initial load)
- `@todo/CONTEXT.md`, `.clinerules` — update references

### Out of scope

- Semantic versioning (v1, v2...) — engine name is the differentiator for now
- "Clone published engine to edit" flow — done manually via create
- Status badge components (colored pills etc.) — plain text labels are enough for now

## Decisions

| Decision | Rationale |
|---|---|
| `published_at timestamptz` (not boolean) | Timestamp tells us WHEN it was published — useful for auditing |
| Immutability enforced at service layer | Consistent with services as business-rule guardians (ADR 002) |
| `GET/POST /api/calc/active?projectId=X` | Reuses existing catch-all route, `active` as special segment. BFF doesn't need to know engine IDs |
| Calc active response includes `engineId` | Enables traceability: "this contract was calculated with engine X" |
| `?status=` filter on listing | Simple, non-breaking (no filter = return all) |
| Only published engines can be activated | Prevents accidental production use of draft engines |
| Published engines cannot be soft-deleted | Preserves historical versions for contract recalculation |
| Remove `is_active` from projects | "Active project" has no business meaning — workspace selection is a UI concern managed by Zustand. First project loaded on initial page load. |
| `unstable_cache` with `revalidate: false` for published engines | Published engines are immutable — the JSONB never changes, so cache is semantically correct forever. Zero invalidation needed. Draft engines skip cache entirely (query direct to DB). Cache key prefix: `["published-engine-def"]`, tag: `engine:${engineId}` — allows surgical invalidation per engine if ever needed (e.g., emergency hotfix). |
| DRAFT is a client-side concept only | DRAFT = builder has unsaved local changes (dirty). It never appears in `/engines` list — if it exists in DB, it's at least SAVED. |
| Plain text labels, not colored badges | "DRAFT", "SAVED", "PUBLISHED" as text — no badge components needed. Keeps it simple. |
| Confirmation modals for Save and Publish | Both destructive-ish actions get a modal: Save confirms overwrite, Publish warns about immutability. |
| Published engines are read-only in builder | Builder disables all editing when engine is published. No save/publish buttons shown. |

## Phases

### Phase 1: DB + Schema (~5 min)
- Create migration `db/migrations/2026-05-XX-add-published-at.sql`
- Update `db/schema.sql` with `published_at` column
- Update `EngineRecordSchema` in `schemas/api.ts`

### Phase 2: Service layer (~30 min)
- New error classes: `EngineImmutableError`, `EngineNotPublishedError`
- New function: `publishEngine(id, db?)`
- Guard `updateEngine()`: reject if `published_at IS NOT NULL`
- Guard `deleteEngine()`: reject if `published_at IS NOT NULL`
- Guard `activateEngine()`: reject if `published_at IS NULL`
- Extend `listEngines()`: accept `status?: "published" | "draft"` param
- Cache `getEngineDefinition()`: check if engine is published → if yes, wrap in `unstable_cache` with `revalidate: false` (infinite, no invalidation needed); if draft, query DB directly (no cache)
- Pino logs for cache observability: `logger.info({ engineId, source: "cache" | "db" }, "engines.getDefinition")` — lets us verify cache is working in production and measure hit rate

### Phase 3: Route handlers (~20 min)
- New: `POST /api/engines/:id/publish`
- Modify: `PATCH /api/engines/:id` — catch `EngineImmutableError` → 409
- Modify: `DELETE /api/engines/:id` — catch `EngineImmutableError` → 409
- Modify: `POST /api/engines/:id/activate` — catch `EngineNotPublishedError` → 422
- Modify: `GET /api/engines` — accept `?status=` query param

### Phase 3.5: Remove project activation (~15 min)
- DB migration: `ALTER TABLE projects DROP COLUMN is_active`
- `services/projects.ts` — remove `activateProject()`, `getActiveProject()`
- `app/api/projects/[id]/activate/route.ts` — delete
- `app/api/projects/active/route.ts` — delete
- `schemas/api.ts` — remove `is_active` from `ProjectSchema`
- `db/schema.sql` — remove `is_active` from projects table
- `bruno/projects/activate-project.bru`, `get-active-project.bru` — delete
- `stores/workspaceStore.ts` — ensure Zustand-only selection (load first project on init)
- `services/projects.test.ts` — remove activation tests

### Phase 4: Calc Active endpoint (~20 min)
- `GET /api/calc/active?projectId=X` → return input schema of active engine
- `POST /api/calc/active?projectId=X` → execute active engine, return result + `engineId`
- Logic: resolve `getActiveEngine({ projectId })` → get definition → execute

### Phase 5: Tests (~20 min)
- `publishEngine` — happy path, already published (409)
- `updateEngine` — reject published engine
- `deleteEngine` — reject published engine
- `activateEngine` — reject unpublished, accept published
- `listEngines` — status filter

### Phase 6: Bruno + Docs (~15 min)
- `bruno/engines/publish-engine.bru`
- `bruno/calc/calculate-active.bru`
- `docs/adr/010-engine-publishing.md`
- Update `@todo/CONTEXT.md`
- Update `.clinerules`

### Phase 7: Front-end — status labels + publish flow (~2h)

#### Status model

| Context | Visible states | How determined |
|---------|---------------|----------------|
| `/engines` list | `SAVED` / `PUBLISHED` | `publishedAt === null` → SAVED, else → PUBLISHED |
| `/builder` | `DRAFT` / `SAVED` / `PUBLISHED` | DRAFT = dirty (unsaved local changes), SAVED = clean + `publishedAt === null`, PUBLISHED = `publishedAt !== null` |

DRAFT never appears in `/engines` — if it exists in DB, it's at least SAVED.

#### `/engines` list changes
- `stores/engineStore.ts` — add `publishedAt` to `EngineRecord` type + `mapEngine()` helper
- `app/engines/components/EnginesPanel/` — add status text per row ("SAVED" or "PUBLISHED")
- Conditional actions per status:
  - SAVED: [Edit] [Publish] [Delete]
  - PUBLISHED: [Activate] (no edit, no delete)
  - ACTIVE (published + active): [Deactivate]
- `publishEngine()` action in `engineStore.ts` — calls `POST /api/engines/:id/publish`

#### `/builder` changes
- `app/builder/components/BuilderHeader/` — add text label showing current status (DRAFT / SAVED / PUBLISHED)
- Existing asterisk `*` on engine name continues as dirty indicator
- **Save button**: visible only when dirty (DRAFT state). Triggers confirmation modal before saving.
- **Publish button**: visible only when SAVED (clean, not published). Triggers confirmation modal warning about immutability.
- **Published engine in builder**: read-only mode — all editing disabled, no Save/Publish buttons shown.

#### Confirmation modals
- **Save Modal**: "Save engine `{name}`?" → [Cancel] [Save]
- **Publish Modal**: "Publish engine `{name}`? After publishing, the engine becomes immutable and cannot be edited or deleted." → [Cancel] [Publish]

#### Button visibility matrix (builder)

```
State      │ Label      │ Save btn   │ Publish btn │ Editable?
───────────┼────────────┼────────────┼─────────────┼──────────
DRAFT      │ DRAFT      │ ✅ visible  │ ❌ hidden    │ ✅ yes
SAVED      │ SAVED      │ ❌ hidden   │ ✅ visible   │ ✅ yes
PUBLISHED  │ PUBLISHED  │ ❌ hidden   │ ❌ hidden    │ ❌ read-only
```

#### Files touched
- `stores/engineStore.ts` — `publishedAt` field + `publishEngine()` action
- `app/engines/components/EnginesPanel/index.tsx` — status text + conditional actions
- `app/builder/components/BuilderHeader/index.tsx` — status label + Save/Publish buttons with conditional visibility
- `app/builder/components/EngineBuilder/index.tsx` — read-only guard for published engines, modal state for Save/Publish confirmations
