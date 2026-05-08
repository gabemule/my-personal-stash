# ZOD-SSOT — Plan

## Context

ADR 003 establishes Zod schemas as the single source of truth (SSOT). In practice, Zod is only partially adopted:

- **Schemas exist** in `schemas/api.ts` (API layer) and `libs/runtime/schema.ts` (engine domain) — but most of the codebase doesn't use them.
- **Zero route handlers** use Zod for request validation — all use manual `if` checks or nothing.
- **Runtime types are inverted** — `libs/runtime/types.ts` defines manual interfaces, `schema.ts` mirrors them separately. Types should be derived from schemas via `z.infer<>`, not the other way around.
- **Stores duplicate domain types** — `stores/engineStore.ts` manually defines `Project` and `EngineRecord` in camelCase, duplicating `schemas/api.ts`.
- **Core validation is manual** — `core/state/validation.ts` validates EngineState with hand-written checks instead of `EngineSchema.parse()`.
- **Schema registry has gaps** — `schemas/endpoints.ts` is missing 5 endpoints and ADR 008 annotations.

### Full type inventory

#### 🔴 Domain types with existing Zod schemas but NOT derived via `z.infer<>`

**13 types in `libs/runtime/types.ts`** — each has a mirror schema in `schema.ts`:

| Type | Zod Schema |
|------|-----------|
| `RoundingMode` | `RoundingModeSchema` |
| `CompareOp` | `CompareOpSchema` |
| `EngineConfig` | `EngineConfigSchema` |
| `Variable` | `VariableSchema` |
| `TableConditionSide` | `TableConditionSideSchema` |
| `TableCondition` | `TableConditionSchema` |
| `TableColumn` | `TableColumnSchema` |
| `TableRow` | `TableRowSchema` |
| `LookupTable` | `LookupTableSchema` |
| `ScalarToken` | `ScalarTokenSchema` |
| `ExpressionToken` | `ExpressionTokenSchema` |
| `Step` | `StepSchema` |
| `EngineState` | `EngineSchema` |

**2 types in `stores/engineStore.ts`** — duplicate `schemas/api.ts` in camelCase:

| Store Type | Zod Schema (snake_case) |
|-----------|------------------------|
| `Project` | `ProjectSchema` |
| `EngineRecord` | `EngineRecordSchema` |

#### 🔴 Domain types WITHOUT Zod schemas

**4 types in `libs/runtime/execute.ts`** — execution result types, no schema exists:

| Type | Purpose |
|------|---------|
| `ExecuteResult` | Full execution output |
| `StepResult` | Single step output |
| `StepTrace` | Debug trace per step |
| `TokenTrace` | Debug trace per token |

#### 🟡 Validation without Zod

| Location | Current validation | Should use |
|----------|-------------------|-----------|
| `POST /api/engines` | `if (!name \|\| !engine)` | `CreateEngineRequestSchema` |
| `POST /api/projects/:id/engines` | `if (!name \|\| !engine)` | `CreateEngineRequestSchema` |
| `PATCH /api/engines/:id` | **None** | `UpdateEngineRequestSchema` |
| `POST /api/calc/:engineId` | Manual type checks | `CalcRequestSchema` |
| `POST /api/auth/login` | `if (!email \|\| !password)` | `LoginRequestSchema` |
| `POST /api/projects` | `if (!name)` | `CreateProjectRequestSchema` |
| `PATCH /api/projects/:id` | `if (!name)` | `UpdateProjectRequestSchema` |
| `POST /api/api-keys` | `if (!name?.trim())` | `CreateApiKeyRequestSchema` |
| `POST /api/engines/:id/activate` | None (no body) | `ActivateEngineRequestSchema` |
| `core/state/validation.ts` | Manual checks | `EngineSchema.parse()` |

#### 🟡 Schema registry gaps (`schemas/endpoints.ts`)

