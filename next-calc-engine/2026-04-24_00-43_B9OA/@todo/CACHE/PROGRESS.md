# CACHE — Progress

**Status:** 0/9 items · Phase: Not started

## Current Focus
Feature planned but not yet started.
Next step: Phase 1 — migrate `unstable_cache` → `use cache` in `services/api-keys.ts`
Blocker: none

## Progress

### Phase 1 — Migrate existing cache
- [ ] Migrate `lookupApiKey` from `unstable_cache` to `use cache` directive
- [ ] Verify `revalidateTag("api-keys")` still works (test via Bruno: create key → revoke → validate fails)

### Phase 2 — Projects cache
- [ ] Add cache to `listProjects()` + `getActiveProject()` with tag `projects`
- [ ] Add `revalidateTag("projects")` to PATCH, DELETE, activate routes (DELETE also invalidates `engines`)

### Phase 3 — Engines cache
- [ ] Add cache to `listEngines()` + `getActiveEngine()` with tag `engines`
- [ ] Add `revalidateTag("engines")` to PATCH, DELETE, activate routes

### Phase 4 — Per-engine cache
- [ ] Add cache to `getEngineDefinition()` with tag `engine:${engineId}` + infinite TTL

### Phase 5 — Documentation
- [ ] Update `docs/api-flow.md` §4 (remove TODO markers) + §6 (remove legacy note)
- [ ] Update sequence diagrams if cache flow changed

## Decisions Made During Execution
(none yet)
