# STATE_MANAGEMENT_REFACTOR — Progress

**Status:** 0/4 items · Phase: Not started

## Current Focus
Backlog — not started. Benefits from APP_BUILDER_REORGANIZING being done first.
Next step: Phase 1 — useEngineState reducer modularization
Blocker: none

## Progress

### Phase 1 — useEngineState reducer modularization
- [ ] Split action handlers by domain (variables, tables, steps, tokens, UI)
- [ ] Convert `hooks/useEngineState.ts` → `hooks/useEngineState/` directory with slice reducers

### Phase 2 — engineStore split into useProjectStore + useEngineStore
- [ ] Create `stores/projectStore.ts` (projects, loadProjects, createProject, deleteProject)
- [ ] Refactor `stores/engineStore.ts` (keep only engine concerns)
- [ ] Wire cross-store: deleteProject → useEngineStore.getState().loadEngines()
- [ ] Update all 5 consumers (Builder, Calc, Engines, Projects, EnginePicker)

## Decisions Made During Execution
- 2026-05-09: Option A chosen (split into useProjectStore + useEngineStore). Consumer analysis showed clean separation — every page benefits from scoped re-renders. See PLAN.md § Consumer Analysis.
