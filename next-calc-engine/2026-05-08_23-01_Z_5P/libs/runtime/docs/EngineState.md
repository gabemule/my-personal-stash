# EngineState — JSON Shape Reference

> Developer guide for building and understanding the `EngineState` JSON config
> that powers the calc-engine runtime.

## Overview

An `EngineState` is the single JSON document that fully describes a calculation
engine. It contains everything the runtime needs to evaluate inputs and produce
outputs: global configuration, input variables, lookup tables, and ordered
calculation steps.

The runtime is **stateless** — it receives an `EngineState` + inputs, validates
the JSON against `EngineSchema` (Zod), evaluates all steps, and returns results.

```
EngineState (JSON)  +  inputs (Record<string, string>)
                    │
                    ▼
              ┌───────────┐
              │  execute() │
              └─────┬─────┘
                    │
                    ▼
             ExecuteResult
```

---

## Top-Level Shape

```jsonc
{
  "name": "my_engine",           // unique identifier (snake_case)
  "config": { ... },             // EngineConfig — precision, rounding, clamp
  "variables": [ ... ],          // Variable[] — inputs and constants
  "tables": [ ... ],             // LookupTable[] — lookup/decision tables
  "steps": [ ... ]               // Step[] — ordered calculation steps
}
```

| Field       | Type             | Required | Description |
|-------------|------------------|----------|-------------|
| `name`      | `string`         | ✅       | Engine identifier. Must match `^[a-z][a-z0-9_]*$`, max 64 chars. |
| `config`    | `EngineConfig`   | ✅       | Global arithmetic settings. |
| `variables` | `Variable[]`     | ✅       | Input parameters and constants. |
| `tables`    | `LookupTable[]`  | ✅       | Lookup tables (can be empty `[]`). |
| `steps`     | `Step[]`         | ✅       | Calculation steps evaluated in order. |

**Validation:** Names must be unique within their category — no two variables
can share a name, no two steps can share a name, no two tables can share a name.

---

## EngineConfig

Controls arithmetic precision and result clamping.

```jsonc
{
  "precision": 2,
  "rounding": "ROUND_HALF_UP",
  "min": null,
  "max": null
}
```

| Field       | Type                   | Required | Description |
|-------------|------------------------|----------|-------------|
| `precision` | `number` (positive int)| ✅       | Decimal places for all arithmetic operations. |
| `rounding`  | `RoundingMode`         | ✅       | Rounding strategy (see below). |
| `min`       | `string \| null`       | ✅       | Minimum clamp value. `null` = no lower bound. |
| `max`       | `string \| null`       | ✅       | Maximum clamp value. `null` = no upper bound. |

### Rounding Modes

| Value              | Behavior |
|--------------------|----------|
| `ROUND_HALF_UP`    | Standard rounding (0.5 → 1). Most common for financial calculations. |
| `ROUND_DOWN`       | Truncate toward zero. |
| `ROUND_HALF_EVEN`  | Banker's rounding (0.5 rounds to nearest even). |

### Clamping

When `min` and/or `max` are set, steps with `clamp: true` will have their
result constrained to `[min, max]`. Steps without `clamp: true` are unaffected.

---

## Variable

Variables are the engine's inputs. They receive values at execution time or fall
back to their `defaultValue`.

```jsonc
{
  "id": "v1",
  "name": "faturamento",
  "defaultValue": "0",
  "unit": "R$",
  "kind": "input",
  "valueType": "number"
}
```

| Field          | Type                      | Required | Default      | Description |
|----------------|---------------------------|----------|--------------|-------------|
| `id`           | `string`                  | ✅       | —            | Unique identifier (referenced by tokens as `varRef`). |
| `name`         | `string`                  | ✅       | —            | Display name. Must match `^[a-z][a-z0-9_]*$`, max 64 chars. |
| `defaultValue` | `string`                  | ✅       | —            | Fallback value when no input is provided. |
| `unit`         | `string`                  | ❌       | —            | Display-only unit (e.g. `"%"`, `"R$"`). Not used in calculation. |
| `kind`         | `"input" \| "constant"`   | ❌       | `"input"`    | `input` = provided at runtime. `constant` = fixed in the engine config. |
| `valueType`    | `"number" \| "text"`      | ❌       | `"number"`   | `text` variables are string-typed and can only participate in `==`/`!=` conditions. |

