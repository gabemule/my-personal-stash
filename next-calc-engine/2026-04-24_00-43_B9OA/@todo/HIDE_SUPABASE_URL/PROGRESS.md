# HIDE_SUPABASE_URL — Progress

**Status:** 5/5 items · Phase 1 Complete

## Current Focus
✅ Phase 1 complete. Verified with `yarn tsc --noEmit` and `yarn test` (246/246 passing).
Phase 2 (cleanup — remove fallback) pending infra env update.

## Progress

### Phase 1 — Code with fallback
- [x] Update source files (5): client.ts, server.ts, proxy.ts, login/route.ts, logout/route.ts
- [x] Update env files: .env.example, .env.local
- [x] Update docs: README.md, db/migrations/README.md
- [x] Verify: `yarn tsc --noEmit` + `yarn test`
- [x] Update @todo/CONTEXT.md

### Phase 2 — Cleanup (after infra update)
- [ ] Remove fallback `?? process.env.NEXT_PUBLIC_SUPABASE_URL` from 5 source files
- [ ] Remove `NEXT_PUBLIC_SUPABASE_URL` from .env.example

## Decisions Made During Execution
- 2026-05-10: `.env` and `.env.development` don't exist — only `.env.example` and `.env.local` needed updating.
- 2026-05-10: Removed `NEXT_PUBLIC_SUPABASE_URL` from `.env.local` immediately (local env is under our control). Kept in `.env.example` as deprecated reference for infra migration.
