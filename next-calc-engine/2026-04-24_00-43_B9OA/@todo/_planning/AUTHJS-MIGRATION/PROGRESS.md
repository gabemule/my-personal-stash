# Auth.js Migration — Progress

**Status:** 0/13 items · Phase: Not started
**Prerequisite:** Drizzle Migration must be completed first.

## Current Focus
Not started yet. Waiting for Drizzle Migration to complete.
Next step: Install Auth.js packages and add `users` table to schema
Blocker: Drizzle Migration (`@todo/DRIZZLE-MIGRATION/`) must be done first

## Progress

### Phase 1: Setup
- [ ] Install packages (`next-auth@beta`, `@auth/drizzle-adapter`, `bcryptjs`)
- [ ] Add `users` table to `db/schema.ts`
- [ ] Run migration to create `users` table + seed initial users
- [ ] Generate and add `AUTH_SECRET` to `.env.local`

### Phase 2: Auth.js config
- [ ] Create `auth.ts` (root) with Credentials provider + Drizzle adapter
- [ ] Create `app/api/auth/[...nextauth]/route.ts`

### Phase 3: Middleware swap
- [ ] Create `middleware.ts` and delete `proxy.ts`

### Phase 4: Services auth rewrite
- [ ] Rewrite `services/auth.ts` (`requireUser`, `resolveAuth`)
- [ ] Update route handlers that use `resolveAuth`

### Phase 5: Login page
- [ ] Update `app/login/page.tsx` + delete old auth routes

### Phase 6: Cleanup
- [ ] Delete `libs/supabase/` and remove Supabase packages
- [ ] Mark ADR 006 as superseded
- [ ] Update `@todo/CONTEXT.md`

## Decisions Made During Execution
(none yet)