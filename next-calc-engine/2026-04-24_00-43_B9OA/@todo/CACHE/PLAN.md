# CACHE — Plan

## Context

The project uses server-side caching for expensive lookups (currently only `validateApiKey`). The implementation uses `unstable_cache` from `next/cache`, which is a legacy API. On Next.js 15+ the recommended approach is the `use cache` directive with `cacheTag()` and `cacheLife()`. We're on Next.js 16.

Additionally, several mutation endpoints are marked as `TODO` for cache invalidation — they should call `revalidateTag()` but don't yet. This means list/read endpoints currently always hit the database.

## Goals

1. **Migrate `unstable_cache` → `use cache` directive** in `services/api-keys.ts`
2. **Implement cache tags for Projects** — cache `listProjects`, `getActiveProject`; invalidate on PATCH, DELETE, activate
3. **Implement cache tags for Engines** — cache `listEngines`, `getActiveEngine`; invalidate on PATCH, DELETE, activate
4. **Implement per-engine cache** — cache `getEngineDefinition` for published engines with infinite TTL
5. **Update `docs/api-flow.md`** — remove TODO markers from §4 table, update §6 implementation note

## Scope

### In scope

- Migrate existing `unstable_cache` usage to `use cache`
- Add `cacheTag()` / `cacheLife()` to service functions that should be cached
- Add `revalidateTag()` calls to mutation route handlers (PATCH, DELETE, activate)
- Update api-flow.md after implementation

### Out of scope

- Client-side caching (SWR, React Query, etc.)
- CDN/edge caching
- Cache warming strategies

## Decisions

- **`use cache` over `unstable_cache`**: We're on Next 16 — use the stable API
- **Tags match the domain**: `projects`, `engines`, `engine:${id}`, `api-keys`
- **TTL strategy**: 1 hour for lists, infinite for published engine definitions, 1 hour for api-key lookups
- **Invalidation is always explicit**: Every mutation that changes cached data must call `revalidateTag()` — no relying on TTL alone for correctness

## Phases

### Phase 1 — Migrate existing cache (low risk)
- Migrate `lookupApiKey` in `services/api-keys.ts` from `unstable_cache` to `use cache`
- Verify `revalidateTag("api-keys")` still works after migration
- Effort: ~30 min

### Phase 2 — Projects cache (medium)
- Add cache to `listProjects()` and `getActiveProject()` with tag `projects`
- Add `revalidateTag("projects")` to PATCH, DELETE, activate route handlers
- DELETE also invalidates `engines` tag (cascade)
- Effort: ~1 hour

### Phase 3 — Engines cache (medium)
- Add cache to `listEngines()` and `getActiveEngine()` with tag `engines`
- Add `revalidateTag("engines")` to PATCH, DELETE, activate route handlers
- Effort: ~1 hour

### Phase 4 — Per-engine cache (low risk, high impact)
- Add cache to `getEngineDefinition()` with tag `engine:${engineId}` and infinite TTL
- Published engines are immutable — cache never needs invalidation
- Draft engines bypass cache entirely (direct DB query)
- Effort: ~30 min

### Phase 5 — Documentation
- Update `docs/api-flow.md` §4 table (remove TODO markers)
- Update §6 implementation note (remove legacy mention)
- Update sequence diagrams if cache flow changed
- Effort: ~15 min
