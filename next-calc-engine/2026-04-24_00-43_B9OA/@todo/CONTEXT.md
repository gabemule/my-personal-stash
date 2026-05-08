# CONTEXT.md — Project Knowledge Base

> Maintained by AI for context recovery between sessions.
> Last updated: 2026-05-08

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
- `stores/` — Zustand stores (engineStore, requestStore, workspaceStore)
- `db/*.sql` — Schema, RLS policies, migrations
- `docs/adr/` — Architecture Decision Records (001–009)
- `@todo/` — AI-managed planning and context docs
- `bruno/` — Bruno API testing collection with environments (local, dev, staging)

### Domain model
```
Project → Engine(s) → Calc execution
```
- **Project:** Named container for engines. One active at a time (per scope). Has `is_active` flag.
- **Engine:** Stores the full calc definition as JSONB (`EngineState`). One active per project. Has `is_active` flag.
- **EngineState:** `{ name, config, variables[], tables[], steps[] }`
  - `config`: precision, rounding mode, min/max clamping
  - `variables`: inputs (runtime-provided) or constants (engine-fixed). Each has id + name.
  - `tables`: Lookup tables with conditions (1D/2D), parameterized tables supported
  - `steps`: Expression-based calculations with tokens (number, op, varRef, stepRef, tableRef, conditional)
- **Calc:** Executes engine with named inputs → remaps to ids → evaluates steps → returns named outputs

### DB schema (Supabase Postgres)
- `projects`: id, name (unique), is_active, disabled_at, created_at
- `engines`: id, name, engine (JSONB), is_active, project_id (nullable FK → projects), disabled_at, created_at, updated_at
  - Unique constraint: `(name, project_id)`
- `api_keys`: see `db/api_keys.sql`
- RLS: permissive (`authenticated = full access`) — known gap, will be refined in AUTHZ migration

### Two DB clients
- `services/client.ts` → SSR client (anon key + cookies) — respects RLS. Default for all services.
- `services/server.ts` → Service-role client — bypasses RLS. Only for API key validation and admin writes. Protected with `import "server-only"`.

## Conventions

- **Naming:** Names sanitized via `libs/sanitize.ts` on create/update (ADR 001)
- **Tests:** `*.test.ts` colocated next to source files, vitest
- **Soft-delete:** `disabled_at timestamptz` column — never hard-delete (ADR 004). Queries always filter `.is("disabled_at", null)`
- **Services:** Accept optional `db?: DbClient` as last param. Custom error classes with `readonly code`. Structured logging.
- **Routes:** Thin wrappers — validate input, call service, format response. JSDoc with `@query`, `@body`, `@returns`.
- **Schemas:** Zod in `schemas/api.ts` are SSOT — derive types via `z.infer<>` (ADR 003)
- **Auth:** Dual auth — Supabase session (UI) + Bearer API key (M2M) (ADR 005)
- **Activation:** Only one engine active per project, only one project active per scope. Activation deactivates siblings.

## Current State

### Working
- Core calc engine (variables, tables, steps, conditions, expressions)
- Projects CRUD (list, create, update, delete, activate)
- Engines CRUD (list, create, update, delete, activate)
- Calc execution (`/api/calc/[engineId]`) with name→id remap
- Schema endpoints (`/api/schema`, `/api/schemas/*`) — describe engine inputs
- API keys (basic: generate, list, revoke)
- Builder UI (visual engine editor)
- Calc test UI (execute engines interactively)
- Soft-delete (disabled_at) for projects and engines
- Bruno API testing collection with environments

### Execution Roadmap

Active @todo items in planned execution order:

| # | @todo | Size | Status | Dependencies |
|---|-------|------|--------|-------------|
| 1 | `RENAME_DELETED_AT` | 🟢 ~40 min | Not started | None |
| 2 | `PUBLISHED_AT` | 🟡 ~2h | Not started | #1 |
| 3 | `URL_DRIVEN_LOADING` | 🟡 ~2h | Not started | None |
| 4 | `CACHE` | 🟡 ~3.5h | Not started | Benefits from #2 |
| 5 | `ZOD-SSOT` | 🔴 ~6h | Not started | None (horizontal refactor — done after features stabilize) |
| 6 | `API_KEYS_PROJECT_SCOPE` | 🟡 ~2h | Not started | Benefits from #5 |
| 7 | `APP_BUILDER_REORGANIZING` | 🟢 ~1.5h | Not started | None |

Standalone exploration docs (not sequenced): `RUNTIME_REFACTOR_BRANCHING`, `RUNTIME_REFACTOR_PERFORMANCE`

### Planned migrations — deferred (two parallel paths under study)

**Path A: Drizzle + Auth.js** (remove Supabase entirely)
- `@todo/DRIZZLE-MIGRATION/` — Replace Supabase query builder with Drizzle ORM (direct Postgres TCP). Services-only change.
- `@todo/AUTHJS-MIGRATION/` — Replace Supabase Auth with Auth.js v5. Depends on Drizzle migration.
- `@todo/AUTHJS_INCREMENTAL/` — RBAC, Invites, Settings, Tenant phases adapted for Auth.js + Drizzle stack.

**Path B: Stay on Supabase** (original plans)
- `@todo/SUPABASE_AUTHZ_INCREMENTAL/` — RBAC, Invites, Settings, Tenant phases using Supabase Auth + RLS.
- `@todo/SUPABASE_AUTHZ_COMPLETE/` — Full multi-tenant plan (reference architecture).

Both paths implement the same business logic (roles, invites, tenant isolation). Decision pending.

## Active Decisions (ADRs)

- **ADR 001** — Name sanitization: all names normalized to `^[a-z][a-z0-9_]*$`
- **ADR 002** — Services layer: business logic lives in `services/`, not in route handlers
- **ADR 003** — Zod schemas as SSOT: single source of truth for validation and types
- **ADR 004** — Soft-delete: `disabled_at timestamptz`, never hard-delete
- **ADR 005** — Dual auth: Supabase session + Bearer API key, proxy.ts bypasses getUser() for calc routes with Bearer
- **ADR 006** — Custom proxy instead of Next.js middleware: Supabase SSR cookie handling + Bearer bypass
- **ADR 007** — Engine state as single JSONB column: atomic reads/writes, no normalized tables
- **ADR 008** — Internal IDs, external names: runtime uses UUIDs, API uses human-friendly names
- **ADR 009** — Decimal.js for arbitrary-precision arithmetic: exact decimal math for financial calculations

## Known Pitfalls

- `engines.project_id` is **nullable** — legacy data. AUTHZ migration will make it NOT NULL after backfill.
- RLS is **permissive** (`authenticated = full access`) — not a security design, known gap pending AUTHZ.
- `proxy.ts` is **not** `middleware.ts` — intentional for Supabase SSR cookie handling pattern.
- `disabled_at` (not `deleted_at`) is the soft-delete column name — engines and projects use this.
- `projects.name` has a **global unique constraint** — will change to tenant-scoped in AUTHZ migration.
- Engine variables use **id internally** but **name externally** — calc service handles the remap via `remapInputsByName()`.
- `core/` (builder state) and `libs/runtime/` (execution) are **separate concerns** — don't mix them.