# calc-engine runtime

Stateless calculation engine. Receives an `EngineState` definition + inputs,
evaluates expressions via shunting-yard algorithm, resolves lookup tables
(1D/2D, parameterized), and returns typed results with optional debug traces.

## Quick Start

```ts
import { execute } from "@/lib/runtime"

const result = execute(engineState, { var1: "100", var2: "0.05" })

// result.outputs  → Record<string, string>  (step name → formatted value)
// result.steps    → StepResult[]             (per-step details)
// result.errors   → string[]                 (if any step failed)
```

With debug traces:

```ts
const result = execute(engineState, inputs, { debug: true })
// result.steps[n].trace → TokenTrace[] (token-by-token evaluation trace)
```

## Architecture

```
EngineState + inputs
       │
       ▼
  ┌──────────┐     ┌───────────────────┐
  │ execute() │────→│ createDecimalFactory│
  │          │     │ (precision/rounding)│
  │          │     └───────────────────┘
  │          │
  │  for each enabled step:
  │          │
  │          ▼
  │  ┌──────────────────┐
  │  │evaluateExpression │  ← shunting-yard
  │  │  resolves:        │
  │  │  - varRef         │
  │  │  - stepRef        │
  │  │  - tableRef (1D/2D│, parameterized)
  │  │  - conditional    │
  │  │  - arithmetic ops │
  │  └──────────────────┘
  │          │
  │          ▼
  │    clamp (min/max)
  │          │
  └──────────┘
       │
       ▼
  ExecuteResult
```

## API Reference

### `execute(engine, inputs?, options?)`

Main entry point. Validates `engine` against `EngineSchema` (Zod), then
evaluates all enabled steps in order.

```ts
function execute(
  engine: unknown,
  inputs?: Record<string, string>,
  options?: { debug?: boolean }
): ExecuteResult
```

**Parameters:**
- `engine` — `unknown` (validated at runtime via Zod `EngineSchema`)
- `inputs` — variable `id → value` map (defaults to variable `defaultValue` if omitted)
- `options.debug` — when `true`, includes `TokenTrace[]` on each step

**Returns:** `ExecuteResult`
```ts
interface ExecuteResult {
  outputs: Record<string, string>  // step name → formatted result
  steps: StepResult[]
  errors: string[]
}

interface StepResult {
  id: string
  name: string
  value: string
  error?: string
  trace?: TokenTrace[]  // only when debug: true
}
```

---

### `evaluateExpression(tokens, context)`

Shunting-yard expression evaluator. Resolves all token types (numbers, varRefs,
stepRefs, tableRefs, conditionals) into a single `Decimal` value.

```ts
function evaluateExpression(
  tokens: ExpressionToken[],
  ctx: EvalContext
): Decimal
```

**`EvalContext`** provides the resolution environment:
```ts
interface EvalContext {
  variables: Map<string, Decimal>
  steps: Map<string, Decimal>
  tables: LookupTable[]
  factory: DecimalFactory
  textVariables?: Map<string, string>
}
```

---

### `validateParens(tokens)`

Checks that parentheses in an expression token array are balanced.

```ts
function validateParens(tokens: ExpressionToken[]): boolean
```

---

### `createDecimalFactory(config)`

Creates a `Decimal` constructor configured with the engine's precision and
rounding mode. Used internally by `execute()`.

```ts
function createDecimalFactory(config: EngineConfig): DecimalFactory

interface DecimalFactory {
  create(value: string | number): Decimal
  ZERO: Decimal
}
```

---

### `EngineSchema`

Zod schema for `EngineState`. Used for runtime validation in `execute()` and
for generating JSON Schema via `z.toJSONSchema(EngineSchema)`.

```ts
import { EngineSchema } from "@/lib/runtime"
import { z } from "zod"

// Runtime validation
const parsed = EngineSchema.parse(unknownData)

// JSON Schema generation (used in schemas/endpoints.ts)
const jsonSchema = z.toJSONSchema(EngineSchema)
```

## Types

All types are defined in `types.ts` and re-exported from `index.ts`.

### Core types

| Type | Description |
|------|-------------|
| `EngineState` | Top-level engine definition (config + variables + tables + steps) |
| `EngineConfig` | Precision, rounding mode, min/max clamp values |
| `Variable` | Input or constant variable (number or text) |
| `Step` | Named calculation step with expression tokens |
| `LookupTable` | 1D/2D lookup table with conditions and optional parameters |

### Expression types

| Type | Description |
|------|-------------|
| `ExpressionToken` | Union of all token types (number, op, paren, varRef, stepRef, tableRef, conditional) |
| `ScalarToken` | Subset of tokens valid inside conditional branches |
| `CompareOp` | `<` `<=` `==` `>=` `>` `!=` |

### Table types

| Type | Description |
|------|-------------|
| `TableColumn` | Column definition with optional 2D condition |
| `TableRow` | Row with condition + values per column |
| `TableCondition` | Left side + operator + right side |
| `TableConditionSide` | Discriminated union: number, varRef, stepRef, text, paramRef |

### Result types

| Type | Description |
|------|-------------|
| `ExecuteResult` | Full execution result (outputs, steps, errors) |
| `StepResult` | Per-step result with optional trace |
| `StepTrace` | Step-level trace metadata |
| `TokenTrace` | Token-level evaluation trace |
| `EvalContext` | Context passed to the expression evaluator |
| `DecimalFactory` | Configured Decimal.js constructor |

## File Structure

```
lib/runtime/
├── types.ts           # All TypeScript types (zero deps)
├── schema.ts          # Zod schemas mirroring types.ts
├── decimalFactory.ts  # Decimal.js factory with configurable precision
├── evaluator.ts       # Shunting-yard expression evaluator
├── execute.ts         # Main orchestrator (validate → evaluate → result)
├── index.ts           # Barrel exports
└── __bench__/         # Performance benchmarks
```
