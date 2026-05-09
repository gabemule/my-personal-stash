# CACHE — Progress

**Status:** Complete

## Current Focus
All phases complete. Cache implemented with `"use cache"` directive.
Next step: none
Blocker: none

## Progress

### Phase 1 — Migrate existing cache
- [x] Migrate `lookupApiKey` from `unstable_cache` to `"use cache"` directive
- [x] `revalidateTag("api-keys", "max")` moved into `revokeApiKey` service function

### Phase 2 — Public endpoint cache (calc + api-keys)
- [x] Add `cachedGetEngineDefinition()` with per-engine tag `engine:${id}` and `"immutable"` profile
- [x] Add `cachedGetActiveEngine()` with tag `engines` and `"lookup"` profile
- [x] Calc route uses cached functions for engine resolution (both UUID and active paths)
- [x] Add `revalidateTag` to `updateEngine` (`engine:${id}`), `deleteEngine` (`engine:${id}`), `activateEngine` (`engines`), `deleteProject` (`engines`)

### Phase 3 — Documentation
- [x] Update `docs/api-flow.md` §4 table, §5 diagrams, §6 section
- [x] Update `@todo/CACHE/PROGRESS.md`, `CONTEXT.md`, project `CONTEXT.md`

## Decisions Made During Execution
- 2026-05-09: Used `"use cache"` directive instead of `unstable_cache` (Next.js 16 stable API)
- 2026-05-09: Cached functions use `createServiceClient()` (service-role, no cookies) because `"use cache"` cannot access `cookies()`. Safe since route handlers already validate auth.
- 2026-05-09: `revalidateTag` calls moved from route handlers into service mutation functions — all cache logic scoped to services layer
- 2026-05-09: Custom cache life profiles in `next.config.ts`: `lookup` (stale 5min, revalidate 1h, expire 24h), `immutable` (stale 7d, revalidate 30d, expire ∞)
- 2026-05-09: Tag constants centralized in `libs/cache.ts` to avoid typos
- 2026-05-09: `revalidateTag(tag, "max")` — Next.js 16 requires 2nd argument (cache life profile)
- 2026-05-09: **Scope narrowed to public endpoints only** — only calc and api-keys are cached. Internal CRUD routes (projects lists, engines lists) hit the DB directly since they're low-traffic single-user frontend routes. This avoids unnecessary cache complexity.
- 2026-05-09: Removed `cachedListProjects`, `cachedListEngines` — no `PROJECTS` cache tag exists
- 2026-05-09: `listApiKeys` not cached — low-traffic management UI, not worth the complexity
- 2026-05-09: `createEngine`/`publishEngine` don't invalidate any cache — no cached function returns engine lists
