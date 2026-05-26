# CI/CD & Git Hooks — Progress

**Status:** 0/5 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Create `.github/workflows/ci.yml`
Blocker: none

## Progress

### Phase 1: GitHub Actions CI
- [ ] Create `.github/workflows/ci.yml`
- [ ] Configure Python matrix (3.9, 3.10, 3.11, 3.12)
- [ ] Add lint step
- [ ] Add format check step
- [ ] Add type check step
- [ ] Add test step
- [ ] Add coverage reporting

### Phase 2: GitHub Actions Publish
- [ ] Create `.github/workflows/publish.yml`
- [ ] Configure tag-based trigger
- [ ] Add build and publish steps
- [ ] Setup PyPI trusted publisher or API token

### Phase 3: Git hooks with pre-commit
- [ ] Add `pre-commit` to dev dependencies
- [ ] Create `.pre-commit-config.yaml`
- [ ] Add `autoflake` hook
- [ ] Add `black` hook
- [ ] Add `isort` hook
- [ ] Add `flake8` hook
- [ ] Add pre-push test hook
- [ ] Document hook setup in README

### Phase 4: README badges and docs
- [ ] Add CI status badge
- [ ] Add PyPI version badge
- [ ] Add Python version badge
- [ ] Document CI/CD in docs

### Phase 5: Verify
- [ ] Test PR triggers CI correctly
- [ ] Hooks work on commit
- [ ] Publish workflow tested with Test PyPI

## Decisions Made During Execution
(none yet)
