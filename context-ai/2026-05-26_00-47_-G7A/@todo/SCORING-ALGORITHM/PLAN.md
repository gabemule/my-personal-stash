# Scoring Algorithm Improvement — Plan

## Context

The current score normalization in `src/core/query/result_merger.py` uses Min-Max normalization per embedding. While it solves the basic problem of making scores comparable across embeddings, it has critical flaws:

1. **Min-Max loses absolute quality:** The best result of every embedding always gets score 1.0 (×0.9), even if all results are terrible matches. A result with distance 0.95 (nearly irrelevant) can score 0.9 if it's the "best" in its group.
2. **Weight factor (0.9) is a no-op:** Multiplying all scores by 0.9 doesn't change ranking or relative proportions — it's cosmetic.
3. **Multi-query results silently discarded:** The merger only reads `chroma_results[0]`, ignoring expanded synonym queries.
4. **Documentation is stale:** `similarity-scoring.md` describes code that doesn't match the implementation (hash-based cache, LRU config, etc.).
5. **No minimum quality threshold:** Garbage results are never filtered out.

## Goals

- Replace Min-Max with a hybrid normalization that preserves absolute quality
- Fix the multi-query bug (expanded terms from preprocessor are discarded)
- Add minimum quality threshold to filter irrelevant results
- Replace the meaningless weight factor with confidence-based dampening
- Update `docs/architecture/similarity-scoring.md` to match reality
- Zero regression — existing query behavior should improve, not break

## Scope

**In scope:**
- Rewrite normalization algorithm in `result_merger.py`
- Fix multi-query result handling in `result_merger.py`
- Add quality threshold filtering
- Replace weight factor with meaningful dampening
- Update `docs/architecture/similarity-scoring.md`
- Update score display consistency in `context_formatter.py`

**Out of scope:**
- Changing the embedding model or ChromaDB distance metric
- Changing the single-collection design in `vector_store.py` (separate concern)
- Changing the preprocessor's synonym expansion logic
- Adding new output formats

## Decisions

- **Hybrid normalization (absolute + relative):** Combines `1 - distance` (absolute quality) with per-embedding Min-Max (relative ranking). Weighted 70/30 favoring absolute quality. This ensures truly bad results never score high, while still fairly comparing across embeddings.
- **Minimum quality threshold:** Results with `distance > 0.7` (similarity < 0.3) are discarded before normalization. This prevents garbage from polluting the result set.
- **Confidence-based dampening over flat weight:** Embeddings with fewer results get slightly lower scores, reflecting lower confidence in the ranking.
- **Fix multi-query by merging across query indices:** Keep the best (lowest distance) result for each unique (document, embedding) pair across all query text variants.

## Algorithm Design

### Current Algorithm (flawed)
```python
# Per-embedding Min-Max:
normalized_distance = (distance - min_distance) / distance_range
normalized_score = 1.0 - normalized_distance
final_score = normalized_score * 0.9  # meaningless
```

### Proposed Algorithm
```python
# Constants
ALPHA = 0.7                    # Weight for absolute quality
MIN_SIMILARITY_THRESHOLD = 0.3 # Minimum absolute similarity to keep
CONFIDENCE_BASE = 0.85         # Base confidence (few results)
CONFIDENCE_FULL = 5            # Number of results for full confidence

# Step 0: Filter — discard results with distance > (1 - MIN_SIMILARITY_THRESHOLD)
max_allowed_distance = 1.0 - MIN_SIMILARITY_THRESHOLD
filtered = [r for r in results if r.distance <= max_allowed_distance]

# Step 1: Absolute score (preserves quality)
absolute_score = max(0.0, 1.0 - distance)

# Step 2: Relative score per-embedding (preserves ranking)
relative_score = 1.0 - (distance - min_distance) / distance_range

# Step 3: Hybrid combination
raw_score = ALPHA * absolute_score + (1 - ALPHA) * relative_score

# Step 4: Confidence-based dampening
result_count = len(embedding_results)
confidence = min(1.0, CONFIDENCE_BASE + (1 - CONFIDENCE_BASE) * (result_count / CONFIDENCE_FULL))
final_score = raw_score * confidence
```

### Example Comparison

**Embedding A: distances [0.1, 0.3, 0.8]**
| | Current | Proposed |
|---|---|---|
| d=0.1 | 0.90 | 0.70×0.9 + 0.30×1.0 = 0.93 × confidence |
| d=0.3 | 0.64 | 0.70×0.7 + 0.30×0.71 = 0.70 × confidence |
| d=0.8 | 0.00 | **filtered out** (distance > 0.7) |

**Embedding B: distances [0.9, 0.95, 1.0] (all bad)**
| | Current | Proposed |
|---|---|---|
| d=0.9 | 0.90 ← WRONG | **filtered out** (all > 0.7) |
| d=0.95 | 0.45 | **filtered out** |
| d=1.0 | 0.00 | **filtered out** |

### Multi-Query Fix
```python
# Instead of only reading [0]:
best_results = {}
for query_idx in range(len(chroma_results["documents"])):
    docs = chroma_results["documents"][query_idx]
    metas = chroma_results["metadatas"][query_idx]
    dists = chroma_results["distances"][query_idx]
    for doc, meta, dist in zip(docs, metas, dists):
        key = (doc[:100], meta.get("embedding_name"), meta.get("file_path"))
        if key not in best_results or dist < best_results[key]["distance"]:
            best_results[key] = {"text": doc, "distance": dist, "metadata": meta}
```

## Phases

### Phase 1: Fix multi-query bug (small)
- Update `merge_multi_embedding_results()` to iterate all query indices
- Deduplicate by keeping best distance per (doc, embedding) pair
- Verify with debug logging

### Phase 2: Implement hybrid normalization (medium)
- Add quality threshold constant (`MIN_SIMILARITY_THRESHOLD`)
- Filter results below threshold before normalization
- Implement hybrid scoring: `alpha × absolute + (1-alpha) × relative`
- Add configurable `ALPHA` constant
- Replace flat weight factor with confidence-based dampening

### Phase 3: Standardize score display (small)
- Audit all places that display scores (`result_merger.py`, `context_formatter.py`)
- Ensure consistent use of `final_score` for ranking and `normalized_score` for user display
- Document which score is used where

### Phase 4: Update documentation (medium)
- Rewrite `docs/architecture/similarity-scoring.md` to match new algorithm
- Remove references to non-existent config (TOKEN_CACHE_SIZE, ENABLE_TOKEN_CACHE)
- Add real code examples from the actual implementation
- Add before/after comparison examples

### Phase 5: Verify (small)
- Run `make lint`
- Manual test: query across multiple embeddings with known good/bad matches
- Verify filtered results don't appear in output
- Verify rankings make intuitive sense
- Compare output before/after for regression check