### Text Variables

When `valueType` is `"text"`, the variable:
- Is **not** converted to `Decimal` — it stays as a raw string.
- Can only be used in **table row/column conditions** with `==` or `!=` operators.
- Cannot be used directly in arithmetic expressions (no `varRef` in step tokens).
- Is useful for categorical lookups (e.g. state codes, plan types).

### Inputs at Execution Time

Inputs are passed as `Record<string, string>` keyed by variable **`id`** (not name):

```ts
execute(engineState, { "v1": "150000", "v2": "SP" })
```

---

## LookupTable

Lookup tables are the primary mechanism for data-driven decisions. They map
conditions to values — think of them as spreadsheet-like grids where rows and
columns can be resolved at runtime based on input values.

```jsonc
{
  "id": "t1",
  "name": "aliquota_por_faixa",
  "rowLabelHeader": "Faixa",
  "parameters": ["cobertura"],
  "columns": [ ... ],
  "rows": [ ... ]
}
```

| Field            | Type             | Required | Description |
|------------------|------------------|----------|-------------|
| `id`             | `string`         | ✅       | Unique identifier (referenced by `tableRef` tokens). |
| `name`           | `string`         | ✅       | Display name. Must match naming convention. |
| `rowLabelHeader` | `string`         | ❌       | Header label for the row labels column (UI only). |
| `parameters`     | `string[]`       | ❌       | Parameter names for parameterized tables. |
| `columns`        | `TableColumn[]`  | ✅       | Column definitions. |
| `rows`           | `TableRow[]`     | ✅       | Row definitions with conditions and cell values. |

### Table Dimensions: 1D vs 2D

Tables support two resolution modes:

#### 1D Table (column fixed at design time)
The `tableRef` token specifies a `columnId` directly. Only the **row** is
resolved at runtime by evaluating row conditions.

```
tableRef { tableId: "t1", columnId: "col1", rowId: null }
         ───────────────  ──────────────────  ──────────
         which table      column fixed        row resolved at runtime
```

#### 2D Table (both row and column resolved at runtime)
The `tableRef` token has `columnId: null`. Both the row **and** column are
resolved at runtime by evaluating their respective conditions.

```
tableRef { tableId: "t1", columnId: null, rowId: null }
         ───────────────  ──────────────  ──────────
         which table      column resolved  row resolved
                          at runtime       at runtime
```

#### Fixed Row (row selected at design time)
When `rowId` is a specific string, the row is fixed (no condition evaluation).

```
tableRef { tableId: "t1", columnId: "col1", rowId: "r1" }
         ───────────────  ──────────────────  ──────────
         which table      column fixed        row fixed
```

### TableColumn

```jsonc
{
  "id": "col1",
  "label": "Alíquota Base",
  "condition": {
    "left": { "kind": "varRef", "target": "v3" },
    "op": "==",
    "right": { "kind": "text", "value": "basic" }
  }
}
```

| Field       | Type                          | Required | Description |
|-------------|-------------------------------|----------|-------------|
| `id`        | `string`                      | ✅       | Unique column identifier. |
| `label`     | `string`                      | ✅       | Display name. |
| `condition` | `TableCondition \| null \| undefined` | ❌ | See below. |

**Column condition semantics:**
- `undefined` (field absent) — column is selected by ID at design time (1D mode). No runtime condition.
- `TableCondition` object — column participates in 2D resolution. Evaluated at runtime.
- `null` — default/else column in 2D mode. Used when no other column condition matches.

### TableRow

```jsonc
{
  "id": "r1",
  "label": "Faixa 1",
  "condition": {
    "left": { "kind": "varRef", "target": "v1" },
    "op": "<=",
    "right": { "kind": "number", "value": "100000" }
  },
  "values": {
    "col1": "0.05",
    "col2": "0.03"
  }
}
```

