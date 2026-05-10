# Auth.js Incremental Authorization — Plan

> Adapted from [`../SUPABASE_AUTHZ_INCREMENTAL/`](../SUPABASE_AUTHZ_INCREMENTAL/) for a **Drizzle + Auth.js** stack.
> The Supabase-specific version is preserved for reference.
>
> **Prerequisites:** `@todo/DRIZZLE-MIGRATION/` and `@todo/AUTHJS-MIGRATION/` must be completed first.

## Overview

This plan implements authorization incrementally on top of Auth.js + Drizzle (direct Postgres), mirroring the same phased approach as the Supabase version but without any Supabase dependencies.

| # | Focus | Supabase equivalent | Status |
|---|---|---|---|
| 1 | [RBAC](#phase-1-rbac) — Global roles (admin/editor/reader) | `SUPABASE_AUTHZ_INCREMENTAL/1_RBAC.md` | ⏳ Pending |
| 2 | [INVITES](#phase-2-invites) — Email invites | `SUPABASE_AUTHZ_INCREMENTAL/2_INVITES.md` | ⏳ Pending |
| 3 | [SETTINGS](#phase-3-settings) — Management UI | `SUPABASE_AUTHZ_INCREMENTAL/3_SETTINGS.md` | ⏳ Pending |
| 4 | [TENANT](#phase-4-tenant) — Multi-tenant | `SUPABASE_AUTHZ_INCREMENTAL/4_TENANT.md` | ⏳ Future |

### Dependency chain

```
DRIZZLE-MIGRATION → AUTHJS-MIGRATION → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

### Key architectural differences from Supabase version

| Aspect | Supabase version | Auth.js + Drizzle version |
|---|---|---|
| User table | `auth.users` (Supabase internal) | `users` table in our Postgres (Drizzle schema) |
| Session | Supabase SSR cookies + `getUser()` | Auth.js JWT in httpOnly cookie + `auth()` |
| Auth middleware | Custom `proxy.ts` | Standard `middleware.ts` via Auth.js |
| DB client in auth result | `supabase: SupabaseClient` in `AuthResult` | No client — services use `db` singleton |
| Service-role bypass | `createServiceClient()` bypasses RLS | No RLS — `db` has full access, auth is app-level |
| Super admin flag | `auth.users.raw_app_meta_data.is_super_admin` | `users.is_super_admin` boolean column |
| SQL helpers for auth | `auth.uid()`, `auth.jwt()` (Supabase builtins) | `current_setting('app.user_id')` (set per-request) or app-level enforcement |

---

## Phase 1: RBAC

> Supabase equivalent: [`SUPABASE_AUTHZ_INCREMENTAL/1_RBAC.md`](../SUPABASE_AUTHZ_INCREMENTAL/1_RBAC.md)

### Goals

Introduce 3 global roles (`admin`, `editor`, `reader`) to replace the current "any authenticated user = full access" model.

### 3 roles

| Role | Permissions |
|---|---|
| `admin` | Everything — manage users, API keys, projects, engines, calculations |
| `editor` | CRUD projects/engines + calculations. No user management. |
| `reader` | View projects/engines + run calculations. No create/edit. |

Hierarchy: `reader=1 · editor=2 · admin=3`.

### API key roles

Keys are limited to `editor` or `reader` — never `admin`. Any management route (`/api/users/*`, `/api/api-keys/*`) returns `401 USER_IDENTITY_REQUIRED` if called with Bearer.

### Schema

#### `user_roles` (new table)

```sql
CREATE TABLE user_roles (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('admin', 'editor', 'reader')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Key difference from Supabase:** FK points to `users(id)` (our table), not `auth.users(id)`.

#### Drizzle schema addition (`db/schema.ts`)

```ts
export const userRoles = pgTable("user_roles", {
  userId:    uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  role:      text("role").notNull(), // admin | editor | reader
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

#### `api_keys` alteration

```sql
ALTER TABLE api_keys
  ADD COLUMN role text NOT NULL DEFAULT 'reader'
    CHECK (role IN ('editor', 'reader'));
```

#### Migration: seed existing users

```ts
// Using Drizzle — no auth.users dependency
const allUsers = await db.select({ id: users.id }).from(users)
for (const u of allUsers) {
  await db.insert(userRoles).values({ userId: u.id, role: "editor" }).onConflictDoNothing()
}
// Then manually promote admin:
await db.update(userRoles).set({ role: "admin" }).where(eq(userRoles.userId, "<admin-id>"))
```

### Types

```ts
type GlobalRole = "admin" | "editor" | "reader"
type KeyRole = "editor" | "reader"

// AuthResult evolution (post Auth.js migration)
type AuthUser = {
  kind: "user"
  userId: string
  role: GlobalRole        // eager-loaded from user_roles
}

type AuthKey = {
  kind: "key"
  apiKeyId: string
  role: KeyRole           // from api_keys.role
}

type AuthResult = AuthUser | AuthKey | null
```

**Key difference from Supabase:** No `supabase: SupabaseClient` field. Services use `db` singleton directly.

### `resolveAuth` evolution

```ts
export async function resolveAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    const raw = authHeader.slice(7)
    // Query api_keys with role using Drizzle
    const [key] = await db
      .select({ id: apiKeys.id, name: apiKeys.name, role: apiKeys.role })
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hashKey(raw)), isNull(apiKeys.deletedAt)))
      .limit(1)
    if (!key) return null
    return { kind: "key", apiKeyId: key.id, role: key.role as KeyRole }
  }

  const session = await auth()
  if (!session?.user?.id) return null

  // Eager-load role
  const [roleRow] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, session.user.id))
    .limit(1)

  if (!roleRow) return null  // no role assigned → blocked
  return { kind: "user", userId: session.user.id, role: roleRow.role as GlobalRole }
}
```

### `requireRole`

```ts
const RANK: Record<string, number> = { reader: 1, editor: 2, admin: 3 }

function requireRole(
  auth: AuthUser | AuthKey,
  minRole: GlobalRole
): { ok: true } | { ok: false; status: 401 | 403; error: string } {
  if (auth.kind === "key" && minRole === "admin") {
    return { ok: false, status: 401, error: "USER_IDENTITY_REQUIRED" }
  }
  if (RANK[auth.role] >= RANK[minRole]) return { ok: true }
  return { ok: false, status: 403, error: "INSUFFICIENT_ROLE" }
}
```

### Permission matrix

| Action | reader | editor | admin | Bearer reader | Bearer editor |
|---|:---:|:---:|:---:|:---:|:---:|
| View projects/engines | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/edit projects/engines | ❌ | ✅ | ✅ | ❌ | ✅ |
| Activate project/engine | ❌ | ✅ | ✅ | ❌ | ✅ |
| Run calculations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/revoke API keys | ❌ | ✅ | ✅ | ❌ | ❌ |
| Manage user roles | ❌ | ❌ | ✅ | ❌ | ❌ |
| Invite users (Phase 2) | ❌ | ❌ | ✅ | ❌ | ❌ |

### Endpoints

| Method | Route | Auth | Min role | Errors |
|---|---|---|---|---|
| `GET /api/users` | user | admin | 403 |
| `GET /api/users/[id]/role` | user | admin | 403, 404 |
| `PATCH /api/users/[id]/role` | user | admin | 400, 403, 404, 409 `CANNOT_MODIFY_OWN_ROLE` |

**Key difference from Supabase:** User emails come from `users` table directly (Drizzle query), not from `createAdminClient()` accessing Supabase's `auth` schema.

### Enforcement: app-level (not RLS)

RLS is not used (direct Postgres connection). All role checks happen in route handlers via `requireRole()`. This is consistent with the Supabase version's decision to defer RLS to the tenant phase.

### Verification

Same as Supabase version — see `SUPABASE_AUTHZ_INCREMENTAL/1_RBAC.md §Verification`.

---

## Phase 2: INVITES

> Supabase equivalent: [`SUPABASE_AUTHZ_INCREMENTAL/2_INVITES.md`](../SUPABASE_AUTHZ_INCREMENTAL/2_INVITES.md)

### Goals

Enable admin-controlled user onboarding via email invites, closing the loop so new users don't require SQL.

### Flow

1. Admin picks email + role → POST creates invite → email fires (or admin copies URL from response).
2. Recipient clicks link → public landing → logs in if needed → accepts.
3. Accept creates row in `user_roles` with the invite's role and sets `accepted_at`.

### Schema

#### `invites` (new table)

```sql
CREATE TABLE invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('editor', 'reader')),
  token_hash  text UNIQUE NOT NULL,
  invited_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX invites_pending_unique ON invites (email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
```

**Key difference from Supabase:** `invited_by` FK points to `users(id)`, not `auth.users(id)`.

#### Drizzle schema addition

```ts
export const invites = pgTable("invites", {
  id:         uuid("id").primaryKey().defaultRandom(),
  email:      text("email").notNull(),
  role:       text("role").notNull(),
  tokenHash:  text("token_hash").unique().notNull(),
  invitedBy:  uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  revokedAt:  timestamp("revoked_at", { withTimezone: true }),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

### Key decisions (same as Supabase version)

- **Token:** sha256 hash stored, raw never persisted
- **Expiration:** 7 days
- **Uniqueness:** one pending invite per email (partial unique index)
- **Resend:** `force: true` in POST body revokes pending + inserts new
- **Accept requires matching email:** case-insensitive comparison
- **Roles via invite:** `editor` or `reader` only (`admin` → 403)
- **Accept on superior role:** blocked (`409 INVITE_WOULD_DEMOTE_USER`)

### Middleware update

`middleware.ts` must allow public access to invite routes:
- `GET /api/invites/[token]` — public endpoint
- `app/invites/[token]` — public landing page

```ts
// In middleware.ts auth callback, add before the auth check:
if (pathname.startsWith("/api/invites/") || pathname.startsWith("/invites/")) {
  // Public invite routes — some sub-routes need auth (accept), handled in handler
  return NextResponse.next()
}
```

### Endpoints

Same contract as Supabase version. Key implementation difference: all DB operations use `db` (Drizzle) instead of service-role Supabase client.

| Method | Route | Auth | Errors |
|---|---|---|---|
| `GET /api/invites` | user, admin | 403 |
| `POST /api/invites` | user, admin | 400, 403, 409 |
| `DELETE /api/invites/[id]` | user, admin | 403, 404 |
| `GET /api/invites/[token]` | **public** | 404, 410 |
| `POST /api/invites/[token]/accept` | user (any) | 400, 404, 409, 410 |

### Verification

Same as Supabase version — see `SUPABASE_AUTHZ_INCREMENTAL/2_INVITES.md §Verification`.

---

## Phase 3: SETTINGS

> Supabase equivalent: [`SUPABASE_AUTHZ_INCREMENTAL/3_SETTINGS.md`](../SUPABASE_AUTHZ_INCREMENTAL/3_SETTINGS.md)

### Goals

Deliver management UI so admins can manage users, API keys, and invites without Bruno or SQL.

### `getSessionContext()` — Auth.js version

```ts
// lib/session.ts
import { auth } from "@/auth"
import { db } from "@/services/client"
import { userRoles } from "@/db/schema"
import { eq } from "drizzle-orm"

type Session = {
  user: { id: string; email: string | null }
  role: GlobalRole
}

async function getSessionContext(): Promise<Session | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const [roleRow] = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, session.user.id))
    .limit(1)

  if (!roleRow) return null  // no role = no access
  return {
    user: { id: session.user.id, email: session.user.email ?? null },
    role: roleRow.role as GlobalRole,
  }
}
```

**Key difference from Supabase:** Uses `auth()` from Auth.js instead of `supabase.auth.getUser()`. Role loaded from `user_roles` table via Drizzle.

### Components (same as Supabase version)

| Component | Purpose |
|---|---|
| `SessionHydrator` | Hydrates `roleStore` from SSR `Session` |
| `PermissionGate` | Client guard: renders children if `RANK[role] >= RANK[minRole]` |
| `stores/roleStore.ts` | Client store (no persist) for role state |

### Pages

| Page | Access |
|---|---|
| `app/(authed)/settings/users/page.tsx` | admin |
| `app/(authed)/settings/api-keys/page.tsx` | editor+ |
| `app/(authed)/settings/invites/page.tsx` | admin |

### Logout cleanup

Auth.js handles session cleanup automatically. For `workspaceStore` (uses localStorage persist), cleanup on signOut:

```ts
// In the signOut flow (client-side):
import { signOut } from "next-auth/react"

async function handleLogout() {
  useWorkspaceStore.getState().reset()
  await signOut({ redirectTo: "/login" })
}
```

### Verification

Same as Supabase version — see `SUPABASE_AUTHZ_INCREMENTAL/3_SETTINGS.md §Verification`.

---

## Phase 4: TENANT

> Supabase equivalent: [`SUPABASE_AUTHZ_INCREMENTAL/4_TENANT.md`](../SUPABASE_AUTHZ_INCREMENTAL/4_TENANT.md)
> Detailed contracts: [`../SUPABASE_AUTHZ_COMPLETE/AUTHZ_TENANT.md`](../SUPABASE_AUTHZ_COMPLETE/AUTHZ_TENANT.md)

### Goals

Isolate data between clients. Each tenant has its own projects, engines, API keys, and members.

### What changes from Phases 1–3

| Phase 1–3 (global) | Phase 4 (tenant-scoped) |
|---|---|
| `user_roles(user_id, role)` | `tenant_members(tenant_id, user_id, role)` |
| `GlobalRole` = `admin/editor/reader` | `Role` = `owner/manager/editor/reader` + `is_super_admin` on `users` |
| `invites(email, role)` | `tenant_invites(tenant_id, email, role)` with token hash |
| `api_keys` without `tenant_id` | `api_keys` with `tenant_id` + `created_by` |
| `projects` without `tenant_id` | `projects` with `tenant_id NOT NULL` |
| App-level enforcement only | App-level enforcement (optionally + RLS via `set_config`) |

### Super admin — Auth.js approach

In the Supabase version, super admin is stored in `auth.users.raw_app_meta_data.is_super_admin`. With Auth.js, we use a **boolean column on the `users` table**:

```sql
ALTER TABLE users ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;
```

Drizzle schema:
```ts
// Add to users table definition
isSuperAdmin: boolean("is_super_admin").notNull().default(false),
```

### RLS strategy — two options

Since we connect directly to Postgres (no Supabase PostgREST), we have two approaches:

#### Option A: App-level enforcement only (recommended for simplicity)

All authorization checks in route handlers via `requireTenantRole()` / `requireTenantAccess()`. No RLS policies.

**Pros:** Simpler, no need for per-request `SET` commands, easier to debug.
**Cons:** Every route must remember to filter by tenant. A missed filter = data leak.

#### Option B: RLS via `set_config` per request

Set `app.user_id` and `app.tenant_id` at the start of each request, then RLS policies read these via `current_setting()`.

```ts
// In middleware or per-request setup:
await db.execute(sql`
  SELECT set_config('app.user_id', ${userId}, true),
         set_config('app.tenant_id', ${tenantId}, true)
`)
```

RLS policies then use:
```sql
CREATE POLICY tenant_isolation ON projects
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Pros:** Defense in depth — even if app code forgets a filter, RLS catches it.
**Cons:** More complex, `set_config` must happen on every request, transaction scoping needs care.

**Decision:** To be made at execution time. Option A is the pragmatic starting point; Option B can be layered on later.

### SQL helpers

Replacing Supabase's `auth.uid()` built-in:

| Supabase | Auth.js + Drizzle |
|---|---|
| `auth.uid()` | `current_setting('app.user_id')::uuid` (if using Option B) |
| `is_super_admin(caller_id)` reading `app_metadata` | `SELECT is_super_admin FROM users WHERE id = caller_id` |
| `has_tenant_role(caller_id, tenant_id, min_role)` | Same SQL function, but references `users` table for super admin check |

### New tables

| Table | Purpose |
|---|---|
| `tenants` | Workspace: `id`, `name`, `owner_id` → `users(id)`, `billing_id` → `users(id)`, `deleted_at` |
| `tenant_members` | Replaces `user_roles` scoped: `(tenant_id, user_id)` PK + `role` |
| `tenant_invites` | Replaces `invites` scoped: `tenant_id`, `email`, `role`, `token_hash`, `expires_at` |

### Mutations via RPCs or service functions

The Supabase version uses `security definer` RPCs called via `createAdminClient().rpc(...)`. With Drizzle, two approaches:

1. **Keep RPCs in Postgres** — call via `db.execute(sql\`SELECT create_tenant(...)\`)`. Invariants enforced in SQL.
2. **Move logic to service functions** — TypeScript functions in `services/tenants.ts` with Drizzle transactions. Invariants enforced in code.

**Recommendation:** Option 2 (service functions) — consistent with the existing services pattern (ADR 002), easier to test, and all business logic stays in TypeScript.

### Types

```ts
type AuthUser = {
  kind: "user"
  userId: string
  isSuperAdmin: boolean
}

type AuthTenantKey = {
  kind: "tenant_key"
  tenantId: string
  role: "reader" | "editor"
  apiKeyId: string
}

type Auth = AuthUser | AuthTenantKey
```

### Migration (existing data)

Same sequence as Supabase version, but simpler since we already own the `users` table:

1. Add `is_super_admin` column to `users` (default false).
2. Set super admin for primary user.
3. Create "Default" tenant + initial membership.
4. Backfill `projects.tenant_id`.
5. Backfill memberships from `user_roles` → `tenant_members`.
6. Backfill invites from `invites` → `tenant_invites`.
7. Backfill `api_keys.tenant_id`.
8. Apply `NOT NULL` constraints.
9. Deprecate `user_roles` and `invites`.

### UI components

Same as Supabase version: `TenantSelector`, evolved `SessionHydrator`, `tenantStore`, expanded Settings pages.

### Verification

Same as Supabase version — see `SUPABASE_AUTHZ_INCREMENTAL/4_TENANT.md §Verification`.

---

## Estimated effort

| Phase | Effort |
|---|---|
| Phase 1: RBAC | 2–3 days |
| Phase 2: INVITES | 2–3 days |
| Phase 3: SETTINGS | 3–4 days |
| Phase 4: TENANT | 5–8 days |
| **Total** | **12–18 days** |

Phases are independently deployable. Each delivers value on its own.