Missing from registry:
- `PATCH /api/projects/:id`
- `GET /api/calc/:engineId`
- `GET /api/api-keys`
- `POST /api/api-keys`
- `DELETE /api/api-keys/:id`

ADR 008 annotations missing:
- `CalcRequestSchema.inputs` — doesn't document that keys are variable **names** (not UUIDs)
- `CalcResponseSchema` output fields — same gap
- Calc endpoint missing `note` referencing dynamic schema via `GET /api/calc/:engineId`

#### ✅ Already correct

- Services layer: `ProjectRow`, `EngineRow`, `InputSchema`, `InputSchemaProperty`, `OutputContract` — all use `z.infer<>`

#### ✅ Out of scope (purely UI types, no domain overlap)

- `types/ui.ts` — `TestResult`, `EditingNumber`, `UIState`, `AppState`
- `stores/requestStore.ts` — `RequestStore` (counter)
- `stores/workspaceStore.ts` — `WorkspaceStore` (selection IDs)
- All component `Props` interfaces
- Builder types (`ParsedTableData`, `TabType`, `ToolbarMode`)
- `libs/http.ts` — `HttpError` class
- `hooks/useEngineState.ts` — `Action` union
- `libs/runtime/evaluator.ts` — `EvalContext` (utility, not domain)
- `libs/runtime/decimalFactory.ts` — `DecimalFactory` (utility, not domain)

## Goals

1. **Every domain type** derived from a Zod schema via `z.infer<>` — zero manual interfaces for domain shapes
2. **Every route handler with a request body** validates via Zod `.parse()`
3. **Core engine validation** uses `EngineSchema.parse()` instead of manual checks
4. **Schema registry** is complete and annotated per ADR 008
5. **After completion:** the type dependency chain is:

```
Zod Schemas (SSOT)
├── z.infer<> → runtime types (EngineState, Variable, Step, ...)
├── z.infer<> → execution types (ExecuteResult, StepResult, ...)
├── z.infer<> → API types (ProjectRow, EngineRow, ...)
├── z.infer<> → store types (Project, EngineRecord camelCase)
├── z.parse() → route handler validation (all 9 routes)
├── z.parse() → core validation (EngineSchema)
├── z.toJSONSchema() → schema registry (complete)
└── .describe() → ADR 008 annotations
```

## Scope

### In scope

- Invert runtime types to derive from Zod schemas
- Create Zod schemas for execution result types
- Migrate all route handlers to Zod validation
- Unify store types with Zod-derived types
- Migrate core validation to use Zod
- Complete schema registry
- Add ADR 008 annotations

### Out of scope

- Query param validation (GET routes) — low risk, separate concern
- Response validation at runtime — schemas exist but validating outbound adds latency for no security benefit
- UI-only types (`Props`, `UIState`, `Action`, etc.) — no domain overlap
- Utility types (`EvalContext`, `DecimalFactory`, `HttpError`) — internal, not domain

## Decisions

