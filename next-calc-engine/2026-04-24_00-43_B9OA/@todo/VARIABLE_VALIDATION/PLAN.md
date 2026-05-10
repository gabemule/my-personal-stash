# VARIABLE_VALIDATION — Plan

## Context

Variables currently have no validation beyond type (number vs text). The `VariableSchema` stores `id`, `name`, `defaultValue`, `unit`, `kind`, `valueType` — but nothing about acceptable ranges, enums, patterns, or nullability. This means:

- API consumers (`/api/calc`) can send any string and the engine silently accepts it
- `buildInputSchema()` emits flat `{ type: "string", default }` with no JSON Schema constraints
- The builder UI has no way to express "this variable must be between 0 and 100"
- The runtime (`execute.ts`) has no input validation step — it just parses Decimals or assigns strings

## Goals

1. **Data model:** Add an optional `validation` field to `VariableSchema` supporting number constraints (min, max, multipleOf), text constraints (enum, minLength, maxLength, pattern), and universal constraints (nullable, description)
2. **Runtime validation:** Before executing steps, validate all inputs against their variable's validation config. Return `{ success: false, validationErrors }` without executing if any fail
3. **Builder UI:** Replace the inline VarRow editing (type toggle, defaultValue, unit) with a compact row + VariableSettingsModal that exposes all validation fields
4. **JSON Schema output:** `buildInputSchema()` emits standard JSON Schema constraints (minimum, maximum, enum, pattern, etc.) so API consumers get self-documenting schemas
5. **Smart test inputs:** TestPanel renders validation-aware inputs (dropdowns for enum, nullable toggle, min/max hints)

## Scope

### In scope
- Validation config for both `input` and `constant` variables (user-requested: minimal extra friction)
- Number constraints: `min`, `max`, `multipleOf`
- Text constraints: `enum` (array of strings), `minLength`, `maxLength`, `pattern` (regex)
- Universal: `nullable` (boolean), `description` (string — maps to JSON Schema `description`)
- Runtime blocks execution on validation failure (returns structured errors)
- JSON Schema output uses native JSON Schema fields (numbers, not strings)
- VariableSettingsModal with conditional fields based on valueType
- TestPanel smart inputs (Phase 4)

### Out of scope
- Cross-variable validation (e.g. "max must be > min of another variable")
- Custom error messages per constraint
- Validation for table values
- API-level validation middleware (stays in runtime)
- Changes to `EngineSchema.superRefine` (engine-level structural validation is separate from input validation)

## Decisions

