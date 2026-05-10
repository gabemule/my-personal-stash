# Auth.js Migration — Plan

## Context

Authentication currently relies on **Supabase Auth** (`@supabase/ssr` + `@supabase/supabase-js`), which handles:
- User session management via cookies (SSR pattern)
- Password-based login (`signInWithPassword`)
- Session renewal on every request (`proxy.ts` calls `supabase.auth.getUser()`)
- Bearer API key bypass for M2M calc routes

This auth layer is woven across `proxy.ts`, `services/auth.ts`, `libs/supabase/client.ts`, `libs/supabase/server.ts`, and the login/logout route handlers.

This migration replaces Supabase Auth with **Auth.js v5** (formerly NextAuth.js), using the Postgres database (via Drizzle) for user storage and JWT for sessions.

**Prerequisite:** The Drizzle migration (`@todo/DRIZZLE-MIGRATION/`) must be completed first, as Auth.js will use the same Drizzle `db` instance.

## Goals

1. Replace Supabase Auth with Auth.js v5 for all authentication flows
2. Use Credentials provider (email/password) with bcrypt hashing
3. Use JWT session strategy (stateless, no DB session table needed)
4. Replace custom `proxy.ts` with standard Next.js `middleware.ts` using Auth.js
5. Maintain Bearer API key bypass for calc routes (ADR 005)
6. Remove all Supabase dependencies (`@supabase/supabase-js`, `@supabase/ssr`)
7. Create `users` table in Postgres for credential storage

## Scope

### In scope
- `auth.ts` (project root) — **NEW** Auth.js configuration
- `middleware.ts` — **NEW** Auth.js middleware (replaces `proxy.ts`)
- `db/schema.ts` — add `users` table
- `services/auth.ts` — **REWRITE** `requireUser()` and `resolveAuth()` to use `auth()`
- `app/api/auth/[...nextauth]/route.ts` — **NEW** Auth.js catch-all handler
- `app/api/auth/login/route.ts` — **DELETED** (Auth.js handles login)
- `app/api/auth/logout/route.ts` — **DELETED** (Auth.js handles logout)
- `app/login/page.tsx` — **MODIFY** to use Auth.js `signIn`
- `proxy.ts` — **DELETED**
- `libs/supabase/client.ts` — **DELETED**
- `libs/supabase/server.ts` — **DELETED**
- `libs/supabase/` directory — **DELETED**
- Environment cleanup: remove Supabase envs, add `AUTH_SECRET`
- Remove packages: `@supabase/supabase-js`, `@supabase/ssr`

### Out of scope
- Service files (engines, projects, api-keys) — already migrated to Drizzle
- `services/calc.ts` — pure functions, no auth dependency
- OAuth providers (Google, GitHub, etc.) — can be added later
- Email verification flow — can be added later
- Password reset flow — can be added later

## Decisions

### D1: Auth.js v5 over custom JWT
- **Auth.js** chosen over rolling our own JWT+bcrypt solution
- Rationale: mature library, handles edge cases (CSRF, token rotation), well-integrated with Next.js App Router
- Credentials provider supports email/password login (same UX as today)
- Can add OAuth providers later without architecture changes

