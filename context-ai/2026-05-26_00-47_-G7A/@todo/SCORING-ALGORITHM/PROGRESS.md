# Scoring Algorithm Improvement — Progress

**Status:** 0/5 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Fix multi-query bug in `merge_multi_embedding_results()`
Blocker: none

## Progress

### Phase 1: Fix multi-query bug
- [ ] Update merger to iterate all query indices (not just `[0]`)
- [ ] Deduplicate by keeping best distance per (doc, embedding) pair
- [ ] Verify with debug logging

### Phase 2: Implement hybrid normalization
- [ ] Add `MIN_SIMILARITY_THRESHOLD` constant
- [ ] Filter results below quality threshold
- [ ] Implement hybrid scoring: `alpha × absolute + (1-alpha) × relative`
- [ ] Add configurable `ALPHA` constant
- [ ] Replace flat weight factor with confidence-based dampening
- [ ] Remove `DEFAULT_WEIGHT_FACTOR = 0.9`

### Phase 3: Standardize score display
- [ ] Audit score usage in `result_merger.py`
- [ ] Audit score usage in `context_formatter.py`
- [ ] Ensure consistent score type per context (ranking vs display)
- [ ] Document which score is used where

### Phase 4: Update documentation
- [ ] Rewrite `docs/architecture/similarity-scoring.md`
- [ ] Remove references to non-existent config
- [ ] Add real code examples
- [ ] Add before/after comparison examples

### Phase 5: Verify
- [ ] Run `make lint` — no errors
- [ ] Manual test: multi-embedding query
- [ ] Verify filtered results are excluded
- [ ] Verify rankings are intuitively correct
- [ ] Compare before/after outputs

## Decisions Made During Execution
(none yet)
