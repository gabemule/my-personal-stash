# core — Builder Toolkit

Functions for manipulating, validating, and testing `EngineState` definitions.
Used by the builder UI and related hooks/stores. Depends on `lib/runtime` for
types and execution — never the other way around.

```
Builder UI / hooks / stores
         │
         ▼
      core/*          ← this module
         │
         ▼
    lib/runtime/*     ← pure engine (types + execution)
```

## Modules

### `contract.ts` — Input/Output Schema

Builds the public-facing contract of an engine: what inputs it accepts and
what outputs it produces.

```ts
buildInputSchema(engine, { keyBy: "name" | "id" }): InputSchema
```
Generates a JSON Schema object describing the engine's input variables.
Filters `kind === "input"` only. Keys properties by variable name or id.

```ts
remapInputsByName(engine, named): Record<string, string>
```
Translates a `name → value` map into an `id → value` map (runtime expects ids).

```ts
buildOutputContract(engine, result): OutputContract
```
Projects an `ExecuteResult` into `{ outputs, errors }` keyed by step name.
Only `kind === "output"` steps are exposed.

**Types:** `InputSchema`, `InputSchemaProperty`, `OutputContract`, `BuildInputSchemaOptions`

---

### `runner.ts` — Test Execution

Wraps `execute()` from the runtime with error handling and result formatting
for the builder's TestPanel.

```ts
runCalculation(engine, inputs): RunCalculationResult
```
Returns `{ results: Record<string, TestResult> }` — one entry per step with
value, error status, and formatting.

**Types:** `RunCalculationResult`

---

### `export.ts` — Serialization

Cleans and validates engine state for persistence (save to DB, export as JSON).

```ts
exportState(engine): EngineState
```
Strips transient/default fields, producing a clean `EngineState` for storage.

```ts
validateImportedState(data): data is EngineState
```
Type guard — validates unknown data against `EngineSchema` (Zod).

---

### `conditions.ts` — Table Condition Helpers

Ensures operator validity in lookup table conditions based on value types
(text vs. numeric).

```ts
sanitizeConditionOp(cond, variables): TableCondition
```
If either side resolves to text and the operator isn't `==` or `!=`, resets
it to `"=="`.

```ts
isTextSide(side, variables): boolean
```
Returns `true` if a condition side is a text literal or a reference to a
text-type variable.

**Constants:** `COMPARE_OPS`, `TEXT_OPS`

---

### `state/ids.ts` — ID Generation

Generates unique sequential IDs for engine entities, scanning existing state
to avoid collisions.

```ts
nextVarId(engine): string      // "var1", "var2", ...
nextStepId(engine): string     // "step1", "step2", ...
nextTableId(engine): string    // "table1", "table2", ...
nextColumnId(table): string    // "col1", "col2", ...
nextRowId(table): string       // "row1", "row2", ...
```

---

### `state/mutations.ts` — State Mutations

Pure functions that return new state — used by `useEngineState` hook and
`engineStore` for builder interactions.

```ts
addStep(steps): Step[]
removeStep(steps, id): Step[]
moveStep(steps, from, to): Step[]
duplicateStep(steps, id): Step[]
toggleStep(steps, id): Step[]
```

---

### `state/validation.ts` — Expression Validation

Validates expression tokens for correctness within the current engine context.

```ts
validateExpression(tokens, variables, steps, tables): string[]
```
Returns an array of error messages (empty = valid). Checks for:
- Unresolved variable/step/table references
- Invalid token sequences
- Balanced parentheses
- Circular references

## File Structure

```
core/
├── contract.ts            # Input/output schema builders
├── runner.ts              # Test execution wrapper
├── export.ts              # State serialization + validation
├── conditions.ts          # Table condition operator helpers
└── state/
    ├── ids.ts             # Sequential ID generation
    ├── mutations.ts       # Pure state mutations (add/remove/move/toggle)
    └── validation.ts      # Expression validation
```
