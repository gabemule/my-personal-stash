# Remove Dead Code — Progress

**Status:** 0/3 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Search for consumers of stub `AIService` in `embedding_service.py`
Blocker: none

## Progress

### Phase 1: Verify no consumers
- [ ] Search for `from services.embedding_service import AIService`
- [ ] Confirm no code depends on the stub

### Phase 2: Remove
- [ ] Delete stub `AIService` class (~lines 739-760) from `embedding_service.py`
- [ ] Remove related unused imports

### Phase 3: Verify
- [ ] Run `make lint` — no errors
- [ ] Run CLI — no regressions

## Decisions Made During Execution
(none yet)
