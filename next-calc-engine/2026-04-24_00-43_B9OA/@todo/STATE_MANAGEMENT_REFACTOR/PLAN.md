# STATE_MANAGEMENT_REFACTOR — Plan

## Context

Two state management units have grown beyond their sweet spot:

1. **`stores/engineStore.ts` (~220 lines)** — Accumulates 3 responsibilities: data fetching (`loadProjects`, `loadEngines`, `loadEngineById`), engine mutations (save, publish, activate, delete, update), and project mutations (create, delete). Used by 5+ consumers across `builder/`, `calc/`, `engines/`, `projects/`, `EnginePicker`.

2. **`hooks/useEngineState.ts` (~520 lines)** — Monolithic `useReducer` with 30+ action types in a single `switch`. All builder state mutations (variables, tables, steps, tokens, UI) in one file. Only used by `app/builder/`.

## Goals

1. **`engineStore`** — Split into `useProjectStore` and `useEngineStore` (Option A — decided, see Consumer Analysis below)
2. **`useEngineState`** — Modularize the reducer: split action handlers by feature domain

## Consumer Analysis (supports Option A)

Current `engineStore` consumption mapped by consumer:

| Consumer | Projects data | Engines data | Project mutations | Engine mutations |
|----------|:---:|:---:|:---:|:---:|
| **Builder** | `projects`, `loadProjects` | `loadEngineById`, `records` | ❌ | `saveEngine`, `publishEngine`, `updateEngine` |
| **Calc** | `projects`, `loadProjects` | `loadEngineById` | ❌ | ❌ |
| **Engines** | `projects`, `loadProjects` | `records`, `loadEngines` | ❌ | `setActiveEngine`, `publishEngine`, `deleteEngine`, `updateEngine` |
| **Projects** | `projects`, `loadProjects` | `records`, `loadEngines` | `createProject`, `deleteProject` | ❌ |
| **EnginePicker** | `loadProjects` | `loadEngines` | ❌ | ❌ |

### After split: cleaner dependencies per page

| Page | `useProjectStore` | `useEngineStore` |
|------|-------------------|------------------|
| **Projects** | Core: `projects`, `loadProjects`, `createProject`, `deleteProject` | Read-only: `records` (engine count per project) |
| **Engines** | Read-only: `projects` (dropdown filter) | Core: `records`, `loadEngines`, `setActiveEngine`, `publishEngine`, `deleteEngine`, `updateEngine` |
| **Builder** | Read-only: `projects` (dropdown) | Core: `loadEngineById`, `saveEngine`, `publishEngine`, `updateEngine` |
| **Calc** | Read-only: `projects` (dropdown) | Read-only: `loadEngineById` |
| **EnginePicker** | Read-only: `loadProjects` | Read-only: `loadEngines` |

### Benefits
1. **Scoped re-renders** — project mutations only re-render project subscribers, not engine subscribers (and vice-versa)
2. **Clear dependencies** — each page has an obvious "core" store and optional "read-only" cross-reference
3. **Cross-store calls** — Zustand supports `useProjectStore.getState()` from inside `useEngineStore` (e.g., `deleteProject` → trigger `loadEngines()`)
4. **Page stores unaffected** — `builderPageStore`, `calcPageStore`, `enginesPageStore` continue holding only UI selection state

## Scope

**In:** `stores/engineStore.ts`, `hooks/useEngineState.ts`, `types/ui.ts`

**Out:** `app/builder/` reorganization (separate @todo), service layer, route handlers

## Decisions

- **Option A chosen** (split into `useProjectStore` + `useEngineStore`) — consumer analysis shows clean separation with every page benefiting from scoped re-renders
- engineStore and useEngineState do NOT belong in `APP_BUILDER_REORGANIZING` — they live outside `app/builder/` and are cross-cutting concerns
- Benefits from `APP_BUILDER_REORGANIZING` being done first (builder structure stabilized)
- Independent of `TYPE_SAFETY_REFINEMENTS`, `API_KEYS_PROJECT_SCOPE`

## Phases

### Phase 1 — useEngineState reducer modularization (~2h)
- Split action handlers by domain (variables, tables, steps, tokens, UI)
- Convert `hooks/useEngineState.ts` (file) → `hooks/useEngineState/` (directory)
  - `index.ts` — the hook (public API, composes slice reducers)
  - `variablesReducer.ts`, `tablesReducer.ts`, `stepsReducer.ts`, `tokensReducer.ts`, `uiReducer.ts` — slice handlers (internal)
- Compose in main reducer via delegation

### Phase 2 — engineStore split into useProjectStore + useEngineStore (~1.5h)
- Create `stores/projectStore.ts` with: `projects`, `loadProjects`, `createProject`, `deleteProject`
- Refactor `stores/engineStore.ts` to keep only engine concerns: `records`, `loadEngines`, `loadEngineById`, `saveEngine`, `saveAndActivate`, `publishEngine`, `setActiveEngine`, `deleteEngine`, `updateEngine`
- Cross-store: `deleteProject` in projectStore calls `useEngineStore.getState().loadEngines()` to refresh
- Update all 5 consumers (Builder, Calc, Engines, Projects, EnginePicker)
- Verify: `yarn tsc --noEmit` + `yarn test`
