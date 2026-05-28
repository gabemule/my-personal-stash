# CI/CD — Plan

## Context

pstash v0.1.0 is ready for npm publish. The repo has been transferred to `the-coded/pstash` on GitHub. There is no CI/CD pipeline yet — the only publish safeguard is the `prepublishOnly` script (`npm run build && npm run typecheck`). We need:

1. A CI workflow to validate PRs and pushes to main
2. A publish workflow to automate npm releases via GitHub Releases + OIDC (no tokens)

The first npm publish must be done manually (the package doesn't exist on npm yet). After that, the OIDC-based workflow takes over.

## Goals

- [ ] CI runs on every PR and push to main (test, lint, typecheck, build)
- [ ] Publish to npm automatically when a GitHub Release is created
- [ ] Use npm OIDC provenance (no NPM_TOKEN secret needed)
- [ ] First manual publish to establish the package on npm

## Scope

**In:**
- `.github/workflows/ci.yml` — CI pipeline
- `.github/workflows/publish.yml` — npm publish pipeline
- npm OIDC/provenance setup
- Manual first-publish instructions

**Out:**
- Changelog generation (can add later)
- Version bumping automation (manual for now — edit `package.json`)
- Branch protection rules (up to the owner)

## Decisions

1. **OIDC over NPM_TOKEN:** npm supports GitHub Actions OIDC natively. No secret to manage, rotate, or leak. The workflow requests an ephemeral token via `id-token: write` permission. This is the current best practice.

2. **GitHub Release as trigger (not tag push):** Using `release: published` event instead of `push: tags`. Reasons:
   - GitHub Release provides a UI for release notes
   - Prevents accidental publishes from pushing a tag
   - Release can be drafted, reviewed, then published
   - Tag is still created (GitHub Release creates one)

3. **CI as prerequisite for publish:** The publish workflow includes the full CI check (test/lint/typecheck/build) before publishing. This ensures nothing broken reaches npm even if someone creates a release from an untested commit.

4. **Node 20 only:** No matrix build needed — `engines` specifies `>=20.0.0` and that's the LTS.

## Phases

### Phase 1: Manual First Publish (~10 min)

Before any automation works, the package must exist on npm.

**Steps:**

```bash
# 1. Login to npm (if not already)
npm login

# 2. Verify package name is available
npm view pstash

# 3. Build the package
cd /path/to/pstash-cli
npm run build
npm run typecheck

# 4. Dry run to verify contents
npm pack --dry-run

# 5. Publish (public access since it's unscoped)
npm publish --access public --provenance

# 6. Verify
npm view pstash
```

> **Note:** `--provenance` on the first manual publish only works if you're running from a GitHub Actions environment. For the first manual publish from local, omit `--provenance`. Provenance will be enabled automatically once the GitHub Actions workflow takes over.

```bash
# First publish from local (no provenance):
npm publish --access public
```

### Phase 2: Create CI Workflow (~5 min)

Create `.github/workflows/ci.yml`:

- **Trigger:** `push` to `main` + `pull_request` to `main`
- **Job:** Single job `ci` on `ubuntu-latest`
- **Steps:**
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with `node-version: 20`, `cache: 'npm'`
  3. `npm ci`
  4. `npm run typecheck`
  5. `npm run lint`
  6. `npm test`
  7. `npm run build`

### Phase 3: Create Publish Workflow (~5 min)

Create `.github/workflows/publish.yml`:

- **Trigger:** `release: types: [published]`
- **Permissions:** `contents: read`, `id-token: write` (OIDC)
- **Job:** Single job `publish` on `ubuntu-latest`
- **Environment:** `npm` (optional — for GitHub environment protection rules)
- **Steps:**
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with `node-version: 20`, `cache: 'npm'`, `registry-url: 'https://registry.npmjs.org'`
  3. `npm ci`
  4. `npm run typecheck`
  5. `npm run lint`
  6. `npm test`
  7. `npm run build`
  8. `npm publish --provenance --access public`
     - env: `NODE_AUTH_TOKEN` set automatically by OIDC (no secret needed when using provenance)

### Phase 4: npm OIDC Setup (~5 min)

On npmjs.com, configure the package to accept OIDC-based publishing:

1. Go to https://www.npmjs.com/package/pstash/access
2. Under **Publishing access**, ensure it allows automation tokens or linked providers
3. The first publish via GitHub Actions with `--provenance` will automatically link the repo

> **Important:** npm provenance requires the `repository` field in `package.json` to match the GitHub repo. Currently set to `the-coded/pstash-cli.git` — verify this matches the actual repo name after transfer (it might be `the-coded/pstash.git` now).

### Phase 5: Verify End-to-End (~5 min)

1. Push the workflow files to `main`
2. Verify CI runs on the push
3. Create a test GitHub Release (`v0.1.1` or `v0.2.0`)
4. Verify the publish workflow runs and the package appears on npm
5. Check npm package page for provenance badge

## Release Workflow (ongoing)

After setup, the release process is:

```
1. Develop on feature branch
2. Open PR → CI runs automatically
3. Merge to main → CI runs again
4. When ready to release:
   a. Update version in package.json (npm version patch/minor/major)
   b. Push the changes
   c. Create GitHub Release with tag (e.g., v0.2.0)
   d. Publish workflow runs → npm publish happens automatically
5. Verify on npmjs.com
```
