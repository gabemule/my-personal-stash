# CACHE — Context

> Last updated: 2026-05-09

## Key Files
- `next.config.ts` — `experimental.useCache: true` + custom cache life profiles (`lookup`, `immutable`)
- `libs/cache.ts` — `CACHE_TAGS` constants (`API_KEYS`, `ENGINES`, `engine(id)`) — no `PROJECTS` tag
- `services/engines.ts` — `cachedGetEngineDefinition()` (immutable, per-engine tag), `cachedGetActiveEngine()` (lookup, engines tag), revalidateTag in `updateEngine`, `deleteEngine`, `activateEngine`
- `services/projects.ts` — revalidateTag in `deleteProject` only (invalidates `engines` tag because cascade orphans engines)
- `services/api-keys.ts` — `lookupApiKey()` with `"use cache"` (lookup, api-keys tag), revalidateTag in `revokeApiKey`
- `app/api/calc/[...segments]/route.ts` — uses `cachedGetEngineDefinition` and `cachedGetActiveEngine` for engine resolution

## Patterns Adopted
- `"use cache"` directive (Next.js 16 stable) — not `unstable_cache`
- Cached read functions use `createServiceClient()` (bypasses RLS, no cookies) since `"use cache"` cannot access `cookies()`
- `revalidateTag` lives in service mutation functions, never in route handlers
- Route handlers are completely cache-unaware — they just call service functions
- `revalidateTag(tag, "max")` — Next.js 16 requires 2nd arg (cache life profile)
- **Only public-facing endpoints are cached** (calc engine resolution, api-key validation). Internal CRUD routes hit DB directly.

## Integration Points
- Calc route calls `cachedGetEngineDefinition(engineId)` for UUID path and `cachedGetActiveEngine(projectId, true)` for active path
- `deleteProject` invalidates `ENGINES` tag (cascade: orphans engines, can change active engine)
- `updateEngine`/`deleteEngine` invalidate per-engine tag `engine:${id}` (draft definitions used by calc)
- `activateEngine` invalidates `ENGINES` tag (changes which engine `cachedGetActiveEngine` returns)

## Gotchas
- `"use cache"` functions CANNOT call `cookies()` — any function that needs cookies must use a non-cached path
- `revalidateTag` in Next.js 16 requires 2 args: `revalidateTag(tag, profileOrConfig)` — passing only 1 arg causes runtime error
- `cachedGetEngineDefinition` uses `"immutable"` profile — published engines never need invalidation, but drafts do (handled by revalidateTag in updateEngine/deleteEngine)
- `createEngine` and `publishEngine` do NOT invalidate any cache — no cached function returns engine lists or is affected by these mutations
- No `PROJECTS` tag exists — project lists are not cached
