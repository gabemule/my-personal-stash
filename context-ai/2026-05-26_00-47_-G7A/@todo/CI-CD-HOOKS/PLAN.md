# CI/CD & Git Hooks — Plan

## Context

The project has no CI/CD pipeline and no Git hooks. There are no automated quality gates — linting, type checking, and testing depend entirely on developers remembering to run them manually. The `Makefile` has targets for lint/test/format but nothing enforces their execution before commits or in pull requests.

## Goals

- Add GitHub Actions CI pipeline for automated testing, linting, and building
- Add Git hooks (via Husky or pre-commit) for local quality enforcement
- Add automated PyPI publishing workflow
- Ensure no broken code reaches the main branch

## Scope

**In scope:**
- GitHub Actions workflows (CI, publish)
- Git hooks for pre-commit (lint, format check) and pre-push (tests)
- Integration with existing `Makefile` targets
- Badge setup for README

**Out of scope:**
- VS Code extension CI/CD (separate project, separate pipeline)
- Docker-based CI (not needed for a CLI tool)
- Deployment to anything other than PyPI

## Decisions

- **GitHub Actions:** Project is hosted on GitHub (`git@github.com:gabemule/context-ai.git`), so GH Actions is the natural choice.
- **pre-commit over Husky:** `pre-commit` is the Python ecosystem standard for Git hooks. Husky is Node.js-focused. Since this is primarily a Python project, `pre-commit` is more appropriate and doesn't require Node.js.
- **Separate CI and publish workflows:** CI runs on every push/PR. Publish runs only on tag creation.

## Phases

### Phase 1: GitHub Actions CI (medium)
- Create `.github/workflows/ci.yml`
- Triggers: push to `main`, pull requests to `main`
- Matrix: Python 3.9, 3.10, 3.11, 3.12
- Steps:
  1. Checkout
  2. Setup Python
  3. Install dependencies (`uv sync` or `pip install -e ".[dev]"`)
  4. Run linting (`make lint`)
  5. Run formatting check (`black --check`, `isort --check`)
  6. Run type checking (`make type-check`)
  7. Run tests (`make test`)
  8. Report coverage

### Phase 2: GitHub Actions Publish (small)
- Create `.github/workflows/publish.yml`
- Triggers: tag creation matching `v*`
- Steps:
  1. Checkout
  2. Setup Python
  3. Build package (`make build`)
  4. Publish to PyPI via trusted publisher (OIDC) or API token
  5. Optionally publish to Test PyPI first

### Phase 3: Git hooks with pre-commit (medium)
- Add `pre-commit` to dev dependencies
- Create `.pre-commit-config.yaml` with hooks:
  - `autoflake` — remove unused imports
  - `black` — format check
  - `isort` — import sorting check
  - `flake8` — lint
  - `mypy` — type check (optional, can be slow)
- Add pre-push hook for running tests
- Document hook setup in README

### Phase 4: README badges and docs (small)
- Add CI status badge to README
- Add PyPI version badge
- Add Python version badge
- Document the CI/CD pipeline in `docs/`

### Phase 5: Verify (small)
- Create a test PR to verify CI runs correctly
- Verify hooks work on commit
- Verify publish workflow with Test PyPI
