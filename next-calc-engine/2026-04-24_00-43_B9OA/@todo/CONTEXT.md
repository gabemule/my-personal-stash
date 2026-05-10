# CONTEXT.md — Project Knowledge Base

> Maintained by AI for context recovery between sessions.
> Last updated: 2026-05-10 (APP_BUILDER_REORGANIZING complete)

## Stack & Infra

- **Framework:** Next.js 16 (App Router) + TypeScript strict + React 19
- **DB/Auth:** Supabase (Postgres + Auth + RLS via `@supabase/ssr`)
- **Validation:** Zod v4 (schemas as SSOT — ADR 003)
- **State:** Zustand (client), Supabase (server)
- **Arithmetic:** Decimal.js (arbitrary precision)
- **Logging:** Pino
- **Testing:** Vitest (unit), Bruno (API integration)
- **Monitoring:** New Relic
- **CSS:** Tailwind CSS v4
- **Deploy:** Vercel + Docker support
- **Package manager:** Yarn 1.22, Node >= 22

## Architecture

### Request flow
```
Browser/M2M → proxy.ts (auth check) → route handler → service → Supabase client → DB (RLS)
```

### Key directories
- `app/api/*` — Route handlers (thin HTTP layer, no business logic)
- `services/*` — Business logic, one file per entity (engines, projects, calc, api-keys, auth)
- `schemas/api.ts` — Zod schemas as single source of truth for validation and types
- `schemas/endpoints.ts` — JSON Schema registry (Zod → JSON Schema via `z.toJSONSchema()`) for `/api/schema` and `/api/schemas/*` endpoints
- `core/` — Engine state management (conditions, runner, state mutations, validation) — used by builder UI
- `libs/runtime/` — Calc execution engine (evaluator, decimal factory, execute) — used by API calc routes
- `libs/supabase/` — Supabase client factories (SSR client, service-role client)
- `libs/api-keys.ts` — API key generation (randomBytes) and SHA-256 hashing
- `libs/sanitize.ts` — Name sanitization to `^[a-z][a-z0-9_]*$` format
- `proxy.ts` — Auth middleware (NOT Next.js `middleware.ts`) — session renewal + Bearer bypass
- `hooks/useRouteState.ts` — URL ↔ workspaceStore sync hook (engineId/projectId)
- `stores/` — Zustand stores (engineStore, requestStore, workspaceStore)
- `db/*.sql` — Schema, RLS policies, migrations
- `docs/adr/` — Architecture Decision Records (001–009)
- `@todo/` — AI-managed planning and context docs
- `bruno/` — Bruno API testing collection with environments (local, dev, staging)

### Domain model
```
Project → Engine(s) → Calc execution
```
- **Project:** Named container for engines. Selection is client-only (Zustand `workspaceStore`). No `is_active` column.
- **Engine:** Stores the full calc definition as JSONB (`EngineState`). One active per project. Has `is_active` flag. Publishing lifecycle: saved → published (immutable, `published_at` timestamp).
- **EngineState:** `{ name, config, variables[], tables[], steps[] }`
  - `config`: precision, rounding mode, min/max clamping
  - `variables`: inputs (runtime-provided) or constants (engine-fixed). Each has id + name.
  - `tables`: Lookup tables with conditions (1D/2D), parameterized tables supported
  - `steps`: Expression-based calculations with tokens (number, op, varRef, stepRef, tableRef, conditional)
- **Calc:** Executes engine with named inputs → remaps to ids → evaluates steps → returns named outputs

### DB schema (Supabase Postgres)
- `projects`: id, name (unique), deleted_at, created_at
- `engines`: id, name, engine (JSONB), is_active, project_id (nullable FK → projects), published_at (nullable), deleted_at, created_at, updated_at
  - Unique constraint: `(name, project_id)`
- `api_keys`: see `db/api_keys.sql`
- RLS: permissive (`authenticated = full access`) — known gap, will be refined in AUTHZ migration

