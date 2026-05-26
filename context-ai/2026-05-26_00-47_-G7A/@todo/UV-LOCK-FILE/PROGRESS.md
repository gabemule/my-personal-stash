# UV Lock File — Progress

**Status:** 0/4 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Install `uv` and run `uv lock`
Blocker: none

## Progress

### Phase 1: Install and generate lock
- [ ] Ensure `uv` is installed
- [ ] Run `uv lock` to generate `uv.lock`
- [ ] Verify lock file is valid

### Phase 2: Update Makefile
- [ ] Update `setup` target to use `uv sync`
- [ ] Update `install` / `install-dev` targets
- [ ] Keep `build` / `publish` targets as-is

### Phase 3: Update documentation
- [ ] Update `README.md` setup instructions
- [ ] Add `uv` to prerequisites
- [ ] Document both `uv` and `pip` setup paths

### Phase 4: Verify
- [ ] Clean install from scratch
- [ ] Run `make lint` and `make test`
- [ ] Verify CLI works end-to-end

## Decisions Made During Execution
(none yet)
