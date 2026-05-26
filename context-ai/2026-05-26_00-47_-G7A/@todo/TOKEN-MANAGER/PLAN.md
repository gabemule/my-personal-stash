# Token Manager Centralization — Plan

## Context

The codebase has 3-4 independent token counting implementations, each using a different algorithm:

1. **`context_formatter.py`** — `count_tokens()` using `tiktoken` + unbounded `_token_cache` dict
2. **`prompt_builder.py`** — inline `count_tokens = len(text.split()) + len(text) // 4` (different algorithm, word-based)
3. **`langchain_adapter.py`** — `_estimate_token_count()` using `len(text) // 4` char-based estimation
4. **`ai_service.py`** — `TokenCalculator` class with `calculate_context_allocation()` and `calculate_response_tokens()` (budget logic, not counting per se)

These implementations give **inconsistent results** for the same input. The tiktoken-based one is accurate; the others are rough estimations with different formulas. Additionally, token budget/allocation logic is duplicated between `TokenCalculator` (in ai_service.py) and `_validate_token_limit` (in context_formatter.py).

This TODO absorbs and supersedes `@todo/TOKEN-CACHE-FIX/` (the unbounded cache fix is included as part of the centralization).

## Goals

1. Create a single `TokenManager` at `src/core/ai/token_manager.py` as the sole token counting authority
2. Eliminate all duplicate `count_tokens` / `_estimate_token_count` implementations
3. Centralize token budget logic (`calculate_context_allocation`, `calculate_response_tokens`) currently in `TokenCalculator`
4. Fix the unbounded `_token_cache` with `functools.lru_cache` (absorbs TOKEN-CACHE-FIX)
5. Maintain provider-aware counting (tiktoken now, extensible for future providers)

## Scope

**In scope:**
- New `src/core/ai/token_manager.py` module with `TokenManager` class + `get_token_manager()` singleton
- Migrate `count_tokens()` from `context_formatter.py` (tiktoken-based, the accurate one)
- Migrate `TokenCalculator` from `ai_service.py` (budget allocation logic)
- Remove `_estimate_token_count()` from `langchain_adapter.py`
- Remove inline `count_tokens` from `prompt_builder.py`
- Replace all call sites to use `get_token_manager().count_tokens()`
- `@lru_cache(maxsize=4096)` on the core counting function
- Update `src/core/ai/__init__.py` exports

**Out of scope:**
- Adding new token providers (OpenAI, Cohere, etc.) — future work
- Persistent cache across sessions
- Token usage analytics/reporting
- Changing token-related constants in `config/constants/ai.py` (keep as-is)

## Decisions

- **Single module, not a package.** Token management is one responsibility — a single file is sufficient. No over-engineering.
- **Keep tiktoken as the counting backend.** It's already a dependency and gives accurate counts for Claude (cl100k_base encoding is close enough).
- **`lru_cache(maxsize=4096)`** — same rationale as TOKEN-CACHE-FIX plan: covers ~20-80 chat turns, ~2-4MB memory max.
- **Absorb `TokenCalculator` budget methods.** `calculate_context_allocation()` and `calculate_response_tokens()` belong with the token counter, not in a 1141-line AI service god module.
- **No backward-compat shims.** All call sites get migrated in one pass. The codebase has zero tests, so there's no test suite to break.

## Key Files Affected

| File | Change |
|---|---|
| `src/core/ai/token_manager.py` | **NEW** — central token manager |
| `src/core/ai/__init__.py` | Add exports |
| `src/core/formatting/context_formatter.py` | Remove `count_tokens()`, `_token_cache`, tiktoken imports; use `get_token_manager()` |
| `src/core/ai/prompt_builder.py` | Remove inline `count_tokens`; use `get_token_manager()` |
| `src/core/chunking/langchain_adapter.py` | Remove `_estimate_token_count()`; use `get_token_manager()` |
| `src/services/ai_service.py` | Remove `TokenCalculator` class; use `get_token_manager()` |

## Phases

### Phase 1: Create TokenManager (medium)
- Create `src/core/ai/token_manager.py` with:
  - `count_tokens(text)` using tiktoken + lru_cache
  - Fallback estimation when tiktoken unavailable
  - `calculate_context_allocation(question, include_history)` from TokenCalculator
  - `calculate_response_tokens(input_tokens, context_tokens)` from TokenCalculator
  - `should_use_streaming(text)` (uses STREAMING_THRESHOLD_TOKENS)
  - `get_token_manager()` singleton factory
- Update `src/core/ai/__init__.py`

### Phase 2: Migrate call sites (medium)
- Replace `count_tokens` in `context_formatter.py` → `get_token_manager().count_tokens()`
- Replace inline estimation in `prompt_builder.py` → `get_token_manager().count_tokens()`
- Replace `_estimate_token_count` in `langchain_adapter.py` → `get_token_manager().count_tokens()`
- Replace `TokenCalculator` usage in `ai_service.py` → `get_token_manager()`
- Search for any other `count_tokens` / `token_count` call sites

### Phase 3: Clean up dead code (small)
- Remove `_token_cache` dict from `context_formatter.py`
- Remove `TokenCalculator` class from `ai_service.py`
- Remove `_estimate_token_count` method from `langchain_adapter.py`
- Remove orphaned tiktoken imports
- Run `make lint` to verify

### Phase 4: Verify (small)
- Manual test: `context-ai ask` with a real query
- Manual test: `context-ai chat` session (streaming decision)
- Verify token counts are consistent across all paths
- Check lru_cache stats via `get_token_manager().count_tokens.cache_info()`
