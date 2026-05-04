# URL_DRIVEN_LOADING — Plan

## Context

The frontend loads projects and engines in an uncoordinated way: every page calls `loadFromAPI()` on mount, `WorkspaceSelector` makes its own fetches outside the store, and `EngineLibrary` does N+1 requests (one per project). No page uses URL params — all selection lives in memory (Zustand) or localStorage (workspaceStore persist). Result: duplicate fetches, no shareable links, broken back/forward, and chaotic initialization.

### Current problems (diagnostic)

1. **Every page calls `loadFromAPI()` independently** — EngineBuilder, EngineLibrary, ProjectsLibrary, Calculator all call `loadFromAPI()` on mount. 4 pages doing the same fetch without coordination.
2. **WorkspaceSelector fetches engines outside the store** — Has its own `fetchEngines()` (lines 13-27) that calls `fetch(url)` directly, bypassing the store. Parent fetches via `loadFromAPI()` and then WorkspaceSelector fetches again in parallel. Duplicate fetch.
3. **EngineLibrary does N+1 fetches** — Calls `loadFromAPI()` then `fetchAllEngines(projects)` which fires one request per project plus one for orphans. 5 projects = 7 total requests.
4. **No URL params anywhere** — No route has `?engineId=xxx` or `?projectId=yyy`. Can't share links, browser back/forward doesn't work, all state is in memory/localStorage.
5. **Two stores doing related things without coordination** — `workspaceStore` (persist) has selectedProjectId/selectedEngineId, `engineStore` (no persist) has records/projects/loading/loaded + CRUD. Selection and data are disconnected.
6. **Builder has chaotic initialization** — `loadFromAPI()` → WorkspaceSelector resolves project → fetches engines → calls `onEngineChange(record)` → Builder imports state. None of this is in the URL.

## Goals

1. **URL as source of truth** — `?engineId` in builder/calc, `?projectId` optional in engines page
2. **Eliminate duplicate fetches** — each piece of data fetched once
3. **Predictable initialization flow** — URL → fallback store → fetch first available → redirect
4. **Shareable links** — `/builder?engineId=abc` opens directly to the right engine
5. **Back/forward works** — browser history navigates between selections
6. **Zero backend/API changes** — refactor is 100% frontend

## Scope

### In scope
- Create `hooks/useRouteState.ts` — central hook resolving URL params ↔ workspaceStore
- Refactor `WorkspaceSelector` — stop making own fetches, operate on store data
- Refactor `EngineBuilder` — read `?engineId` from URL, load engine by ID
- Refactor `Calculator` — read `?engineId` from URL
- Refactor `EngineLibrary` — read `?projectId` optional, eliminate `fetchAllEngines` N+1
- Simplify `engineStore.loadFromAPI()` — split into `loadProjects()` and `loadEngines(projectId?)`
- `workspaceStore` — continues persisting to localStorage as fallback

### Out of scope
- Backend/API changes (except possibly adjusting engines list endpoint to support "all" mode)
- Changes to `ProjectsLibrary` (no params needed, lists everything)
- Migrating stores to server components
- Any changes in `core/`, `libs/runtime/`, `services/`

## Decisions

| Decision | Rationale |
|---|---|
| Shared `useRouteState()` hook instead of store-per-screen | All pages resolve IDs the same way. What differs is what each loads with those IDs — no reason to duplicate stores |
| `?engineId` only in builder/calc, `?projectId` only in engines | Builder/calc operate on one engine (global UUID). projectId comes from the engine record itself — not needed in URL. Engines page filters by project |
| `useSearchParams()` + `router.replace()` instead of `router.push()` | `replace` avoids polluting history with every selection change. `push` only for intentional navigation |
| WorkspaceSelector becomes "dumb" — just renders selects | Resolution and fetch logic moves from the component to the hook |
| Keep `workspaceStore` persist as fallback | When user opens `/builder` without params, hook reads last engineId from localStorage and redirects with params |
| Engines page: client-side grouping instead of N+1 fetches | Fetch all engines in a single call (or one per needed scope), group by projectId client-side |

## URL Schema

| Route | Params | Behavior |
|---|---|---|
| `/builder?engineId=xyz` | `engineId` required | Loads engine by UUID. No param → fallback to store → fetch first available → redirect |
| `/calc?engineId=xyz` | `engineId` required | Same pattern as builder |
| `/engines?projectId=abc` | `projectId` optional | With param → filter engines by project. Without → show all grouped |
| `/projects` | none | Lists all projects, no filter needed |

## Phases

### Phase 1: Infrastructure (~30 min)