### Two DB clients
- `services/client.ts` → SSR client (anon key + cookies) — respects RLS. Default for all services.
- `services/server.ts` → Service-role client — bypasses RLS. Only for API key validation and admin writes. Protected with `import "server-only"`.

## Conventions

- **Naming:** Names sanitized via `libs/sanitize.ts` on create/update (ADR 001)
- **Tests:** `*.test.ts` colocated next to source files, vitest
- **Soft-delete:** `deleted_at timestamptz` column — never hard-delete (ADR 004). Queries always filter `.is("deleted_at", null)`
- **Services:** Accept optional `db?: DbClient` as last param. Custom error classes with `readonly code`. Structured logging. Shared `NotFoundError` in `services/errors.ts` — services throw, route handlers catch via `instanceof`. `ERROR_CODES` constant centralises external error codes (e.g. Supabase PGRST116).
- **Routes:** Thin wrappers — `parseBody(req, Schema)` for Zod validation, call service, format response. JSDoc with `@query`, `@body`, `@returns`.
- **App folder structure:** No `components/` wrapper folders. Direct children of route folders use `_` prefix (Escola A). Deeper children are plain folders — the hierarchy is the namespace. E.g. `app/builder/_LeftContent/VariablesPanel/` not `app/builder/_LeftContent/components/VariablesPanel/`. Applies project-wide.
- **Schemas:** Zod in `schemas/api.ts` are SSOT — derive types via `z.infer<>` (ADR 003). Store types in `stores/engineStore.ts` derived via indexed access on Zod-inferred row types.
- **parseBody:** `libs/parseBody.ts` — shared helper for JSON parse + Zod validation in route handlers. Returns `{ data }` or `{ error: NextResponse }`.
- **Runtime types:** All 17 types in `libs/runtime/types.ts` derived via `z.infer<>` from `libs/runtime/schema.ts`. No manual interfaces.
- **Auth:** Dual auth — Supabase session (UI) + Bearer API key (M2M) (ADR 005)
- **Activation:** Only one engine active per project. Activation deactivates siblings. Only published engines can be activated.
- **Publishing:** `published_at` timestamp on engines. Published = immutable (no edit, no delete, no unpublish). Error classes: `EngineImmutableError` (409), `EngineNotPublishedError` (422).
- **URL-driven loading:** Builder/Calc use `?engineId` in URL (source of truth), Engines page uses `?projectId` (optional filter). `useRouteState` hook syncs URL ↔ workspaceStore. WorkspaceSelector is presentational (no own fetches). `engineStore` has granular loaders: `loadProjects()`, `loadEngines(projectId?)`, `loadEngineById(id)`.
- **listEngines semantics:** `projectId: undefined` → all engines (no filter), `null` → orphans only, `string` → by project.
- **Cache:** Only public-facing endpoints are cached (calc engine resolution, api-key validation). Internal CRUD routes hit DB directly. `"use cache"` directive with `cacheTag()`/`cacheLife()` for reads, `revalidateTag()` in service mutation functions for invalidation. Route handlers are cache-unaware. Tag constants in `libs/cache.ts`. Cached functions use `createServiceClient()` (no cookies). See `docs/api-flow.md` §6 for full details.
- **Env vars:** No Supabase variables use `NEXT_PUBLIC_` prefix — all access is server-side. Code reads `SUPABASE_URL` with fallback `?? NEXT_PUBLIC_SUPABASE_URL` during infra migration. After infra update, fallback will be removed.

## Current State

### Working
- Core calc engine (variables, tables, steps, conditions, expressions)
- Projects CRUD (list, create, update, delete, activate)
- Engines CRUD (list, create, update, delete, activate, publish)
- Calc execution (`/api/calc/[engineId]` and `/api/calc/active?projectId=X`) with name→id remap
- Schema endpoints (`/api/schema`, `/api/schemas/*`) — describe engine inputs
- API keys (basic: generate, list, revoke)
- Builder UI (visual engine editor)
- Calc test UI (execute engines interactively)
- Soft-delete (deleted_at) for projects and engines
- Bruno API testing collection with environments