| Field       | Type                        | Required | Description |
|-------------|-----------------------------|----------|-------------|
| `id`        | `string`                    | ✅       | Unique row identifier. |
| `label`     | `string`                    | ❌       | Display label (UI only, not used in calculation). |
| `condition` | `TableCondition \| null`    | ✅       | Row selection condition. `null` = default/else row. |
| `values`    | `Record<string, string>`    | ✅       | Cell values keyed by column `id`. |

**Row evaluation order:** Rows are evaluated **top to bottom** — the **first
matching** row wins. A row with `condition: null` acts as the default/else case
and should be placed **last**.

### TableCondition

A condition compares two sides using a comparison operator.

```jsonc
{
  "left": { "kind": "varRef", "target": "v1" },
  "op": "<=",
  "right": { "kind": "number", "value": "100000" }
}
```

| Field   | Type                  | Description |
|---------|-----------------------|-------------|
| `left`  | `TableConditionSide`  | Left-hand side of comparison. |
| `op`    | `CompareOp`           | Comparison operator. |
| `right` | `TableConditionSide`  | Right-hand side of comparison. |

#### CompareOp

| Operator | Meaning                  | Numeric | Text |
|----------|--------------------------|---------|------|
| `<`      | Less than                | ✅      | ❌   |
| `<=`     | Less than or equal       | ✅      | ❌   |
| `==`     | Equal                    | ✅      | ✅   |
| `>=`     | Greater than or equal    | ✅      | ❌   |
| `>`      | Greater than             | ✅      | ❌   |
| `!=`     | Not equal                | ✅      | ✅   |

When **either side** resolves to text, only `==` and `!=` are valid.

### TableConditionSide

A discriminated union with 5 possible kinds:

| Kind       | Shape                                | Description |
|------------|--------------------------------------|-------------|
| `number`   | `{ kind: "number", value: "100" }`   | Literal numeric value (as string). |
| `text`     | `{ kind: "text", value: "SP" }`      | Literal text value. |
| `varRef`   | `{ kind: "varRef", target: "v1" }`   | Reference to a variable by `id`. |
| `stepRef`  | `{ kind: "stepRef", target: "s1" }`  | Reference to a step result by `id`. |
| `paramRef` | `{ kind: "paramRef", target: "p" }`  | Reference to a table parameter (only valid inside parameterized tables). |

### Why `kind` vs `type`?

The codebase uses **two different discriminator field names** for its
discriminated unions:

| Union                | Discriminator | Examples |
|----------------------|---------------|----------|
| `ExpressionToken`    | `type`        | `{ type: "number" }`, `{ type: "varRef" }`, `{ type: "conditional" }` |
| `TableConditionSide` | `kind`        | `{ kind: "number" }`, `{ kind: "varRef" }`, `{ kind: "text" }` |

Both unions share variant names like `"number"`, `"varRef"`, and `"stepRef"`,
but represent **different concepts** with different shapes:

- `ExpressionToken` is richer — it includes operators, parentheses, and
  conditionals that don't exist in condition sides.
- `TableConditionSide` is simpler — it includes `"text"` and `"paramRef"`
  variants that don't exist as expression tokens.

Using distinct discriminator names (`type` vs `kind`) provides two benefits:

1. **In TypeScript** — when you receive an unknown object, the field present
   (`type` or `kind`) immediately tells you which union it belongs to, without
   needing surrounding context.
2. **In JSON** — a variable reference in an expression (`{ type: "varRef",
   target: "v1" }`) is structurally distinguishable from a variable reference
   in a condition (`{ kind: "varRef", target: "v1" }`), preventing accidental
   misuse across boundaries.

### Parameterized Tables

When a table has `parameters: ["coverage_type"]`, it becomes **reusable** with
different inputs. The `tableRef` token must provide `arguments` mapping each
parameter to a `TableConditionSide`:

```jsonc
// Table definition
{
  "id": "t2",
  "name": "rates",
  "parameters": ["coverage_type"],
  "columns": [ ... ],
  "rows": [
    {
      "id": "r1",
      "condition": {
        "left": { "kind": "paramRef", "target": "coverage_type" },
        "op": "==",
        "right": { "kind": "text", "value": "basic" }
      },
      "values": { "col1": "0.05" }
    }
  ]
}

// Token referencing the table with arguments
{
  "type": "tableRef",
  "tableId": "t2",
  "columnId": "col1",
  "rowId": null,
  "arguments": {
    "coverage_type": { "kind": "varRef", "target": "v3" }
  }
}
```

The arguments are resolved before evaluating row/column conditions inside the
table. `paramRef` sides inside the table's conditions are replaced with the
resolved argument values.

---

## Step

Steps are the ordered calculation units. Each step has an expression (a sequence
of tokens) that is evaluated using a **shunting-yard** algorithm.

```jsonc
{
  "id": "s1",
  "name": "premio_base",
  "enabled": true,
  "kind": "internal",
  "clamp": false,
  "expression": [
    { "type": "varRef", "target": "v1" },
    { "type": "op", "value": "*" },
    { "type": "tableRef", "tableId": "t1", "columnId": "col1", "rowId": null }
  ]
}
```

| Field        | Type                        | Required | Default      | Description |
|--------------|-----------------------------|----------|--------------|-------------|
| `id`         | `string`                    | ✅       | —            | Unique identifier (referenced by `stepRef` tokens). |
| `name`       | `string`                    | ✅       | —            | Display name. Must match naming convention. |
| `enabled`    | `boolean`                   | ✅       | —            | If `false`, step is skipped (returns `null`). |
| `kind`       | `"internal" \| "output"`    | ❌       | `"output"`   | `output` = included in final results. `internal` = intermediate helper. |
| `clamp`      | `boolean`                   | ❌       | `false`      | If `true`, result is clamped to `[config.min, config.max]`. |
| `expression` | `ExpressionToken[]`         | ✅       | —            | Token array defining the calculation (see below). |

### Step Execution Order

Steps are evaluated **sequentially** from first to last. A step can reference
any **prior** step's result via `stepRef`, but **cannot** reference steps that
come after it (forward references are invalid and will be stripped by the
mutation helpers).

### Step Kinds

- **`output`** — The step's result is a key output of the engine. The `finalValue`
  in `ExecuteResult` is the last successful output step.
- **`internal`** — The step is an intermediate calculation. Its result is available
  to subsequent steps via `stepRef` but is not surfaced as a primary output.

---

## ExpressionToken

