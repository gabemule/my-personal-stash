# Drizzle Migration — Plan

## Context

The data layer currently uses the Supabase query builder (`@supabase/supabase-js` + `@supabase/ssr`) to interact with Postgres via Supabase's PostgREST HTTP API. This creates a dependency on Supabase as a service — the DB is standard Postgres, but the access layer is proprietary.

Thanks to ADR 002 (services layer), the Supabase coupling is contained in ~5 service files and 2 lib files. The architecture already has the right seam for swapping the data layer.

This migration replaces the Supabase query builder with **Drizzle ORM** connecting directly to Postgres via TCP pool. Auth remains on Supabase (migrated separately in `@todo/AUTHJS-MIGRATION/`).

## Goals

1. Replace Supabase query builder with Drizzle ORM in all service files
2. Connect directly to Postgres (TCP pool via `pg`) instead of PostgREST HTTP API
3. Define schema-as-code in TypeScript (`db/schema.ts`)
4. Remove `services/server.ts` (no more SSR/service-role distinction)
5. Protect `services/client.ts` with `server-only`
6. Remove `db?: DbClient` optional parameter from all service functions (singleton)
7. Maintain all existing functionality — zero behavior change

## Scope

### In scope
- `db/schema.ts` — new Drizzle schema (projects, engines, api_keys)
- `services/client.ts` — Drizzle pool singleton + `server-only`
- `services/server.ts` → **deleted**
- `services/engines.ts` — rewrite ~8 queries to Drizzle
- `services/projects.ts` — rewrite ~7 queries to Drizzle
- `services/api-keys.ts` — rewrite ~4 queries to Drizzle
- `services/client.test.ts`, `services/server.test.ts` — update/replace mocks
- `services/engines.test.ts`, `services/projects.test.ts` — update mocks
- Route handlers that pass `auth.supabase` to services — adjust to use `db` import
- Environment: add `DATABASE_URL`, keep Supabase envs for auth

### Out of scope
- `proxy.ts` — stays (Supabase Auth still active)
- `services/auth.ts` — stays (uses `supabase.auth.getUser()` via Supabase Auth)
- `libs/supabase/client.ts` — stays temporarily (still needed by proxy + auth)
- `libs/supabase/server.ts` — stays temporarily (still needed by auth's `resolveAuth`)
- Login/logout routes — stay (Supabase Auth)
- `services/calc.ts` — stays (pure functions, zero DB)
- Auth.js migration (separate `@todo/AUTHJS-MIGRATION/`)

## Decisions

### D1: Drizzle over alternatives
- **Drizzle** chosen over Kysely (less SQL-like API for team familiarity) and raw SQL (no type safety)
- Schema-as-code in TypeScript aligns with ADR 003 (Zod-centric, everything TS)
- Query builder chain pattern is closest to current Supabase usage

### D2: Singleton `db` instead of injected client
- Current pattern: `db?: DbClient` param on every function, default to `await createClient()`
- New pattern: import `db` singleton directly from `services/client.ts`
- Rationale: no more SSR/service-role distinction, no need for per-request client
- Testing: can mock the module (`vi.mock("@/services/client")`) — same pattern as today

### D3: `server-only` on client.ts
- Drizzle uses TCP pool — cannot run in browser
- `import "server-only"` gives build-time error instead of runtime crash
- Replaces the protection that was previously on `services/server.ts` only

### D4: Keep Supabase libs temporarily
- `libs/supabase/client.ts` and `libs/supabase/server.ts` stay until Auth.js migration
- They are only used by `proxy.ts`, `services/auth.ts`, and `app/api/auth/` routes
- Clean removal happens in AUTHJS-MIGRATION

## Packages

```bash
# Add
yarn add drizzle-orm pg
yarn add -D drizzle-kit @types/pg

# Remove (only after AUTHJS-MIGRATION completes)
# yarn remove @supabase/supabase-js @supabase/ssr
```

## File-by-file transformation

### `db/schema.ts` (NEW)

Drizzle schema mirroring current SQL:

```ts
import { pgTable, uuid, text, boolean, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core"

export const projects = pgTable("projects", {
  id:         uuid("id").primaryKey().defaultRandom(),
  name:       text("name").notNull().unique(),
  isActive:   boolean("is_active").notNull().default(false),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const engines = pgTable("engines", {
  id:         uuid("id").primaryKey().defaultRandom(),
  name:       text("name").notNull(),
  engine:     jsonb("engine").notNull(),
  isActive:   boolean("is_active").notNull().default(false),
  projectId:  uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("engines_name_project_unique").on(t.name, t.projectId),
])

export const apiKeys = pgTable("api_keys", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  keyHash:   text("key_hash").unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("api_keys_active_idx").on(t.id).where(sql`deleted_at is null`),
])
```

### `services/client.ts` (REWRITE)

```ts
import "server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "@/db/schema"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const db = drizzle(pool, { schema })
export type DbClient = typeof db
```

### `services/server.ts` → DELETED

### `services/engines.ts` (REWRITE)

Replace Supabase chain queries with Drizzle equivalents:
- `client.from("engines").select("*").is("disabled_at", null)` → `db.select().from(engines).where(isNull(engines.disabledAt))`
- `client.from("engines").insert({...}).select().single()` → `db.insert(engines).values({...}).returning()`
- `client.from("engines").update({...}).eq("id", id).select().single()` → `db.update(engines).set({...}).where(eq(engines.id, id)).returning()`
- Error code `23505` check → catch `DatabaseError` with code `23505`

### `services/projects.ts` (REWRITE)

Same pattern as engines. Key differences:
- `ilike("name", name)` → `ilike(projects.name, name)` (Drizzle has `ilike` operator)

### `services/api-keys.ts` (REWRITE)

- Replace `createServiceClient()` calls with direct `db` import
- Same query pattern translation

### Route handlers (MINOR CHANGES)

Routes that use `resolveAuth` and pass `auth.supabase` to services:
- `resolveAuth` will temporarily still return `{ supabase }` for auth checks
- Services no longer accept `db` param — they use singleton
- Remove the `auth.supabase` → service delegation pattern

### Tests (UPDATE)

- Mock `@/services/client` module (export `db`) instead of mocking Supabase client
- Or: use Drizzle's test utilities with in-memory/transaction pattern

## Phases

### Phase 1: Setup (~30min)
- Install packages (`drizzle-orm`, `pg`, `drizzle-kit`, `@types/pg`)
- Create `db/schema.ts`
- Create `drizzle.config.ts`
- Add `DATABASE_URL` to `.env.local`

### Phase 2: Client swap (~30min)
- Rewrite `services/client.ts` (Drizzle singleton + `server-only`)
- Delete `services/server.ts`
- Update `DbClient` type export

### Phase 3: Service rewrites (~2-3h)
- `services/engines.ts` — 8 functions
- `services/projects.ts` — 7 functions
- `services/api-keys.ts` — 4 functions

### Phase 4: Route handler adjustments (~1h)
- Remove `auth.supabase` passing pattern from calc/schema routes
- Ensure `resolveAuth` still works for Bearer validation

### Phase 5: Tests (~1-2h)
- Update service test mocks
- Run full test suite
- Manual smoke test via Bruno

### Phase 6: Cleanup & docs (~30min)
- Remove `services/server.ts` references
- Verify no `@supabase/supabase-js` imports remain in services
- Update `docs/adr/002-services-layer.md` — document Drizzle as the data access layer (replaces Supabase query builder references, explains singleton `db` pattern, removes `db?: DbClient` injection pattern)
- Update `@todo/CONTEXT.md`

**Total estimated effort: 1-2 days**