### D2: JWT session strategy (not database sessions)
- JWT stored in httpOnly cookie — no `sessions` table needed
- Stateless: no DB lookup on every request (faster than Supabase's `getUser()` round-trip)
- Trade-off: can't revoke individual sessions server-side (acceptable for current scale)
- If needed later, can switch to database sessions with Drizzle adapter

### D3: Drizzle adapter for user storage
- Auth.js has an official `@auth/drizzle-adapter` package
- Users table in same Postgres DB as everything else
- No separate auth service/database

### D4: Seed users via migration script
- Current users exist in Supabase Auth — need to be migrated to local `users` table
- Create a one-time migration script that:
  1. Exports user emails from Supabase Auth dashboard
  2. Inserts them into `users` table with bcrypt-hashed passwords
  3. Or: reset passwords for all users on first login

### D5: `resolveAuth` return type changes
- Current: returns `{ supabase: DbClient; apiKeyId?: string }`
- New: returns `{ userId: string } | { apiKeyId: string } | null`
- No more `supabase` client in auth result — services use singleton `db`
- Route handlers that destructured `auth.supabase` need adjustment

### D6: ADR 006 superseded
- ADR 006 (custom proxy instead of Next.js middleware) was motivated by Supabase SSR cookie handling
- With Auth.js, we use standard `middleware.ts` — ADR 006 should be marked as superseded

## File-by-file transformation

### `auth.ts` (NEW — project root)

```ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/services/client"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (!user) return null
        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
})
```

### `middleware.ts` (NEW — replaces `proxy.ts`)

```ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Auth routes managed by Auth.js
  if (pathname.startsWith("/api/auth/")) return NextResponse.next()

  // Calc routes with Bearer: skip auth (validated in handler via api_keys)
  const authHeader = req.headers.get("authorization")
  if (pathname.startsWith("/api/calc/") && authHeader?.startsWith("Bearer ")) {
    return NextResponse.next()
  }

  // Unauthenticated → redirect to login
  if (!req.auth && pathname !== "/login") {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Authenticated on login page → redirect to home
  if (req.auth && pathname === "/login") {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

### `db/schema.ts` (ADD `users` table)

```ts
export const users = pgTable("users", {
  id:           uuid("id").primaryKey().defaultRandom(),
  email:        text("email").notNull().unique(),
  name:         text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

### `services/auth.ts` (REWRITE)

```ts
import "server-only"
import { auth } from "@/auth"
import { NextRequest } from "next/server"
import { validateApiKey } from "@/services/api-keys"

export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED" as const
  constructor() { super("UNAUTHENTICATED") }
}

export async function requireUser() {
  const session = await auth()
  if (!session?.user) throw new UnauthenticatedError()
  return session.user
}

export type AuthResult =
  | { apiKeyId: string }
  | { userId: string }
  | null

export async function resolveAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    const raw = authHeader.slice(7)
    const apiKey = await validateApiKey(raw)
    if (!apiKey) return null
    return { apiKeyId: apiKey.id }
  }

  const session = await auth()
  if (!session?.user?.id) return null
  return { userId: session.user.id }
}
```

### `app/api/auth/[...nextauth]/route.ts` (NEW)

```ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### `app/login/page.tsx` (MODIFY)

Replace Supabase login call with Auth.js `signIn`:
- Client-side: `signIn("credentials", { email, password, redirectTo: "/" })`
- Or server action using `signIn` from `@/auth`

### Files DELETED
- `proxy.ts`
- `libs/supabase/client.ts`
- `libs/supabase/server.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`

## Packages

```bash
# Add
yarn add next-auth@beta @auth/drizzle-adapter bcryptjs
yarn add -D @types/bcryptjs

# Remove
yarn remove @supabase/supabase-js @supabase/ssr
```

## Environment variables

```env
# Remove
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Add
AUTH_SECRET=...  # Generate with: openssl rand -base64 32
# DATABASE_URL already added in Drizzle migration
```

## Phases

### Phase 1: Setup (~30min)
- Install packages (`next-auth@beta`, `@auth/drizzle-adapter`, `bcryptjs`)
- Add `users` table to `db/schema.ts`
- Run migration to create `users` table
- Seed initial users (bcrypt-hashed passwords)
- Generate and add `AUTH_SECRET` to `.env.local`

### Phase 2: Auth.js config (~1h)
- Create `auth.ts` (root) with Credentials provider + Drizzle adapter
- Create `app/api/auth/[...nextauth]/route.ts`
- Test login flow in isolation

### Phase 3: Middleware swap (~1h)
- Create `middleware.ts` (Auth.js middleware)
- Delete `proxy.ts`
- Update `next.config.ts` if needed (remove proxy references)
- Verify redirect flows (unauthenticated → login, authenticated on login → home)

### Phase 4: Services auth rewrite (~1h)
- Rewrite `services/auth.ts` (`requireUser`, `resolveAuth`)
- Update route handlers that use `resolveAuth` (calc, schema routes)
- Verify Bearer API key bypass still works

### Phase 5: Login page (~30min)
- Update `app/login/page.tsx` to use Auth.js `signIn`
- Delete `app/api/auth/login/route.ts`
- Delete `app/api/auth/logout/route.ts`

### Phase 6: Cleanup (~30min)
- Delete `libs/supabase/client.ts` and `libs/supabase/server.ts`
- Remove `@supabase/supabase-js` and `@supabase/ssr` from dependencies
- Remove Supabase env vars
- Mark ADR 006 as superseded (add note at top)
- Update `@todo/CONTEXT.md`

**Total estimated effort: 3-5 days**

## Migration strategy for existing users

Options (decide before execution):

1. **Password reset for all users** — simplest. Send email with reset link on migration day. Users set new password on first login.
2. **Export + import** — export emails from Supabase Auth dashboard, create `users` rows with temporary passwords, force password change on first login.
3. **Dual auth period** — run both Supabase Auth and Auth.js in parallel for a transition period. More complex but zero-downtime. Probably overkill for current user count.