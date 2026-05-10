# APP_BUILDER_REORGANIZING — Progress

**Status:** 4/4 phases · Complete ✅

## Current Focus
All phases complete. Shell at 104 lines (target ≤150 ✅).
Next step: none (feature complete)
Blocker: none

## Progress

### Phase 1 — Restructure + co-location
- [x] Create folder structure (`_EngineBuilder/`, `_LeftContent/`, `_MainContent/`, `_RightContent/`, `_modals/`)
- [x] Move building blocks from `components/` to destinations — no `components/` wrappers at any level
- [x] Update all imports (page.tsx, EngineBuilder, internal cross-refs)
- [x] Delete empty `components/` folder
- [x] Verify: `yarn tsc --noEmit`, `yarn dev`, smoke test

### Phase 2 — Create section wrappers
- [x] Create `_LeftContent/index.tsx` wrapper
- [x] Create `_MainContent/index.tsx` wrapper
- [x] Create `_RightContent/index.tsx` wrapper (owns `openPanel` state)
- [x] Update EngineBuilder to compose 3 sections
- [x] Verify: `yarn tsc --noEmit`, visual smoke test

### Phase 3 — Extract modals + EngineNameInput
- [x] Extract `EngineNameInput` → `_EngineBuilder/EngineNameInput.tsx`
- [x] Extract `ConfigModal` → `_modals/ConfigModal/index.tsx`
- [x] Extract `ImportModal` → `_modals/ImportModal/index.tsx`
- [x] Extract `SaveConfirmModal` → `_modals/SaveConfirmModal/index.tsx`
- [x] Extract `PublishConfirmModal` → `_modals/PublishConfirmModal/index.tsx`
- [x] Extract `NewEngineModal` → `_modals/NewEngineModal/index.tsx`
- [x] Update EngineBuilder to compose modals declaratively
- [x] Verify: `yarn tsc --noEmit`, test all 5 modals

### Phase 4 — Slim the shell
- [x] Extract `HeaderToolbar` → `_EngineBuilder/HeaderToolbar.tsx` (owns `moreMenuOpen` state)
- [x] Extract `useBuilderEngine` → `_EngineBuilder/useBuilderEngine.ts` (orchestration hook)
- [x] Remove all orchestration logic from shell (callbacks, init, derived state, store selectors)
- [x] Measure: `wc -l` = **104 lines** ✅ (target ≤150)
- [x] Verify: `yarn tsc --noEmit`

## File breakdown (final)

| File | Lines | Responsibility |
|---|---|---|
| `index.tsx` (shell) | 104 | UI composition: hook + modal toggles + layout + modals |
| `useBuilderEngine.ts` | 196 | Orchestration: stores, URL, init, CRUD callbacks |
| `HeaderToolbar.tsx` | 114 | Header JSX: project selector, name input, status, menu |
| `EngineNameInput.tsx` | 34 | Inline editable engine name |

## Decisions Made During Execution
- 2026-05-09: Plan rewritten from scratch. Original plan (2026-04-21) was stale: BuilderHeader removed, VersionModal removed, publishing lifecycle added, file grew from ~350 to 613 lines. New plan uses flat structure (`_LeftContent/` etc. as direct children of `app/builder/`) instead of nested `_components/sections/`.
- 2026-05-10: No `components/` wrapper convention adopted project-wide. All paths updated to reflect flat hierarchy (e.g. `_LeftContent/VariablesPanel/` not `_LeftContent/components/VariablesPanel/`). `_components/` renamed to `_EngineBuilder/`. `EngineNameInput` is a flat file, not a folder.
- 2026-05-10: `HeaderToolbar` extracted (not in original plan) to further slim the shell. Owns `moreMenuOpen` state and all lucide icon imports.
- 2026-05-10: `useBuilderEngine` hook extracted (not in original plan) to move all orchestration logic out of the shell. Shell became pure UI composition at 104 lines. The hook encapsulates: store selectors, URL resolution, init effect, save/publish/export/calculate callbacks, and a `loadAndImportEngine` helper for the EnginePicker integration.
