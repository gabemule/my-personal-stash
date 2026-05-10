# APP_BUILDER_REORGANIZING — Plan

## Context

`app/builder/components/EngineBuilder/index.tsx` is a **613-line monolith** mixing 5+ responsibilities:

1. **Shell** — 3-column grid layout composition
2. **Header toolbar** — engine name input, dirty indicator, Save/Publish buttons, status badge, "more actions" menu (all injected as `<PageHeader>` children)
3. **5 inline modals** — Config, Import JSON, Save confirm, Publish confirm, New engine confirm
4. **Orchestration logic** — handlers (save, import, export, calculate), URL-driven loading, init effects, 15+ local states
5. **Inline sub-component** — `EngineNameInput` (20 lines defined inside the file)

The builder folder uses `components/` (no underscore) while all other routes follow the `_components/` convention.

**Current structure:**
```
app/builder/components/
├── ConfigPanel/
├── EngineBuilder/          ← 613 lines, shell monolith
├── JsonPreview/
├── LookupTablesPanel/
├── StepCard/
├── TableEditModal/         ← EditTab, ImportTab, parseTableData
├── TestPanel/
└── VariablesPanel/
```

## Goals

1. **Flat section layout** — `_LeftContent/`, `_MainContent/`, `_RightContent/` as direct children of `app/builder/`
2. **5 modals extracted** — each self-contained with `open` + `onClose` + specific props
3. **`EngineBuilder/index.tsx` ≤ 150 lines** — only hooks, handlers, and declarative composition
4. **Co-location** — each building block lives inside the section/modal that uses it
5. **Convention aligned** — `_` prefix on direct children of `app/builder/` (route folder)

## Target Structure

```
app/builder/
├── page.tsx                              ← imports EngineBuilder
├── loading.tsx
├── _EngineBuilder/
│   ├── index.tsx                         ← shell ≤ 150 lines
│   └── EngineNameInput.tsx               ← extracted inline (~20 lines, no folder needed)
├── _LeftContent/
│   ├── index.tsx                         ← wrapper: <aside> + readOnly gate
│   ├── VariablesPanel/
│   │   └── index.tsx
│   └── LookupTablesPanel/
│       ├── index.tsx
│       └── TableEditModal/              ← co-located: only used by LookupTablesPanel
│           ├── index.tsx
│           ├── EditTab.tsx
│           ├── ImportTab.tsx
│           └── parseTableData.ts
├── _MainContent/
│   ├── index.tsx                         ← wrapper: <main> + StepCard list + readOnly gate
│   └── StepCard/
│       └── index.tsx
├── _RightContent/
│   ├── index.tsx                         ← wrapper: <aside> + openPanel local state
│   ├── TestPanel/
│   │   └── index.tsx
│   └── JsonPreview/
│       └── index.tsx
└── _modals/
    ├── ConfigModal/
    │   ├── index.tsx                     ← Modal + ConfigPanel
    │   └── ConfigPanel/
    │       └── index.tsx
    ├── ImportModal/
    │   └── index.tsx                     ← file loader + textarea + onImport
    ├── SaveConfirmModal/
    │   └── index.tsx                     ← save confirmation
    ├── PublishConfirmModal/
    │   └── index.tsx                     ← publish confirmation (immutability warning)
    └── NewEngineModal/
        └── index.tsx                     ← new engine confirmation (ex-ClearConfirm)
```

### Migration map

| Current location | Destination |
|---|---|
| `components/EngineBuilder/index.tsx` (613 lines) | `_EngineBuilder/index.tsx` (≤ 150 lines) |
| *(inline)* `EngineNameInput` in EngineBuilder | `_EngineBuilder/EngineNameInput.tsx` |
| `components/VariablesPanel/` | `_LeftContent/VariablesPanel/` |
| `components/LookupTablesPanel/` | `_LeftContent/LookupTablesPanel/` |
| `components/TableEditModal/*` | `_LeftContent/LookupTablesPanel/TableEditModal/*` |
| `components/StepCard/` | `_MainContent/StepCard/` |
| `components/TestPanel/` | `_RightContent/TestPanel/` |
| `components/JsonPreview/` | `_RightContent/JsonPreview/` |
| `components/ConfigPanel/` | `_modals/ConfigModal/ConfigPanel/` |
| *(inline)* Config modal in shell | `_modals/ConfigModal/index.tsx` |
| *(inline)* Import modal in shell | `_modals/ImportModal/index.tsx` |
| *(inline)* Save confirm in shell | `_modals/SaveConfirmModal/index.tsx` |
| *(inline)* Publish confirm in shell | `_modals/PublishConfirmModal/index.tsx` |
| *(inline)* New engine confirm in shell | `_modals/NewEngineModal/index.tsx` |
| `components/` (root folder) | **deleted** after all contents moved |

