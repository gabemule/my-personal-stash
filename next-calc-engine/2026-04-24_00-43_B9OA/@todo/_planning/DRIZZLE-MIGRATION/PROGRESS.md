# Drizzle Migration — Progress

**Status:** 0/14 items · Phase: Not started

## Current Focus
Not started yet.
Next step: Install Drizzle packages and create `db/schema.ts`
Blocker: none

## Progress

### Phase 1: Setup
- [ ] Install packages (`drizzle-orm`, `pg`, `drizzle-kit`, `@types/pg`)
- [ ] Create `db/schema.ts` (Drizzle schema)
- [ ] Create `drizzle.config.ts`
- [ ] Add `DATABASE_URL` to `.env.local`

### Phase 2: Client swap
- [ ] Rewrite `services/client.ts` (Drizzle singleton + `server-only`)
- [ ] Delete `services/server.ts`

### Phase 3: Service rewrites
- [ ] Rewrite `services/engines.ts` (~8 functions)
- [ ] Rewrite `services/projects.ts` (~7 functions)
- [ ] Rewrite `services/api-keys.ts` (~4 functions)

### Phase 4: Route handler adjustments
- [ ] Remove `auth.supabase` passing pattern from calc/schema route handlers

### Phase 5: Tests
- [ ] Update service test mocks for Drizzle
- [ ] Run full test suite + Bruno smoke test

### Phase 6: Cleanup & docs
- [ ] Update `docs/adr/002-services-layer.md` for Drizzle
- [ ] Update `@todo/CONTEXT.md`

## Decisions Made During Execution
(none yet)