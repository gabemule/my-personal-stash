# Docs Cleanup — Progress

**Status:** 0/4 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Fix broken references in `docs/README.md`
Blocker: none

## Progress

### Phase 1: Fix docs/README.md broken references
- [ ] Fix `src/config/constants.py` → `src/config/constants/`
- [ ] Remove broken links to `../Plan.md` and `../Future.md`

### Phase 2: Fix package identity and metadata
- [ ] Fix placeholder email in `pyproject.toml`
- [ ] Align install instructions in `README.md` with `context-ai-alpha`
- [ ] Review/fix `Makefile` `alpha-publish` sed logic
- [ ] Tighten `anthropic>=0.49.0`
- [ ] Tighten `chromadb>=0.5.0`

### Phase 3: Clean storage command stubs
- [ ] Fix or remove `_handle_storage_optimize()` fake output
- [ ] Fix or remove incomplete `_clean_all()` branches

### Phase 4: Absorb TREE-SITTER.md
- [ ] Add tree-sitter item to `@todo/FUTURE/PLAN.md`
- [ ] Delete `src/core/chunking/TREE-SITTER.md`

## Decisions Made During Execution
(none yet)
