# Docs Cleanup — Plan

## Context

A final codebase sweep found several documentation inconsistencies, broken references, placeholder metadata, loose dependency bounds, and stub commands that print fake output. None of these are bugs affecting functionality, but they create confusion for contributors and users.

## Goals

1. Fix broken references in `docs/README.md`
2. Align package identity across `pyproject.toml`, `README.md`, and `Makefile`
3. Tighten dependency version bounds
4. Clean up storage command stubs (fake output)
5. Absorb `TREE-SITTER.md` into `@todo/FUTURE/PLAN.md`

## Scope

**In scope:**
- Fix documentation references
- Fix pyproject.toml metadata
- Tighten dependency pins
- Clean storage command stubs
- Move TREE-SITTER.md content to FUTURE roadmap

**Out of scope:**
- Implementing storage optimization (that's a feature, not cleanup)
- Implementing tree-sitter chunking (future roadmap item)
- Rewriting README.md entirely

## Phases

### Phase 1: Fix docs/README.md broken references
- Fix reference to `src/config/constants.py` → `src/config/constants/` (it's a directory now with ai.py, chunking.py, storage.py, system.py, validation.py)
- Remove broken links to `../Plan.md` and `../Future.md` (these files don't exist; plans are now in `@todo/`)

### Phase 2: Fix package identity and metadata
- Fix placeholder email `your-email@example.com` in `pyproject.toml`
- Align install instructions in `README.md` with actual PyPI package name `context-ai-alpha`
- Review `Makefile` `alpha-publish` target — the `sed` replacing `context-ai` → `context-ai-alpha` is a no-op since pyproject.toml already says `context-ai-alpha`. Either:
  - Change pyproject.toml name to `context-ai` and keep the sed (intended flow), or
  - Remove the sed from Makefile (if `context-ai-alpha` is the permanent name)
- Tighten dependency lower bounds:
  - `anthropic>=0.49.0` (current API surface, was `>=0.3.0`)
  - `chromadb>=0.5.0` (stable API, was `>=0.4.0`)

### Phase 3: Clean storage command stubs
- `src/commands/storage.py` line ~353: `_handle_storage_optimize()` prints fake placeholder text pretending to optimize. Options:
  - **Remove the `optimize` subcommand entirely** until it's implemented (cleaner)
  - **Or** make it print "Not implemented yet" honestly
- `src/commands/storage.py` line ~762: `_clean_all()` has log cleaning and model cleaning that are logged but not executed. Either implement or remove those branches.

### Phase 4: Absorb TREE-SITTER.md
- Add "Tree-sitter AST-based Chunking" as item #6 in `@todo/FUTURE/PLAN.md` with key points from the doc
- Delete `src/core/chunking/TREE-SITTER.md`
