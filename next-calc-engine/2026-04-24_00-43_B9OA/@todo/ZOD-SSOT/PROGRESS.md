# ZOD-SSOT — Progress

**Status:** 0/24 items · Phase: Not started

## Current Focus
Feature planned but not yet started.
Next step: Phase 1 — create shared `parseBody` helper
Blocker: none

## Progress

### Phase 1 — parseBody helper
- [ ] Create `libs/parseBody.ts` — `parseBody<T>(req, schema)` with JSON parse + ZodError handling

### Phase 2 — Runtime type inversion
- [ ] `libs/runtime/schema.ts` — ensure all 13 schemas are complete and match current interfaces
- [ ] `libs/runtime/types.ts` — replace all 13 manual interfaces with `z.infer<>` re-exports
- [ ] `libs/runtime/index.ts` — adjust re-exports if needed
- [ ] Verify: `yarn tsc --noEmit` passes
- [ ] Verify: `yarn test` passes

### Phase 3 — Execution result schemas
- [ ] Create `ExecuteResultSchema` in `libs/runtime/execute.ts` (or `schema.ts`)
- [ ] Create `StepResultSchema`, `StepTraceSchema`, `TokenTraceSchema`
- [ ] Derive `ExecuteResult`, `StepResult`, `StepTrace`, `TokenTrace` via `z.infer<>`

### Phase 4 — API validation: high-risk routes
- [ ] `POST /api/engines` — validate via `CreateEngineRequestSchema`
- [ ] `POST /api/projects/:id/engines` — validate via `CreateEngineRequestSchema`
- [ ] `PATCH /api/engines/:id` — validate via `UpdateEngineRequestSchema`
- [ ] `POST /api/calc/:engineId` — validate body envelope via `CalcRequestSchema`

### Phase 5 — API validation: remaining routes
- [ ] `POST /api/auth/login` — validate via `LoginRequestSchema`
- [ ] `POST /api/projects` — validate via `CreateProjectRequestSchema`
- [ ] `PATCH /api/projects/:id` — validate via `UpdateProjectRequestSchema`
- [ ] `POST /api/api-keys` — validate via `CreateApiKeyRequestSchema`
- [ ] `POST /api/engines/:id/activate` — validate via `ActivateEngineRequestSchema`

### Phase 6 — Store unification
- [ ] `stores/engineStore.ts` — derive `Project` from Zod schema (camelCase transform)
- [ ] `stores/engineStore.ts` — derive `EngineRecord` from Zod schema (camelCase transform)

### Phase 7 — Core validation + schema registry + docs
- [ ] `core/state/validation.ts` — replace manual checks with `EngineSchema.parse()`
- [ ] Fill 5 missing endpoints in `schemas/endpoints.ts`
- [ ] Add ADR 008 `.describe()` annotations to `CalcRequestSchema`/`CalcResponseSchema`
- [ ] Add registry `note` for calc dynamic schema reference
- [ ] Update `docs/api-flow.md` §5 diagrams post-migration

## Decisions Made During Execution
(none yet)
