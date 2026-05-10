# TYPE_SAFETY_REFINEMENTS — Progress

**Status:** 0/6 items · Phase: Execution

## Current Focus
Starting execution.
Next step: Fix mapEngine/mapProject types in engineStore.ts
Blocker: none

## Progress

### Item 1: Type-safe mappers
- [ ] Change `mapEngine(row: Row)` → `mapEngine(row: EngineRecordRow)`, remove `as` casts
- [ ] Change `mapProject(row: Row)` → `mapProject(row: ProjectRow)`, remove `as` casts
- [ ] Remove `type Row = Record<string, unknown>`

### Item 2: Shared error module
- [ ] Create `services/errors.ts` with `NotFoundError` class

### Item 3: Services — engines (5 functions)
- [ ] `getEngineById` — wrap PGRST116 → `NotFoundError`
- [ ] `updateEngine` — check error on pre-fetch → `NotFoundError`
- [ ] `deleteEngine` — check error on pre-fetch → `NotFoundError`
- [ ] `publishEngine` — replace `throw new Error(...)` → `NotFoundError`
- [ ] `activateEngine` — replace `throw new Error(...)` → `NotFoundError`

### Item 4: Services — projects (2 functions)
- [ ] `getProjectById` — wrap PGRST116 → `NotFoundError`
- [ ] `updateProject` — wrap PGRST116 → `NotFoundError`

### Item 5: Route handlers — engines (4 routes)
- [ ] `GET /api/engines/:id` — fix 500 bug + `instanceof NotFoundError` → 404
- [ ] `PATCH /api/engines/:id` — add `instanceof NotFoundError` → 404
- [ ] `POST /api/engines/:id/publish` — replace string match → `instanceof NotFoundError`
- [ ] `POST /api/engines/:id/activate` — replace string match → `instanceof NotFoundError`

### Item 6: Route handlers — projects (1 route)
- [ ] `PATCH /api/projects/:id` — add `instanceof NotFoundError` → 404

### Verification
- [ ] `yarn tsc --noEmit` passes
- [ ] `yarn test` passes

## Decisions Made During Execution
(none yet)