### What stays external (no move)
- `@/components/PageHeader` — global header, builder injects children
- `@/components/EnginePicker` — global modal, builder just calls it
- `@/components/Modal` — generic modal wrapper
- `@/components/NoProjectsState` — global empty state

## Folder convention

### Underscore rule (Escola A)

Direct children of route folders **need** `_` prefix to prevent becoming routes. Anything deeper does NOT need it — the parent already blocks routing.

- `app/builder/_EngineBuilder/` → `_` required (direct child of route)
- `app/builder/_LeftContent/` → `_` required (direct child of route)
- `app/builder/_LeftContent/VariablesPanel/` → no `_` needed
- `app/builder/_modals/` → `_` required (direct child of route)
- `app/builder/_modals/ConfigModal/ConfigPanel/` → no `_` needed

### No `components/` wrapper

No intermediate `components/` folder at any level. Child components are direct children of their parent. The folder hierarchy IS the namespace — an extra wrapper adds noise, not clarity.

**Applies project-wide** (not just builder). Other routes should adopt this when touched:
- `app/calc/components/Calculator/` → `app/calc/_Calculator/`
- `app/engines/components/EngineLibrary/` → `app/engines/_EngineLibrary/`
- `app/projects/components/ProjectsLibrary/` → `app/projects/_ProjectsLibrary/`
- `app/guide/components/Guide.tsx` → `app/guide/_Guide.tsx`

## Scope

### In scope
- All files under `app/builder/components/` → move to new structure
- Extract 5 inline modals from EngineBuilder shell
- Extract `EngineNameInput` from EngineBuilder shell
- Create 3 section wrappers (`_LeftContent`, `_MainContent`, `_RightContent`)
- Update all imports in `page.tsx` and internal cross-references

### Out of scope
- Refactoring **content** of existing components (VariablesPanel, StepCard, etc.) — only move
- Other routes (`app/calc/`, `app/engines/`, `app/projects/`, `app/guide/`)
- Global components (`@/components/*`)
- Core/libs/hooks/stores outside `app/builder/`
- Adding tests (smoke manual is sufficient for this refactor)

## Decisions

- **Flat structure chosen** — sections as direct `_` prefixed children of `app/builder/` instead of nested under `_components/sections/`
- **5 modals** (Config, Import, Save, Publish, NewEngine) — VersionModal removed (no longer exists), SaveConfirm and PublishConfirm added
- **readOnly prop** added to section wrapper contracts (publishing lifecycle)
- **EngineNameInput extracted** — currently inline in shell, belongs in `_EngineBuilder/` as a flat file (no folder — ~20 lines)
- **EnginePicker not extracted** — already lives at `@/components/EnginePicker`, shell just calls it
- **Component-scoped modals co-located** — `TableEditModal` lives inside `LookupTablesPanel/` (its only consumer). Shell-level modals (Config, Import, Save, Publish, NewEngine) live in `_modals/` because they're cross-cutting.

## Phases

### Phase 1 — Restructure + co-location (~30min)
1. Create folder structure: `_EngineBuilder/`, `_LeftContent/`, `_MainContent/`, `_RightContent/`, `_modals/`
2. Move building blocks from `components/` to their destinations (see migration map) — no `components/` wrappers at any level
3. Update all imports (page.tsx, EngineBuilder, internal cross-refs)
4. Delete empty `components/` folder
- Verify: `yarn tsc --noEmit`, `yarn dev`, smoke test

### Phase 2 — Create section wrappers (~45min)
1. Create `_LeftContent/index.tsx` — receives `{ engine, dispatch, readOnly }`
2. Create `_MainContent/index.tsx` — receives `{ engine, ui, dispatch, readOnly }`
3. Create `_RightContent/index.tsx` — receives `{ engine, ui, dispatch, exported, onCalculate }`, owns `openPanel` state
4. Update EngineBuilder to compose 3 sections instead of inline grid
- Verify: `yarn tsc --noEmit`, visual smoke test

### Phase 3 — Extract modals + EngineNameInput (~1h)
1. Extract `EngineNameInput` → `_EngineBuilder/EngineNameInput.tsx`
2. Extract `ConfigModal` → `_modals/ConfigModal/index.tsx`
3. Extract `ImportModal` → `_modals/ImportModal/index.tsx` (moves refs + file reader logic)
4. Extract `SaveConfirmModal` → `_modals/SaveConfirmModal/index.tsx`
5. Extract `PublishConfirmModal` → `_modals/PublishConfirmModal/index.tsx`
6. Extract `NewEngineModal` → `_modals/NewEngineModal/index.tsx`
7. Update EngineBuilder to compose modals declaratively
- Verify: `yarn tsc --noEmit`, test all 5 modals

### Phase 4 — Slim the shell (~20min)
1. Clean up unused imports/states in EngineBuilder
2. Reorder: imports → hooks → derived → handlers → early returns → render
3. Measure: `wc -l` ≤ 150
- Verify: `yarn tsc --noEmit`, full end-to-end smoke test
