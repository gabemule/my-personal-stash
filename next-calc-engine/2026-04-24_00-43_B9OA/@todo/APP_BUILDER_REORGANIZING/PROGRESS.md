# APP_BUILDER_REORGANIZING — Progress

**Status:** 0/4 phases · Phase: Not started

## Current Focus
Backlog — not started.
Next step: Phase 1 — Restructure + co-location
Blocker: none

## Progress

### Phase 1 — Restructure + co-location
- [ ] Create folder structure (`_EngineBuilder/`, `_LeftContent/`, `_MainContent/`, `_RightContent/`, `_modals/`)
- [ ] Move building blocks from `components/` to destinations — no `components/` wrappers at any level
- [ ] Update all imports (page.tsx, EngineBuilder, internal cross-refs)
- [ ] Delete empty `components/` folder
- [ ] Verify: `yarn tsc --noEmit`, `yarn dev`, smoke test

### Phase 2 — Create section wrappers
- [ ] Create `_LeftContent/index.tsx` wrapper
- [ ] Create `_MainContent/index.tsx` wrapper
- [ ] Create `_RightContent/index.tsx` wrapper (owns `openPanel` state)
- [ ] Update EngineBuilder to compose 3 sections
- [ ] Verify: `yarn tsc --noEmit`, visual smoke test

### Phase 3 — Extract modals + EngineNameInput
- [ ] Extract `EngineNameInput` → `_EngineBuilder/EngineNameInput.tsx`
- [ ] Extract `ConfigModal` → `_modals/ConfigModal/index.tsx`
- [ ] Extract `ImportModal` → `_modals/ImportModal/index.tsx`
- [ ] Extract `SaveConfirmModal` → `_modals/SaveConfirmModal/index.tsx`
- [ ] Extract `PublishConfirmModal` → `_modals/PublishConfirmModal/index.tsx`
- [ ] Extract `NewEngineModal` → `_modals/NewEngineModal/index.tsx`
- [ ] Update EngineBuilder to compose modals declaratively
- [ ] Verify: `yarn tsc --noEmit`, test all 5 modals

### Phase 4 — Slim the shell
- [ ] Clean up unused imports/states
- [ ] Reorder file: imports → hooks → derived → handlers → early returns → render
- [ ] Measure: `wc -l` ≤ 150
- [ ] Verify: `yarn tsc --noEmit`, full end-to-end smoke test

## Decisions Made During Execution
- 2026-05-09: Plan rewritten from scratch. Original plan (2026-04-21) was stale: BuilderHeader removed, VersionModal removed, publishing lifecycle added, file grew from ~350 to 613 lines. New plan uses flat structure (`_LeftContent/` etc. as direct children of `app/builder/`) instead of nested `_components/sections/`.
- 2026-05-10: No `components/` wrapper convention adopted project-wide. All paths updated to reflect flat hierarchy (e.g. `_LeftContent/VariablesPanel/` not `_LeftContent/components/VariablesPanel/`). `_components/` renamed to `_EngineBuilder/`. `EngineNameInput` is a flat file, not a folder.
