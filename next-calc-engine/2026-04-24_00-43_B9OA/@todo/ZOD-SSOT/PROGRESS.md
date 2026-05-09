# ZOD-SSOT — Progress

**Status:** 24/24 items · Complete

## Current Focus
All phases complete. ZOD-SSOT initiative done.
Next step: none
Blocker: none

## Progress

### Phase 1 — parseBody helper
- [x] Create `libs/parseBody.ts` — `parseBody<T>(req, schema)` with JSON parse + ZodError handling

### Phase 2 — Runtime type inversion
- [x] `libs/runtime/schema.ts` — removed type imports and `z.ZodType<T>` annotations
- [x] `libs/runtime/types.ts` — replaced all 13 manual interfaces with `z.infer<>` re-exports
- [x] `libs/runtime/index.ts` — re-exports all types from `./types`
- [x] Verify: `yarn tsc --noEmit` passes
- [x] Verify: `yarn test` passes

### Phase 3 — Execution result schemas
- [x] Create `TokenTraceSchema`, `StepTraceSchema`, `ExecStepResultSchema`, `ExecuteResultSchema` in `schema.ts`
- [x] Derive `TokenTrace`, `StepTrace`, `StepResult`, `ExecuteResult` via `z.infer<>` in `types.ts`
- [x] Remove interfaces from `evaluator.ts` and `execute.ts`, import from `./types`

### Phase 4 — API validation: high-risk routes
- [x] `POST /api/engines` — validate via `CreateEngineRequestSchema`
- [x] `POST /api/projects/:id/engines` — validate via `CreateEngineRequestSchema`
- [x] `PATCH /api/engines/:id` — validate via `UpdateEngineRequestSchema`
- [x] `POST /api/calc/:engineId` — validate body envelope via `CalcRequestSchema`

### Phase 5 — API validation: remaining routes
- [x] `POST /api/auth/login` — validate via `LoginRequestSchema`
- [x] `POST /api/projects` — validate via `CreateProjectRequestSchema`
- [x] `PATCH /api/projects/:id` — validate via `UpdateProjectRequestSchema`
- [x] `POST /api/api-keys` — validate via `CreateApiKeyRequestSchema`
- [x] ~~`POST /api/engines/:id/activate`~~ — no body, no validation needed

### Phase 6 — Store unification
- [x] `stores/engineStore.ts` — derive `Project` from Zod schema (indexed access on `ProjectRow`)
- [x] `stores/engineStore.ts` — derive `EngineRecord` from Zod schema (indexed access on `EngineRecordRow`)

### Phase 7 — Core validation + schema registry + docs
- [x] ~~`core/state/validation.ts`~~ — N/A: semantic validation (reference integrity), not shape validation. Types already Zod-derived via `@/libs/runtime`.
- [x] Fill missing endpoints in `schemas/endpoints.ts`
- [x] Snapshot tests for endpoint schemas (`schemas/endpoints.test.ts`)
- [x] Add `.describe()` annotations to `CalcRequestSchema`/`CalcResponseSchema`
- [x] Update `docs/api-flow.md` §5 diagrams — `parseBody` step in Calc, API Keys, and CRUD patterns

## Decisions Made During Execution
- 2026-05-09: `POST /api/engines/:id/activate` has no request body — removed from validation scope
- 2026-05-09: Zod v4 `z.flattenError()` is the correct standalone function
- 2026-05-09: `CalcRequestSchema.inputs` kept as required (no `.default({})`)
- 2026-05-09: Added `ApiKeyRecordSchema`, `CreateApiKeyRequestSchema`, `UpdateProjectRequestSchema` to `schemas/api.ts`
- 2026-05-09: Runtime execution schemas named `ExecStepResultSchema` to avoid collision with API-level `StepResultSchema`
- 2026-05-09: Removed re-export from `execute.ts` — all types now re-exported from `types.ts` via `index.ts`
