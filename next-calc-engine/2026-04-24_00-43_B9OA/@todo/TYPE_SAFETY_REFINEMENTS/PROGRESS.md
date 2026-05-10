# TYPE_SAFETY_REFINEMENTS — Progress

**Status:** 6/6 items · Complete

## Current Focus
✅ All items complete. Verified with `yarn tsc --noEmit` and `yarn test` (246/246 passing).

## Progress

### Item 1: Type-safe mappers
- [x] Change `mapEngine(row: Row)` → `mapEngine(row: EngineRecordRow)`, remove `as` casts
- [x] Change `mapProject(row: Row)` → `mapProject(row: ProjectRow)`, remove `as` casts
- [x] Remove `type Row = Record<string, unknown>`

### Item 2: Shared error module
- [x] Create `services/errors.ts` with `NotFoundError` class and `ERROR_CODES` constant

### Item 3: Services — engines (5 functions)
- [x] `getEngineById` — wrap PGRST116 → `NotFoundError`
- [x] `updateEngine` — check error on pre-fetch → `NotFoundError`
- [x] `deleteEngine` — check error on pre-fetch → `NotFoundError`
- [x] `publishEngine` — replace `throw new Error(...)` → `NotFoundError`
- [x] `activateEngine` — replace `throw new Error(...)` → `NotFoundError`

### Item 4: Services — projects (2 functions)
- [x] `getProjectById` — wrap PGRST116 → `NotFoundError`
- [x] `updateProject` — wrap PGRST116 → `NotFoundError`

### Item 5: Route handlers — engines (5 routes)
- [x] `GET /api/engines/:id` — fix 500 bug + `instanceof NotFoundError` → 404
- [x] `PATCH /api/engines/:id` — add `instanceof NotFoundError` → 404
- [x] `DELETE /api/engines/:id` — add `instanceof NotFoundError` → 204 (idempotent)
- [x] `POST /api/engines/:id/publish` — replace string match → `instanceof NotFoundError`
- [x] `POST /api/engines/:id/activate` — replace string match → `instanceof NotFoundError`

### Item 6: Route handlers — projects (1 route)
- [x] `PATCH /api/projects/:id` — add `instanceof NotFoundError` → 404

### Verification
- [x] `yarn tsc --noEmit` passes
- [x] `yarn test` passes (246/246)

## Decisions Made During Execution
- 2026-05-10: `ERROR_CODES` constant added to `services/errors.ts` to centralise external service error codes. Services use `ERROR_CODES.SINGLE_NO_ROWS` instead of hardcoding `"PGRST116"`.
- 2026-05-10: `deleteEngine` included in scope (was debated). Service throws `NotFoundError`, DELETE route catches it and returns 204 (idempotent). Service is honest, route decides semantics.
- 2026-05-10: JSDoc `@throws {NotFoundError}` added to all affected service functions. Route handler JSDoc updated with `@returns 404` where applicable.
- 2026-05-10: Test updated to use `ERROR_CODES.SINGLE_NO_ROWS` instead of hardcoded PGRST116 string.
