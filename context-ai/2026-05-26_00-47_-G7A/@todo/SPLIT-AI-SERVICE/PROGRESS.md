# Split AI Service — Progress

**Status:** 0/4 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Create package directory and `__init__.py`
Blocker: none

## Progress

### Phase 1: Create package structure
- [ ] Create `src/services/ai_service/` directory
- [ ] Create `__init__.py` with re-exports

### Phase 2: Extract classes
- [ ] Move `ChatTurn` dataclass
- [ ] Move `TokenCalculator` → `token_calculator.py`
- [ ] Move `ContextManager` → `context_manager.py`
- [ ] Move `DisplayManager` → `display_manager.py`
- [ ] Move `ChatHistoryManager` → `chat_history.py`
- [ ] Move `APIManager` → `api_manager.py`
- [ ] Move `ChatCommandHandler` → `chat_commands.py`
- [ ] Move `AIService` → `service.py`

### Phase 3: Fix imports
- [ ] Update internal imports between split modules
- [ ] Update imports in `src/commands/ask.py`
- [ ] Update imports in `src/commands/chat.py`
- [ ] Verify `VSCODE_MODE` constant accessibility

### Phase 4: Verify
- [ ] Run `make lint` — no import errors
- [ ] Run CLI commands — no regressions
- [ ] Delete old `src/services/ai_service.py`

## Decisions Made During Execution
(none yet)
