# Split AI Service — Plan

## Context

`src/services/ai_service.py` is a 1141-line god module containing 7 internal classes: `TokenCalculator`, `ContextManager`, `DisplayManager`, `ChatHistoryManager`, `APIManager`, `ChatCommandHandler`, and `AIService`. All classes are tightly co-located despite having distinct responsibilities. This makes the file hard to navigate, test in isolation, and maintain.

## Goals

- Split `ai_service.py` into a package `src/services/ai_service/` with one module per class
- `AIService` remains the facade, coordinating all other classes
- All existing imports from `services.ai_service` must continue to work via `__init__.py` re-exports
- Zero behavior change — pure structural refactor

## Scope

**In scope:**
- Move each class to its own module within `src/services/ai_service/`
- Create `__init__.py` with re-exports for backward compatibility
- Update internal imports between the split modules
- Update any imports in `src/commands/` that reference these classes

**Out of scope:**
- Changing any logic or behavior
- Renaming classes
- Refactoring the classes themselves
- Adding tests (separate TODO)

## Decisions

- **Package structure over flat files:** Using `src/services/ai_service/` instead of spreading files at `src/services/` level. This preserves context — all AI service components are clearly grouped.
- **Facade pattern preserved:** `AIService` in `service.py` is the only public-facing class. Others are implementation details.
- **Re-exports via `__init__.py`:** Ensures `from services.ai_service import AIService, ChatTurn` continues to work.

## Target Structure

```
src/services/ai_service/
├── __init__.py              — re-exports: AIService, ChatTurn
├── service.py               — AIService (facade, orchestrates all others)
├── token_calculator.py      — TokenCalculator (token budget allocation)
├── context_manager.py       — ContextManager (context retrieval and caching)
├── display_manager.py       — DisplayManager (Rich output, clipboard, file save)
├── chat_history.py          — ChatHistoryManager (conversation history, truncation)
├── api_manager.py           — APIManager (provider-agnostic AI API calls, streaming)
└── chat_commands.py         — ChatCommandHandler (slash commands: /embeddings, /history, etc.)
```

## Phases

### Phase 1: Create package structure (small)
- Create `src/services/ai_service/` directory
- Create `__init__.py` with re-exports

### Phase 2: Extract classes (medium)
- Move `ChatTurn` dataclass to `service.py` (or its own `models.py` if preferred)
- Move `TokenCalculator` → `token_calculator.py`
- Move `ContextManager` → `context_manager.py`
- Move `DisplayManager` → `display_manager.py`
- Move `ChatHistoryManager` → `chat_history.py`
- Move `APIManager` → `api_manager.py`
- Move `ChatCommandHandler` → `chat_commands.py`
- Move `AIService` → `service.py`

### Phase 3: Fix imports (small)
- Update internal imports between split modules
- Update imports in `src/commands/ask.py`, `src/commands/chat.py`
- Verify `VSCODE_MODE` constant is accessible where needed

### Phase 4: Verify (small)
- Run `make lint` to check for import errors
- Run the CLI to verify commands still work
- Delete the old `src/services/ai_service.py` file
