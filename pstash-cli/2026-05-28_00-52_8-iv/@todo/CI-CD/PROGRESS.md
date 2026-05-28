# CI/CD — Progress

**Status:** 0/5 phases · Phase: Pre-execution

## Current Focus
Waiting for manual first publish to npm before creating workflows.
Next step: Phase 1 — Manual first publish (`npm publish --access public`)
Blocker: Package `pstash` doesn't exist on npm yet

## Progress

### Phase 1: Manual First Publish
- [ ] `npm login` (verify auth)
- [ ] `npm view pstash` (confirm name is available)
- [ ] `npm run build && npm run typecheck`
- [ ] `npm pack --dry-run` (verify contents)
- [ ] `npm publish --access public`
- [ ] `npm view pstash` (verify published)

### Phase 2: CI Workflow
- [ ] Create `.github/workflows/ci.yml`
- [ ] Push to main and verify CI runs

### Phase 3: Publish Workflow
- [ ] Create `.github/workflows/publish.yml` (OIDC + provenance)
- [ ] Push to main

### Phase 4: npm OIDC Setup
- [ ] Verify `repository` URL in `package.json` matches actual repo (`the-coded/pstash`)
- [ ] Configure npm package publishing access for provenance

### Phase 5: End-to-End Verification
- [ ] Create a test GitHub Release (e.g., `v0.1.1`)
- [ ] Verify publish workflow runs successfully
- [ ] Verify package on npmjs.com with provenance badge

## Decisions Made During Execution
(none yet)
