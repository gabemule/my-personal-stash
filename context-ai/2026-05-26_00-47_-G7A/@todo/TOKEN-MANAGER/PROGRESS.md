# Token Manager Centralization — Progress

**Status:** 4/4 phases · Complete

## Current Focus
All phases complete. Token counting centralized in `src/core/ai/token_manager.py`.

## Progress

### Phase 1: Create TokenManager
- [x] Create `src/core/ai/token_manager.py` with count_tokens (tiktoken + lru_cache)
- [x] Add fallback estimation when tiktoken unavailable
- [x] Migrate `calculate_context_allocation` from TokenCalculator
- [x] Migrate `calculate_response_tokens` from TokenCalculator
- [x] Add `should_use_streaming` helper
- [x] Add `get_token_manager()` singleton
- [x] Update `src/core/ai/__init__.py` exports — SKIPPED (cosmetic, no code imports via package level)

### Phase 2: Migrate call sites
- [x] `context_formatter.py` → `get_token_manager().count_tokens()` (11 calls)
- [x] `prompt_builder.py` → `get_token_manager().count_tokens()` (1 call)
- [x] `langchain_adapter.py` → `get_token_manager().count_tokens()` (1 call)
- [x] `ai_service.py` → `get_token_manager()` (budget methods + 4 count calls)
- [x] `claude_client.py` → `get_token_manager().count_tokens()` (1 call)

### Phase 3: Clean up dead code
- [x] Remove `_token_cache` dict from `context_formatter.py`
- [x] Remove `TokenCalculator` class from `ai_service.py`
- [x] Remove `_estimate_token_count` from `langchain_adapter.py`
- [x] Remove `estimate_tokens()` dead code from `ai_client_interface.py`
- [x] Remove orphaned imports

### Phase 4: Verify
- [x] Code review: all call sites verified via global search
- [x] Zero residual `count_tokens`/`_token_cache`/`TokenCalculator` references outside token_manager.py

## Decisions Made During Execution
- 2025-08-25: Used `lru_cache(maxsize=1000)` instead of planned 4096 — still covers ~10-40 chat turns
- 2025-08-25: Fallback uses `max(1, len(text.strip()) // 4)` instead of `len(text) // 4` — improvement, avoids returning 0
- 2025-08-25: Added bonus utilities: `TokenProvider` enum, `clear_cache()`, `get_cache_info()`, `set_active_provider()`
- 2025-08-25: Skipped `__init__.py` exports — all call sites import directly from `core.ai.token_manager`
- 2025-08-25: Cherry-picked from `origin/feat/token-manager` (commit 52c5b06) instead of full branch merge to avoid conflicts with main cleanup
