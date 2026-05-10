# HIDE_SUPABASE_URL — Plan

## Context

`NEXT_PUBLIC_SUPABASE_URL` exposes the Supabase URL in the Next.js client bundle. No client-side code needs it — all Supabase access is server-side (SSR client, service-role client, proxy, auth routes). Renaming to `SUPABASE_URL` removes this unnecessary exposure.

## Goals

1. Code reads `SUPABASE_URL` as preference, falling back to `NEXT_PUBLIC_SUPABASE_URL` for backward compatibility during infra migration
2. Local `.env` files define `SUPABASE_URL` (keeping `NEXT_PUBLIC_SUPABASE_URL` temporarily)
3. Docs updated to reflect the new convention

## Scope

**In:** Phase 1 — code accepts both envs with fallback
**Out:** Phase 2 (cleanup — remove fallback + `NEXT_PUBLIC_SUPABASE_URL`) will be done after infra env update

## Decisions

- Fallback pattern: `process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL` (already used in `db/migrations/`)
- No centralized helper — inline fallback in each file is simpler. In Phase 2 the fallback is removed and it becomes just `process.env.SUPABASE_URL!`

## Phases

### Phase 1 — Code with fallback (now)
1. Update source files (5 files): `libs/supabase/client.ts`, `libs/supabase/server.ts`, `proxy.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`
2. Update env files: `.env.example`, `.env`, `.env.local`, `.env.development`
3. Update docs: `README.md`, `db/migrations/README.md`
4. Verify: `yarn tsc --noEmit` + `yarn test`
5. Update `@todo/CONTEXT.md`

### Phase 2 — Cleanup (after infra update)
- Remove fallback `?? process.env.NEXT_PUBLIC_SUPABASE_URL` from all files
- Remove `NEXT_PUBLIC_SUPABASE_URL` from `.env` files
- Simplify migration script fallback
