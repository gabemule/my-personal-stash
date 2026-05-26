# Token Manager Centralization — Progress

**Status:** 0/4 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Create `src/core/ai/token_manager.py` with core counting + budget logic
Blocker: none

## Progress

### Phase 1: Create TokenManager
- [ ] Create `src/core/ai/token_manager.py` with count_tokens (tiktoken + lru_cache)
- [ ] Add fallback estimation when tiktoken unavailable
- [ ] Migrate `calculate_context_allocation` from TokenCalculator
- [ ] Migrate `calculate_response_tokens` from TokenCalculator
- [ ] Add `should_use_streaming` helper
- [ ] Add `get_token_manager()` singleton
- [ ] Update `src/core/ai/__init__.py` exports

### Phase 2: Migrate call sites
- [ ] `context_formatter.py` → `get_token_manager().count_tokens()`
- [ ] `prompt_builder.py` → `get_token_manager().count_tokens()`
- [ ] `langchain_adapter.py` → `get_token_manager().count_tokens()`
- [ ] `ai_service.py` → `get_token_manager()` (budget methods)
- [ ] Search & migrate any other call sites

### Phase 3: Clean up dead code
- [ ] Remove `_token_cache` dict from `context_formatter.py`
- [ ] Remove `TokenCalculator` class from `ai_service.py`
- [ ] Remove `_estimate_token_count` from `langchain_adapter.py`
- [ ] Remove orphaned imports
- [ ] Run `make lint`

### Phase 4: Verify
- [ ] Manual test: `context-ai ask`
- [ ] Manual test: `context-ai chat`
- [ ] Verify consistent token counts across paths

## Decisions Made During Execution
(none yet)
