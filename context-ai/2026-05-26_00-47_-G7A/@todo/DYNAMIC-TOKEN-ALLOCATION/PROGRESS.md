# Dynamic Token Allocation — Progress

**Status:** 0/4 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Design greedy allocation algorithm with edge cases
Blocker: none

## Progress

### Phase 1: Design greedy allocation algorithm
- [ ] Define algorithm with edge cases
- [ ] Handle edge cases (empty context, single result, oversized chunk)
- [ ] Write pseudocode and validate with scenarios

### Phase 2: Implement greedy allocation
- [ ] Add `calculate_greedy_allocation()` to TokenManager
- [ ] Add query complexity heuristic
- [ ] Keep old method as fallback

### Phase 3: Migrate call sites
- [ ] Update `context_formatter.py`
- [ ] Update `ai_service.py`
- [ ] Update/deprecate fixed-ratio constants

### Phase 4: Verify & update docs
- [ ] Manual test: `context-ai ask`
- [ ] Manual test: `context-ai chat`
- [ ] Compare token usage before/after
- [ ] Update ADR-012 and architecture docs

## Decisions Made During Execution
(none yet)