#### 1.1 Create `hooks/useRouteState.ts`
```ts
// Responsibilities:
// - Read ?engineId / ?projectId from URL
// - If no params → read workspaceStore (localStorage fallback)
// - If nothing anywhere → fetch first available → redirect with params
// - Expose setters that update URL + store simultaneously
// - Expose loading state

interface RouteState {
  engineId: string | null
  projectId: string | null     // for filter on engines page
  loading: boolean
  setEngineId: (id: string) => void
  setProjectId: (id: string | null) => void
}
```

#### 1.2 Refactor `engineStore`
- Split `loadFromAPI()` into:
  - `loadProjects()` — fetch projects only
  - `loadEngines(projectId?: string | null)` — fetch engines filtered or all
  - `loadEngineById(id: string)` — fetch single engine (new, for builder/calc)
- Keep `loadFromAPI()` as backward-compat wrapper

### Phase 2: Builder + Calc (~45 min)

#### 2.1 Refactor `EngineBuilder`
- Read `?engineId` via `useRouteState()`
- No param → resolve fallback → redirect `/builder?engineId=xxx`
- Has param → `engineStore.loadEngineById(engineId)` → import into builder
- When user changes engine in selector → `router.replace(/builder?engineId=yyy)`
- Remove direct `loadFromAPI()` call

#### 2.2 Refactor `Calculator`
- Same pattern as builder: `?engineId` → load → render
- Remove direct `loadFromAPI()` call

#### 2.3 Refactor `WorkspaceSelector`
- Receive `engines` as prop (or from store) instead of making own fetch
- Receive callbacks `onProjectChange`, `onEngineChange` that parent connects to router
- Kill internal `fetchEngines()`
- Component becomes purely presentational + callbacks

### Phase 3: Engines page (~30 min)

#### 3.1 Refactor `EngineLibrary`
- Read `?projectId` via `useSearchParams()`
- No param → `loadEngines()` (all, grouped by project) — **single request**
- With param → `loadEngines(projectId)` — filtered
- Kill `fetchAllEngines()` (N+1 problem)
- When user changes project filter → `router.replace(/engines?projectId=yyy)` or `/engines` (no param = all)

#### 3.2 Handle "all engines" loading
- Today `GET /api/engines` without projectId returns only orphaned engines (`.is("project_id", null)`).
- Need to evaluate: either adjust the route handler to support a `?all=true` param, or fetch all projects' engines with a single batched approach.
- **Preferred:** client-side grouping after fetching all engines in one request (may need small route handler tweak).

### Phase 4: Cleanup + Polish (~20 min)

#### 4.1 Remove dead code
- `WorkspaceSelector.fetchEngines()` — removed
- `EngineLibrary.fetchAllEngines()` — removed
- Direct `loadFromAPI()` calls in each page — replaced by hooks
- `engineStore.loadFromAPI()` — keep as compat or remove if unused

#### 4.2 Sync workspaceStore with URL
- When `useRouteState()` resolves an engineId/projectId → save to workspaceStore (for next visit without params)
- Ensure page refresh without params falls back correctly

#### 4.3 Test edge cases
- `/builder` without params, nothing in localStorage → resolves first engine
- `/builder?engineId=invalid-uuid` → fallback to first available
- Back/forward between `/builder?engineId=A` and `/builder?engineId=B`
- `/engines` without params → shows all
- `/engines?projectId=xxx` → filters

### Phase 5: Docs (~10 min)

#### 5.1 Update `@todo/CONTEXT.md`
- Document URL-driven loading pattern
- Update conventions section

## Estimated total: ~2h15min

## Risks

| Risk | Mitigation |
|---|---|
| `GET /api/engines` without projectId returns only orphans today | May need route handler adjustment — verify in Phase 3 |
| `useSearchParams()` causes re-render in client components | Next.js 16 with React 19 — verify if `Suspense` boundary needed |
| WorkspaceSelector is used in 2 pages (builder, calc) — change affects both | Refactor WorkspaceSelector first, then adapt pages |

## Files affected

| File | Change type |
|---|---|
| `hooks/useRouteState.ts` | **New** |
| `stores/engineStore.ts` | Refactor (split loadFromAPI) |
| `stores/workspaceStore.ts` | Minor (ensure sync with URL) |
| `components/WorkspaceSelector/index.tsx` | Refactor (remove fetch, become presentational) |
| `app/builder/components/EngineBuilder/index.tsx` | Refactor (URL-driven init) |
| `app/calc/components/Calculator/index.tsx` | Refactor (URL-driven init) |
| `app/engines/components/EngineLibrary/index.tsx` | Refactor (URL-driven filter, kill N+1) |
| `app/api/engines/route.ts` | Possibly minor (support "all" mode) |
| `@todo/CONTEXT.md` | Update (document new pattern) |