- **Parse in route handler, not service**: Services receive already-validated data (ADR 002 — services don't know about HTTP)
- **Shared helper**: `parseBody(req, schema)` returns `{ data }` or `{ error: NextResponse }` to avoid try/catch boilerplate
- **ZodError format**: Return `400 { error: "Validation failed", details: flattenedErrors }`
- **Execution result schemas**: Create Zod schemas to be SSOT, derive types via `z.infer<>`, but do NOT `.parse()` at runtime (zero validation overhead — these types are produced internally, not received from external input)
- **Store camelCase**: Use a Zod `.transform()` or post-inference mapped type to handle snake_case → camelCase, keeping the schema as the source

## Phases

### Phase 1 — parseBody helper (~15 min) 🟢 Low risk
- Create `libs/parseBody.ts` with `parseBody<T>(req, ZodSchema<T>)` → `{ data: T } | { error: NextResponse }`
- Handles JSON parse errors + ZodError formatting in one place

### Phase 2 — Runtime type inversion (~2h) 🔴 High risk
Invert `libs/runtime/types.ts` so all 13 domain types are derived from `libs/runtime/schema.ts` via `z.infer<>`.

**Files changed:**
- `libs/runtime/schema.ts` — becomes the source (may need `.describe()` additions)
- `libs/runtime/types.ts` — becomes `z.infer<>` re-exports only
- `libs/runtime/index.ts` — re-export adjustment

**Cascade impact:** Everything that imports from `libs/runtime` gets types transitively. Should be transparent if schemas match current interfaces exactly (they should — they were written to mirror).

**Verification:** `yarn tsc --noEmit` must pass. All tests must pass.

### Phase 3 — Execution result schemas (~45 min) 🟡 Medium risk
Create Zod schemas for 4 execution result types in `libs/runtime/execute.ts`:
- `ExecuteResultSchema` → `ExecuteResult = z.infer<>`
- `StepResultSchema` → `StepResult = z.infer<>`
- `StepTraceSchema` → `StepTrace = z.infer<>`
- `TokenTraceSchema` → `TokenTrace = z.infer<>`

These schemas are for type derivation only — no `.parse()` calls.

### Phase 4 — API validation: high-risk routes (~30 min) 🟢 Low risk
- `POST /api/engines` — validate via `CreateEngineRequestSchema` (engine JSONB not validated today)
- `POST /api/projects/:id/engines` — same schema, same gap
- `PATCH /api/engines/:id` — validate via `UpdateEngineRequestSchema` (currently zero validation)
- `POST /api/calc/:engineId` — validate body envelope via `CalcRequestSchema`

### Phase 5 — API validation: remaining routes (~30 min) 🟢 Low risk
- `POST /api/auth/login` — `LoginRequestSchema` (email format + password)
- `POST /api/projects` — `CreateProjectRequestSchema`
- `PATCH /api/projects/:id` — `UpdateProjectRequestSchema`
- `POST /api/api-keys` — `CreateApiKeyRequestSchema`
- `POST /api/engines/:id/activate` — `ActivateEngineRequestSchema`

### Phase 6 — Store unification (~1h) 🟡 Medium risk
Migrate `stores/engineStore.ts` to derive `Project` and `EngineRecord` from Zod schemas.

**Approach:** Either:
- (a) Create camelCase Zod schemas (e.g., `ProjectCamelSchema` with `.transform()`) and derive from those
- (b) Keep snake_case schemas as SSOT, create a `toCamel<T>()` utility type, and use the transform in the store's fetch logic

Decision deferred to execution — depends on how the store currently transforms API responses.

**Cascade impact:** Components importing `Project`/`EngineRecord` from the store get updated types transitively.

### Phase 7 — Core validation + schema registry + docs (~1h) 🟡 Medium risk

#### 7a. Core validation
- `core/state/validation.ts` → replace manual checks with `EngineSchema.parse()` or `EngineSchema.safeParse()`
- May need to preserve specific error messages for the builder UI

#### 7b. Schema registry gaps
Fill missing endpoints in `schemas/endpoints.ts`:
- `PATCH /api/projects/:id` — `UpdateProjectRequestSchema`
- `GET /api/calc/:engineId` — dynamic response (add note)
- `GET /api/api-keys` — response is array of api key records
- `POST /api/api-keys` — `CreateApiKeyRequestSchema`
- `DELETE /api/api-keys/:id` — no body

#### 7c. ADR 008 annotations
- Add `.describe()` to `CalcRequestSchema.inputs` — keys are variable **names** per ADR 008
- Add `.describe()` to `CalcResponseSchema` output fields
- Add `note` to calc endpoint in registry referencing dynamic schema

#### 7d. Documentation
- Update `docs/api-flow.md` §5 diagrams: "Validate name present" → "Zod schema validation"
- Update `@todo/CONTEXT.md` with new conventions