An expression is an array of tokens evaluated using the
[shunting-yard algorithm](https://en.wikipedia.org/wiki/Shunting-yard_algorithm).
Tokens are processed left-to-right with standard operator precedence.

### Token Types

#### `number` — Literal numeric value

```jsonc
{ "type": "number", "value": "100.50" }
```

#### `op` — Arithmetic operator

```jsonc
{ "type": "op", "value": "*" }
```

Supported operators with precedence (higher = binds tighter):

| Op  | Meaning        | Precedence |
|-----|----------------|------------|
| `%` | Modulo         | 3          |
| `*` | Multiplication | 3          |
| `/` | Division       | 3          |
| `+` | Addition       | 2          |
| `-` | Subtraction    | 2          |

#### `paren` — Parenthesis for grouping

```jsonc
{ "type": "paren", "value": "(" }
{ "type": "paren", "value": ")" }
```

#### `varRef` — Reference to a variable

```jsonc
{ "type": "varRef", "target": "v1" }
```

Resolves to the variable's current value (from inputs or `defaultValue`). Only
valid for numeric variables — text variables cannot be used directly in
expressions.

#### `stepRef` — Reference to a prior step's result

```jsonc
{ "type": "stepRef", "target": "s1" }
```

Resolves to the result of step `s1`. The referenced step must appear **before**
the current step. If the referenced step is disabled, evaluation throws an error.

#### `tableRef` — Lookup table reference

```jsonc
{
  "type": "tableRef",
  "tableId": "t1",
  "columnId": "col1",
  "rowId": null,
  "arguments": {
    "param1": { "kind": "varRef", "target": "v2" }
  }
}
```

| Field       | Type                                      | Required | Description |
|-------------|-------------------------------------------|----------|-------------|
| `tableId`   | `string`                                  | ✅       | Table to look up. |
| `columnId`  | `string \| null`                          | ✅       | Column ID (1D) or `null` (2D runtime resolution). |
| `rowId`     | `string \| null`                          | ❌       | Row ID (fixed) or `null`/absent (runtime resolution). |
| `arguments` | `Record<string, TableConditionSide>`      | ❌       | Parameter bindings for parameterized tables. |

#### `conditional` — IF/ELSE branching

```jsonc
{
  "type": "conditional",
  "branches": [
    {
      "condition": {
        "left": { "kind": "varRef", "target": "v1" },
        "op": ">=",
        "right": { "kind": "number", "value": "1000000" }
      },
      "value": { "type": "number", "value": "0.02" }
    },
    {
      "condition": {
        "left": { "kind": "varRef", "target": "v1" },
        "op": ">=",
        "right": { "kind": "number", "value": "500000" }
      },
      "value": { "type": "number", "value": "0.03" }
    }
  ],
  "elseToken": { "type": "number", "value": "0.05" }
}
```

| Field       | Type                                               | Required | Description |
|-------------|----------------------------------------------------|----------|-------------|
| `branches`  | `Array<{ condition: TableCondition, value: ScalarToken }>` | ✅ | Ordered IF branches. First match wins. |
| `elseToken` | `ScalarToken`                                      | ✅       | Fallback value when no branch matches. |

**ScalarToken** is a subset of `ExpressionToken` — only `number`, `varRef`,
`stepRef`, and `tableRef` are valid inside conditional branches (no operators,
parentheses, or nested conditionals).

---

## Naming Convention

All `name` fields (engine, variables, tables, steps) must:

- Match the regex: `^[a-z][a-z0-9_]*$`
- Be at most **64 characters** long
- Start with a **lowercase letter**
- Contain only lowercase letters, digits, and underscores
- Be **unique within their category** (no two variables share a name, etc.)

Examples: `faturamento`, `premio_base`, `aliquota_por_faixa`, `etapa_1`

---

## Execution Flow

```
1. VALIDATE    EngineSchema.safeParse(engine)
                 ↓ fail → return { success: false, validationErrors }
                 ↓ pass

2. RESOLVE     For each variable:
 VARIABLES       - text → store as string in textVariables map
                  - number → parse to Decimal (fallback to 0)

3. INDEX       Build tables map: tableId → LookupTable
 TABLES

4. EVALUATE    For each step (in order):
 STEPS           ├─ disabled? → stepResults[id] = null, skip
                 └─ enabled?  → evaluateExpression(tokens, context)
                                  ├─ resolve all tokens (varRef, stepRef, tableRef, conditional)
                                  ├─ shunting-yard → RPN → evaluate
                                  ├─ if clamp: apply min/max
                                  └─ store result in stepResults[id]

5. RETURN      ExecuteResult {
                 success: boolean,
                 steps: StepResult[],
                 finalValue: string | null  // last successful "output" step
               }
```

---

## Examples

### Minimal Engine

A single variable multiplied by a constant:

```json
{
  "name": "simple_calc",
  "config": {
    "precision": 2,
    "rounding": "ROUND_HALF_UP",
    "min": null,
    "max": null
  },
  "variables": [
    {
      "id": "v1",
      "name": "valor",
      "defaultValue": "100",
      "kind": "input"
    }
  ],
  "tables": [],
  "steps": [
    {
      "id": "s1",
      "name": "resultado",
      "enabled": true,
      "expression": [
        { "type": "varRef", "target": "v1" },
        { "type": "op", "value": "*" },
        { "type": "number", "value": "0.1" }
      ]
    }
  ]
}
```

### 1D Table Lookup

Rate varies by revenue range:

```json
{
  "name": "rate_by_range",
  "config": { "precision": 4, "rounding": "ROUND_HALF_UP", "min": null, "max": null },
  "variables": [
    { "id": "v1", "name": "revenue", "defaultValue": "0", "kind": "input" }
  ],
  "tables": [
    {
      "id": "t1",
      "name": "rate_table",
      "columns": [
        { "id": "col1", "label": "Rate" }
      ],
      "rows": [
        {
          "id": "r1",
          "label": "Small",
          "condition": {
            "left": { "kind": "varRef", "target": "v1" },
            "op": "<=",
            "right": { "kind": "number", "value": "100000" }
          },
          "values": { "col1": "0.05" }
        },
        {
          "id": "r2",
          "label": "Medium",
          "condition": {
            "left": { "kind": "varRef", "target": "v1" },
            "op": "<=",
            "right": { "kind": "number", "value": "500000" }
          },
          "values": { "col1": "0.03" }
        },
        {
          "id": "r3",
          "label": "Default",
          "condition": null,
          "values": { "col1": "0.02" }
        }
      ]
    }
  ],
  "steps": [
    {
      "id": "s1",
      "name": "premium",
      "enabled": true,
      "expression": [
        { "type": "varRef", "target": "v1" },
        { "type": "op", "value": "*" },
        { "type": "tableRef", "tableId": "t1", "columnId": "col1", "rowId": null }
      ]
    }
  ]
}
```

### Text Variable + Conditional Table

Using a text variable (state code) to select a row:

```json
{
  "name": "premium_by_state",
  "config": { "precision": 2, "rounding": "ROUND_HALF_UP", "min": null, "max": null },
  "variables": [
    { "id": "v1", "name": "revenue", "defaultValue": "0", "kind": "input" },
    { "id": "v2", "name": "state", "defaultValue": "", "kind": "input", "valueType": "text" }
  ],
  "tables": [
    {
      "id": "t1",
      "name": "min_premium",
      "columns": [
        { "id": "col1", "label": "Minimum Premium" }
      ],
      "rows": [
        {
          "id": "r1",
          "label": "SP",
          "condition": {
            "left": { "kind": "varRef", "target": "v2" },
            "op": "==",
            "right": { "kind": "text", "value": "SP" }
          },
          "values": { "col1": "650" }
        },
        {
          "id": "r2",
          "label": "Default",
          "condition": null,
          "values": { "col1": "400" }
        }
      ]
    }
  ],
  "steps": [
    {
      "id": "s1",
      "name": "base_premium",
      "enabled": true,
      "kind": "internal",
      "expression": [
        { "type": "varRef", "target": "v1" },
        { "type": "op", "value": "*" },
        { "type": "number", "value": "0.03" }
      ]
    },
    {
      "id": "s2",
      "name": "final_premium",
      "enabled": true,
      "kind": "output",
      "expression": [
        {
          "type": "conditional",
          "branches": [
            {
              "condition": {
                "left": { "kind": "stepRef", "target": "s1" },
                "op": ">=",
                "right": { "kind": "number", "value": "400" }
              },
              "value": { "type": "stepRef", "target": "s1" }
            }
          ],
          "elseToken": { "type": "tableRef", "tableId": "t1", "columnId": "col1", "rowId": null }
        }
      ]
    }
  ]
}
```

---

## Related Files

| File | Purpose |
|------|---------|
| `libs/runtime/types.ts` | TypeScript type definitions (source of truth for shapes) |
| `libs/runtime/schema.ts` | Zod schemas mirroring types (runtime validation) |
| `libs/runtime/evaluator.ts` | Shunting-yard expression evaluator |
| `libs/runtime/execute.ts` | Main orchestrator (validate → evaluate → result) |
| `libs/runtime/README.md` | API reference and architecture overview |
| `core/conditions.ts` | Condition operator helpers and text-aware validation |
| `core/state/mutations.ts` | Pure helpers for cleaning up dangling references |