1. **Validation lives on Variable, not on Engine config** — each variable owns its constraints. This is more natural for the modal UX and scales better.
2. **Single flat `validation` object** — no nested `numberConstraints`/`textConstraints` sub-objects. Unused fields for the current `valueType` are simply absent/undefined. Keeps Zod schema simple and avoids discriminated unions.
3. **`nullable` means the input can be omitted/empty** — for numbers, missing → skip (don't inject 0); for text, missing → empty string. This is NOT SQL NULL semantics, it's "this input is optional."
4. **Runtime validation runs before step execution** — collects ALL errors (not fail-fast) so the caller gets a complete error list.
5. **Applies to inputs AND constants** — constants can also have validation (e.g. a constant with min/max ensures the engine author set a valid value). Runtime validates both.
6. **Pattern/regex included from Phase 1** — user explicitly requested planning with regex from the start.
7. **JSON Schema output uses native types** — `minimum: 0` (number), not `minimum: "0"` (string). Even though our inputs are string-typed, the schema communicates the semantic constraint.

## Phases

### Phase 1 — Data model + runtime validation (~2h)

**Files:** `libs/runtime/schema.ts`, `libs/runtime/types.ts` (auto via z.infer), `libs/runtime/execute.ts`, `libs/runtime/execute.test.ts`

1. Add `VariableValidationSchema` to `libs/runtime/schema.ts`:
   ```ts
   export const VariableValidationSchema = z.object({
     nullable: z.boolean().optional(),
     description: z.string().optional(),
     // number
     min: z.number().optional(),
     max: z.number().optional(),
     multipleOf: z.number().optional(),
     // text
     enum: z.array(z.string()).optional(),
     minLength: z.number().int().nonneg().optional(),
     maxLength: z.number().int().nonneg().optional(),
     pattern: z.string().optional(),
   }).optional()
   ```
2. Add `validation: VariableValidationSchema` to `VariableSchema`
3. In `execute.ts`, add `validateInputs()` function that runs after variable parsing but before step execution:
   - Iterates all variables (inputs + constants)
   - For each, checks the value against its `validation` config
   - Collects errors as `{ variableName, variableId, constraint, message }`
   - If any errors, return early with `{ success: false, validationErrors }`
4. Add test cases in `execute.test.ts` for each constraint type

**Verify:** `yarn test libs/runtime/execute.test.ts` passes with new validation cases

### Phase 2 — VariableSettingsModal + VarRow simplification (~3h)

**Files:** `app/builder/_LeftContent/VariablesPanel/index.tsx`, new `app/builder/_LeftContent/VariablesPanel/VariableSettingsModal.tsx`

1. Create `VariableSettingsModal` component with fields:
   - Nome (text input)
   - Tipo (select: Número / Texto)
   - Valor padrão (text input)
   - Unidade (text input, shown only for numbers)
   - Descrição (text input)
   - Nullable (toggle)
   - **If Number:** Mínimo, Máximo, Múltiplo de
   - **If Text:** Enum (toggle + tag input), Comprimento mín., Comprimento máx., Padrão (regex)
2. Simplify `VarRow` to: `[# or T icon] [name] [⚙ button] [× button]`
   - Icon shows current type (colored)
   - Name is read-only display (editing moves to modal)
   - ⚙ opens VariableSettingsModal
   - × deletes (with existing confirmation)
3. Modal dispatches `UPDATE_VARIABLE` with full patch on save
4. `useEngineState` already handles `Partial<Variable>` in `UPDATE_VARIABLE` — no reducer changes needed for the new `validation` field

**Verify:** Builder loads, variables show compact rows, modal opens/saves correctly

### Phase 3 — JSON Schema output (~1h)

**Files:** `services/calc.ts`, `schemas/api.ts`

1. Update `InputSchemaPropertySchema` in `schemas/api.ts` to accept optional JSON Schema constraint fields:
   ```ts
   minimum: z.number().optional(),
   maximum: z.number().optional(),
   multipleOf: z.number().optional(),
   enum: z.array(z.string()).optional(),
   minLength: z.number().optional(),
   maxLength: z.number().optional(),
   pattern: z.string().optional(),
   nullable: z.boolean().optional(),
   ```
2. Update `buildInputSchema()` in `services/calc.ts` to emit these fields when the variable has validation config
3. Add/update test in `services/calc.test.ts`

**Verify:** `GET /api/calc/:id` returns enriched JSON Schema with constraints

### Phase 4 — Smart inputs in TestPanel + Calc UI (~2.5h)

**Files:** `app/builder/_RightContent/TestPanel/index.tsx`, `app/calc/` components, new `stores/testInputsStore.ts`

1. TestPanel renders validation-aware inputs:
   - Enum variables → `<select>` dropdown
   - Nullable variables → optional "clear" button or empty state
   - Number variables with min/max → show hints, `<input type="number" min={} max={} step={}>`
   - Text with maxLength → show character counter
   - Pattern → show format hint
2. Calc page inputs mirror the same smart behavior
3. Visual feedback when a value violates constraints (red border + message)
4. **Improvement: Persist test inputs** — Create `stores/testInputsStore.ts` (Zustand + `persist` middleware) keyed by `engineId → { varId → value }`. TestPanel reads/writes from this store instead of the ephemeral `testValues` in `UIState`. Test values survive page reloads and engine switches. Same pattern as existing `builderPageStore`.

**Verify:** TestPanel renders smart inputs, validation errors display inline, test values persist across reloads

## Estimates

| Phase | Effort | Cumulative |
|-------|--------|------------|
| 1 — Data model + runtime | ~2h | 2h |
| 2 — Modal + VarRow | ~3h | 5h |
| 3 — JSON Schema output | ~1h | 6h |
| 4 — Smart inputs | ~2h | 8h |
| **Total** | **~8h** | |
