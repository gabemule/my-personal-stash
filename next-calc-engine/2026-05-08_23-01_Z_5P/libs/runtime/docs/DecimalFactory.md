# DecimalFactory — Precision & Rounding Guide

> How the calc-engine handles arbitrary-precision arithmetic, rounding modes,
> and value formatting. Essential reading for anyone building or debugging
> engines that deal with financial calculations.

## Why Not Native JavaScript Numbers?

JavaScript's `Number` type is IEEE 754 double-precision floating point.
Classic gotcha:

```js
0.1 + 0.2 === 0.3  // false → 0.30000000000000004
```

For financial/insurance calculations, this is unacceptable. The engine uses
[Decimal.js](https://github.com/MikeMcl/decimal.js/) for **arbitrary-precision
decimal arithmetic** — every value is represented exactly, with no floating
point drift.

> See also: [ADR 009 — Decimal Precision](../../../docs/adr/009-decimal-precision.md)

---

## The Factory Pattern

`createDecimalFactory(config)` returns a `DecimalFactory` object — a
configured toolkit for all arithmetic operations within a single engine
execution. Every operation (parsing, arithmetic, rounding, formatting) goes
through this factory to ensure consistent precision and rounding behavior.

```ts
interface DecimalFactory {
  from(v: string | number): Decimal   // Parse a value
  add(a: Decimal, b: Decimal): Decimal
  sub(a: Decimal, b: Decimal): Decimal
  mul(a: Decimal, b: Decimal): Decimal
  div(a: Decimal, b: Decimal): Decimal
  mod(a: Decimal, b: Decimal): Decimal
  round(v: Decimal): Decimal          // Round to configured precision
  clamp(v: Decimal): Decimal          // Constrain to [min, max]
  format(v: Decimal): string          // Format as fixed-point string
}
```

### Why a Factory?

Each engine has its own `EngineConfig` (precision, rounding mode, min/max).
The factory encapsulates these settings so that every operation within an
execution uses the **same** configuration — no risk of one step using
precision 2 while another uses precision 4.

---

## Internal Precision vs Display Precision

This is the most important concept to understand:

```ts
const D = Decimal.clone({
  precision: config.precision + 10,  // ← internal precision
  rounding: roundingValue,
})
```

| Concept | Value | Purpose |
|---------|-------|---------|
| **Internal precision** | `config.precision + 10` | Extra digits kept during intermediate calculations to avoid cascading rounding errors |
| **Display precision** | `config.precision` | The final number of decimal places in the output |

### Why `+ 10`?

When you chain multiple operations (multiply, divide, add, subtract), each
intermediate result can introduce small rounding errors. By keeping 10 extra
digits of precision during computation, these errors stay far below the
significant digits and are eliminated when `round()` or `format()` is called
at the end.

**Example with `precision: 2`:**

```
Internal computation (12 digits):
  100.00 × 0.0338 = 3.380000000000
  3.380000000000 × 2.30 = 7.774000000000
  7.774000000000 × (100 + 7.38) / 100 = 8.347421200000

Final round to 2 places:
  8.347421200000 → 8.35
```

Without the buffer, intermediate rounding at 2 places would produce:

```
  100.00 × 0.03 = 3.00  ← lost 0.38 already!
  3.00 × 2.30 = 6.90
  ...
```

---

## Rounding Modes

The `round(v)` function applies the configured rounding mode at `config.precision`
decimal places. Three modes are supported:

### `ROUND_HALF_UP` (default for financial calculations)

The standard rounding most people learn in school. When the digit after the
rounding position is exactly 5, round **up** (away from zero).

```
precision: 2
  2.345 → 2.35  (5 → round up)
  2.344 → 2.34  (4 → round down)
  2.355 → 2.36  (5 → round up)

precision: 1
  2.25 → 2.3
  2.24 → 2.2
```

**When to use:** Default choice. Most regulatory and actuarial calculations
expect this behavior.

### `ROUND_DOWN` (truncation)

Always truncate toward zero. Never rounds up, regardless of the digit.

```
precision: 1
  2.99 → 2.9   (not 3.0)
  2.25 → 2.2   (not 2.3)
  -2.99 → -2.9 (toward zero, not toward -3)
```

**When to use:** When you need conservative estimates (e.g., discount
calculations where you never want to give more than calculated).

### `ROUND_HALF_EVEN` (Banker's rounding)

When the digit after the rounding position is exactly 5, round to the
**nearest even** digit. For all other digits, round normally.

```
precision: 1
  2.25 → 2.2  (2 is even → stays)
  2.35 → 2.4  (3 is odd → rounds up to 4)
  2.45 → 2.4  (4 is even → stays)
  2.55 → 2.6  (5 is odd → rounds up to 6)

precision: 2
  0.025 → 0.02  (2 is even → stays)
  0.035 → 0.04  (3 is odd → rounds up)
```

**When to use:** Reduces systematic rounding bias in large datasets. Required
by some international financial standards (ISO 80000-1).

---

## Key Operations

### `from(v)` — Parsing

Converts a string or number into a `Decimal` instance.

```ts
D.from("100.50")  // Decimal(100.50)
D.from(42)        // Decimal(42)
D.from("abc")     // throws Error (invalid input)
```

**Important:** All values in `EngineState` are stored as **strings** (not
numbers). This avoids JSON serialization precision loss. The `from()` function
is the single entry point for converting these strings to `Decimal`.

### `round(v)` — Intermediate Rounding

Rounds a `Decimal` to `config.precision` decimal places using the configured
rounding mode. Called by `execute()` after evaluating each step's expression.

```ts
// config: { precision: 2, rounding: "ROUND_HALF_UP" }
D.round(D.from("3.14159"))  // Decimal(3.14)
D.round(D.from("2.345"))    // Decimal(2.35)
```

### `format(v)` — Display Formatting

Converts a `Decimal` to a fixed-point string with exactly `config.precision`
decimal places. This is the **final output format** — what the API returns.

```ts
// config: { precision: 2 }
D.format(D.from("5"))       // "5.00"   (pads with zeros)
D.format(D.from("3.1"))     // "3.10"   (pads with zeros)
D.format(D.from("3.14159")) // "3.14"   (truncates display)
```

**Gotcha:** `format()` always produces exactly `precision` decimal places.
A value of `5` with `precision: 4` becomes `"5.0000"`, not `"5"`.

### `clamp(v)` — Min/Max Constraint

Constrains a value to `[config.min, config.max]`. Only applied to steps
with `clamp: true`.

```ts
// config: { min: "10", max: "100" }
D.clamp(D.from("5"))    // Decimal(10)   — below min
D.clamp(D.from("150"))  // Decimal(100)  — above max
D.clamp(D.from("50"))   // Decimal(50)   — within range, unchanged
```

- `min: null` or `min: ""` → no lower bound
- `max: null` or `max: ""` → no upper bound

### `div(a, b)` and `mod(a, b)` — Division Safety

Both operations throw an explicit error when dividing by zero:

```ts
D.div(D.from("10"), D.from("0"))  // throws "Divisão por zero"
D.mod(D.from("10"), D.from("0"))  // throws "Módulo por zero"
```

This is caught per-step by `execute()` and surfaced as a step error without
halting the entire calculation.

---

## Execution Pipeline

Here's how the factory is used within a single `execute()` call:

```
1. createDecimalFactory(config)
   └─ Creates Decimal.js clone with precision + 10 buffer

2. For each numeric variable:
   └─ D.from(input ?? defaultValue)
      └─ Falls back to D.from("0") on parse failure

3. For each enabled step:
   └─ evaluateExpression(tokens, ctx)
      ├─ D.from() for number tokens
      ├─ D.add/sub/mul/div/mod for operators
      └─ returns Decimal (full internal precision)
   └─ D.round(result)      ← rounds to config.precision
   └─ if step.clamp: D.clamp(result)
   └─ D.format(result)     ← "5.00" for display/API

4. Final output: Record<string, string>
   └─ step name → formatted string value
```

### All Values Are Strings

A deliberate design choice: every value entering and leaving the engine is a
**string**. This includes:

- Variable `defaultValue` (`"100"`, `"0.05"`, `"SP"`)
- Table cell `values` (`"0.03"`, `"650"`)
- Condition side `value` (`"100000"`, `"AC"`)
- Step results in `ExecuteResult` (`"79.65"`, `"5000.00"`)
- Inputs to `execute()` (`{ "v1": "75000" }`)

**Why strings?**
1. **No JSON precision loss** — `Number` in JSON is IEEE 754. `0.1` in JSON
   becomes `0.1000000000000000055511151231257827021181583404541015625`.
   Strings preserve exact decimal representation.
2. **Consistent API** — both numeric and text values use the same `string`
   type, simplifying the type system.
3. **Human-readable** — `"5000.00"` is unambiguous; `5000` might have been
   `5000.004` before rounding.

---

## Common Gotchas

### 1. Trailing Zeros Are Intentional

`format()` always pads to `config.precision` places:

```ts
// precision: 2
"5"     → "5.00"    // not "5"
"3.1"   → "3.10"    // not "3.1"
"100"   → "100.00"  // not "100"
```

This is by design — the formatted output should always be visually consistent.

### 2. Round Happens Per-Step, Not Per-Operation

Intermediate arithmetic operations (`add`, `mul`, etc.) do **not** round.
Rounding only happens once, after the entire step expression is evaluated.
This preserves maximum precision through chained operations.

### 3. Unparseable Inputs Fall Back to Zero

If a variable receives an input that can't be parsed as a number (e.g., `"abc"`
for a numeric variable), it silently falls back to `Decimal(0)`:

```ts
// In execute():
try {
  variables[v.id] = D.from(inputs[v.id] ?? v.defaultValue ?? "0")
} catch {
  variables[v.id] = D.from("0")  // ← silent fallback
}
```

This prevents one bad input from crashing the entire calculation.

### 4. Infinity and NaN Are Rejected

After evaluating a step expression, the result is checked:

```ts
if (!result.isFinite()) throw new Error("Resultado inválido (Infinity/NaN)")
```

This catches edge cases like `0 / 0` (NaN) or overflow scenarios.

---

## Related Files

| File | Purpose |
|------|---------|
| `libs/runtime/decimalFactory.ts` | Factory implementation (source of truth) |
| `libs/runtime/decimalFactory.test.ts` | Tests for all rounding modes, arithmetic, clamp |
| `libs/runtime/docs/EngineState.md` | Engine JSON shape (references `EngineConfig`) |
| `docs/adr/009-decimal-precision.md` | ADR for the Decimal.js adoption decision |