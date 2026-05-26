# UV Lock File — Plan

## Context

The project has no Python lock file. `pyproject.toml` uses `>=` version constraints without pins, meaning different installs can get different dependency versions. Builds are not reproducible. This is a supply chain risk and a reliability issue.

## Goals

- Adopt `uv` as the Python package manager
- Generate a `uv.lock` file for reproducible builds
- Update development workflow (`Makefile`, docs) to use `uv`

## Scope

**In scope:**
- Install `uv` as a development tool
- Generate `uv.lock` from existing `pyproject.toml`
- Update `Makefile` targets to use `uv` commands where applicable
- Update `README.md` setup instructions
- Add `uv.lock` to version control

**Out of scope:**
- Migrating away from `setuptools` build backend (keep `pyproject.toml` as-is)
- Changing dependency versions
- Migrating the VS Code extension's npm setup

## Decisions

- **`uv` over `pip-compile`:** `uv` is the emerging standard (Astral team, same as Ruff). 10-100x faster than pip-compile. Native `uv.lock` format works with `pyproject.toml` directly. Growing community adoption. Better developer experience.
- **Keep `setuptools`:** No need to switch build backend. `uv` works with any PEP 517 backend.
- **Gradual adoption:** Start with lock file generation. Optionally adopt `uv run`, `uv sync` for dev workflow later.

## Phases

### Phase 1: Install and generate lock (small)
- Ensure `uv` is installed (`curl -LsSf https://astral.sh/uv/install.sh | sh` or `brew install uv`)
- Run `uv lock` to generate `uv.lock` from `pyproject.toml`
- Commit `uv.lock`

### Phase 2: Update Makefile (medium)
- Update `setup` target to use `uv sync` or `uv pip install`
- Update `install` / `install-dev` targets
- Keep `build` and `publish` targets using `python -m build` and `twine` (uv doesn't replace these yet)

### Phase 3: Update documentation (small)
- Update `README.md` setup instructions to mention `uv`
- Add `uv` to prerequisites
- Document both `uv` and `pip` paths for users who don't want to install `uv`

### Phase 4: Verify (small)
- Clean install from scratch using `uv sync`
- Run `make lint`, `make test`
- Verify CLI works