### Execution Roadmap

Active @todo items in planned execution order:

| # | @todo | Size | Status | Dependencies |
|---|-------|------|--------|-------------|
| 1 | `STATE_MANAGEMENT_REFACTOR` | 🟡 ~3h | Not started | None |
| 2 | `API_KEYS_PROJECT_SCOPE` | 🟡 ~2h | Not started | None |
| 3 | `VARIABLE_VALIDATION` | 🔴 ~8h | Not started | None (benefits from #1 for Phase 2 UI) |

Completed (archived): `RENAME_DELETED_AT`, `PUBLISHED_AT`, `URL_DRIVEN_LOADING`, `CACHE`, `ZOD-SSOT`, `TYPE_SAFETY_REFINEMENTS`, `APP_BUILDER_REORGANIZING`

### Planning Items (`@todo/_planning/`)

Items not in the active queue — long-term planning, research, and deferred decisions.

**Migrations — two parallel paths under study:**

**Path A: Drizzle + Auth.js** (remove Supabase entirely)
- `_planning/DRIZZLE-MIGRATION/` — Replace Supabase query builder with Drizzle ORM (direct Postgres TCP). Services-only change.
- `_planning/AUTHJS-MIGRATION/` — Replace Supabase Auth with Auth.js v5. Depends on Drizzle migration.
- `_planning/AUTHJS_INCREMENTAL/` — RBAC, Invites, Settings, Tenant phases adapted for Auth.js + Drizzle stack.

**Path B: Stay on Supabase** (original plans)
- `_planning/SUPABASE_AUTHZ_INCREMENTAL/` — RBAC, Invites, Settings, Tenant phases using Supabase Auth + RLS.
- `_planning/SUPABASE_AUTHZ_COMPLETE/` — Full multi-tenant plan (reference architecture).

Both paths implement the same business logic (roles, invites, tenant isolation). Decision pending.

**Research / exploration:**
- `_planning/RUNTIME_REFACTOR_BRANCHING.md`
- `_planning/RUNTIME_REFACTOR_PERFORMANCE.md`

## Active Decisions (ADRs)

- **ADR 001** — Name sanitization: all names normalized to `^[a-z][a-z0-9_]*$`
- **ADR 002** — Services layer: business logic lives in `services/`, not in route handlers
- **ADR 003** — Zod schemas as SSOT: single source of truth for validation and types
- **ADR 004** — Soft-delete: `deleted_at timestamptz`, never hard-delete
- **ADR 005** — Dual auth: Supabase session + Bearer API key, proxy.ts bypasses getUser() for calc routes with Bearer
- **ADR 006** — Custom proxy instead of Next.js middleware: Supabase SSR cookie handling + Bearer bypass
- **ADR 007** — Engine state as single JSONB column: atomic reads/writes, no normalized tables
- **ADR 008** — Internal IDs, external names: runtime uses UUIDs, API uses human-friendly names
- **ADR 009** — Decimal.js for arbitrary-precision arithmetic: exact decimal math for financial calculations
- **ADR 010** — Engine publishing lifecycle: saved → published (immutable), activation guard, calc active endpoint

## Known Pitfalls

- `engines.project_id` is **nullable** — legacy data. AUTHZ migration will make it NOT NULL after backfill.
- RLS is **permissive** (`authenticated = full access`) — not a security design, known gap pending AUTHZ.
- `proxy.ts` is **not** `middleware.ts` — intentional for Supabase SSR cookie handling pattern.
- `projects.name` has a **global unique constraint** — will change to tenant-scoped in AUTHZ migration.
- Engine variables use **id internally** but **name externally** — calc service handles the remap via `remapInputsByName()`.
- `core/` (builder state) and `libs/runtime/` (execution) are **separate concerns** — don't mix them.