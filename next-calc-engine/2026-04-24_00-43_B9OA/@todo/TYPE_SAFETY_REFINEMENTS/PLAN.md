# TYPE_SAFETY_REFINEMENTS — Plan

## Context

During the ZOD-SSOT audit, type-safety and error-handling gaps were identified across all services and route handlers:

1. **`stores/engineStore.ts`** — `mapEngine` and `mapProject` accept `Row = Record<string, unknown>` and use manual `as` casts, even though `EngineRecordRow` and `ProjectRow` types (derived from Zod) are already defined in the same file.
2. **Error handling across all services** — mix of raw `throw new Error("...")`, Supabase PGRST116 errors surfacing as 500s, and fragile string matching (`msg.includes("not found")`, `msg === "Engine not found"`) in route handlers. No shared error module exists.

## Goals

1. Replace `type Row = Record<string, unknown>` with the existing Zod-derived row types in mappers, eliminating `as` casts
2. Create a shared `services/errors.ts` with `NotFoundError` class
3. Wrap PGRST116 (Supabase `.single()` no-rows) as `NotFoundError` in all affected service functions
4. Replace all string-based error detection in route handlers with `instanceof NotFoundError`
5. Fix the bug where `GET /api/engines/:id` returns 500 instead of 404 on not-found

## Audit Results

### Bug
- `GET /api/engines/:id` — `getEngineById` throws PGRST116 (message: `"JSON object requested, multiple (or no) rows returned"`), route checks `msg.includes("not found")` which doesn't match → returns 500 instead of 404.

### Fragile string matching (3 points)
- `GET /api/engines/:id` — `msg.includes("not found")` (also the bug above)
- `POST /api/engines/:id/publish` — `msg === "Engine not found"`
- `POST /api/engines/:id/activate` — `msg === "Engine not found"`

### Not-found without handling (4 points)
- `PATCH /api/engines/:id` — `updateEngine` pre-check ignores error → PGRST116 on update → 500
- `DELETE /api/engines/:id` — `deleteEngine` pre-check ignores error → silently succeeds (0 rows)
- `PATCH /api/projects/:id` — `updateProject` `.single()` → PGRST116 → 500
- `DELETE /api/projects/:id` — silently succeeds (idempotent, acceptable)

### No issues found
- `calc` routes — explicit null check before 404
- `api-keys` routes — `revokeApiKey` silently succeeds (idempotent, acceptable)
- `auth` routes — no not-found scenarios

## Scope

### In scope

**Item 1: Type-safe mappers**
- `stores/engineStore.ts` — `mapEngine(row: EngineRecordRow)`, `mapProject(row: ProjectRow)`, remove `type Row` and `as` casts

**Item 2: Shared error module**
- Create `services/errors.ts` with `NotFoundError` class (parameterized: resource + resourceId)

**Item 3: Services — engines (5 functions)**
- `getEngineById` — wrap PGRST116 → `NotFoundError`
- `updateEngine` — check error on pre-fetch, wrap PGRST116 → `NotFoundError`
- `deleteEngine` — check error on pre-fetch, wrap PGRST116 → `NotFoundError`
- `publishEngine` — replace `throw new Error("Engine not found")` → `throw new NotFoundError("Engine", id)`
- `activateEngine` — replace `throw new Error("Engine not found")` → `throw new NotFoundError("Engine", id)`

**Item 4: Services — projects (2 functions)**
- `getProjectById` — wrap PGRST116 → `NotFoundError`
- `updateProject` — wrap PGRST116 → `NotFoundError`

**Item 5: Route handlers — engines (4 routes)**
- `GET /api/engines/:id` — fix bug + `instanceof NotFoundError` → 404
- `PATCH /api/engines/:id` — add `instanceof NotFoundError` → 404
- `POST /api/engines/:id/publish` — replace string match → `instanceof NotFoundError` → 404
- `POST /api/engines/:id/activate` — replace string match → `instanceof NotFoundError` → 404

**Item 6: Route handlers — projects (1 route)**
- `PATCH /api/projects/:id` — add `instanceof NotFoundError` → 404

### Out of scope
- DELETE routes (idempotent — silently succeeding on missing resource is acceptable REST pattern)
- `api-keys` service (no not-found scenarios relevant)
- `calc` routes (already handle null correctly)
- Moving domain-specific errors (`EngineConflictError`, `EngineImmutableError`, etc.) — they're specific to their service and won't be reused

## Decisions

- `NotFoundError` lives in `services/errors.ts` — shared across all services. Parameterized with `resource` and `resourceId` for good error messages and logging.
- Domain-specific errors (`EngineConflictError`, `ProjectConflictError`, etc.) stay in their service files — they're inherently specific and won't be reused elsewhere.
- PGRST116 detection via `error.code === "PGRST116"` — the Supabase PostgREST error code for "no rows returned from `.single()`".
- DELETE idempotency preserved — `deleteEngine` and `deleteProject` don't throw NotFoundError (silently succeed on missing, standard REST).
