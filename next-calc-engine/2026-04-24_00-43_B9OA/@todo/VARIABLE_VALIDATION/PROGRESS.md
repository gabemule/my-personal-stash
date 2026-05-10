# VARIABLE_VALIDATION — Progress

**Status:** 0/15 items · Phase: Not started

## Current Focus
Not started yet.
Next step: Phase 1 — Add `VariableValidationSchema` to `libs/runtime/schema.ts`
Blocker: none

## Progress

### Phase 1 — Data model + runtime validation
- [ ] Add `VariableValidationSchema` to `libs/runtime/schema.ts`
- [ ] Add `validation` field to `VariableSchema`
- [ ] Add `validateInputs()` function in `execute.ts`
- [ ] Add test cases in `execute.test.ts` for each constraint type

### Phase 2 — VariableSettingsModal + VarRow simplification
- [ ] Create `VariableSettingsModal` component
- [ ] Simplify `VarRow` to compact layout (icon + name + ⚙ + ×)
- [ ] Wire modal save → `UPDATE_VARIABLE` dispatch
- [ ] Verify builder loads and modal works

### Phase 3 — JSON Schema output
- [ ] Update `InputSchemaPropertySchema` in `schemas/api.ts`
- [ ] Update `buildInputSchema()` in `services/calc.ts`
- [ ] Add/update tests in `services/calc.test.ts`

### Phase 4 — Smart inputs in TestPanel + Calc UI
- [ ] TestPanel renders validation-aware inputs
- [ ] Calc page mirrors smart input behavior
- [ ] Visual feedback for constraint violations
- [ ] Persist test inputs via Zustand store (`stores/testInputsStore.ts`)

## Decisions Made During Execution
(none yet)
