# Dynamic Token Allocation — Plan

## Context

The current token allocation uses a fixed 65/35 split (see ADR-012): 65% for context, 35% for response, with sub-allocation of 70/30 between code context and chat history. This is simple and predictable but **wastes token budget** — simple queries get the same allocation as complex ones.

Market leaders (Cursor, Aider, Cody) use **greedy fill** approaches that are more adaptive and efficient.

## Goals

1. Replace fixed-ratio allocation with **greedy fill + minimum response reservation**
2. Allocate more context tokens to high-relevance chunks, fewer to low-relevance ones
3. Dynamically adjust response space based on query complexity
4. Maintain backward compatibility with chat history management
5. Update ADR-012 to reflect the new strategy

## Scope

**In scope:**
- New allocation algorithm in `TokenManager` (or new module)
- Greedy context filling by relevance score (highest first, stop when budget exhausted)
- Minimum response reservation (4K-8K tokens, configurable)
- Query complexity detection (simple vs complex → affects context budget)
- Chat history integration (preserve recent turns, adapt budget)
- Update `context_formatter.py` to use new allocation
- Update `ai_service.py` to use new response calculation

**Out of scope:**
- Multi-signal ranking (recency, file type, edit frequency) — future work
- BM25 hybrid search — future work
- Per-model tuning — future work

## Decisions

- **Greedy fill with floor:** Fill context with chunks sorted by relevance score. Stop when remaining tokens < minimum response reservation. No percentage-based split.
- **Minimum response:** 4,000 tokens minimum (current `MIN_RESPONSE_TOKENS`). Maximum stays at model's `max_output_tokens`.
- **Query complexity:** Simple heuristic — short queries (<50 tokens) get reduced context budget; long queries with multiple sub-questions get full budget.
- **Constants to remove:** `CONTEXT_TOKEN_RATIO` (0.65), `RESPONSE_TOKEN_RATIO` (0.8) — these become obsolete with greedy fill.
- **Constants to keep:** `MIN_RESPONSE_TOKENS`, `MAX_RESPONSE_TOKENS`, `CHAT_HISTORY_TOKEN_RATIO`, `CHAT_MIN_HISTORY_TURNS`.

## Key Files Affected

| File | Change |
|---|---|
| `src/core/ai/token_manager.py` | New `calculate_greedy_allocation()` method |
| `src/core/formatting/context_formatter.py` | Use greedy allocation instead of fixed `max_tokens` |
| `src/services/ai_service.py` | Use new response token calculation |
| `src/config/constants/ai.py` | Remove/deprecate fixed ratio constants |
| `docs/adr/012-dynamic-token-allocation.md` | Update to reflect new strategy |
| `docs/architecture/context-window-management.md` | Update diagrams and examples |

## Phases

### Phase 1: Design greedy allocation algorithm (small)
- Define the algorithm with edge cases
- Handle: empty context, single result, oversized single chunk
- Write pseudocode and validate with example scenarios

### Phase 2: Implement greedy allocation (medium)
- Add `calculate_greedy_allocation()` to `TokenManager`
- Add query complexity heuristic
- Keep old `calculate_context_allocation()` as fallback

### Phase 3: Migrate call sites (medium)
- Update `context_formatter.py` to fill greedily
- Update `ai_service.py` response calculation
- Update/deprecate fixed-ratio constants

### Phase 4: Verify & update docs (small)
- Manual test: `context-ai ask` with simple and complex queries
- Manual test: `context-ai chat` session
- Compare token usage before/after
- Update ADR-012 and architecture docs
