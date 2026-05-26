# Remove Dead Code — Plan

## Context

`src/services/embedding_service.py` contains a stub `AIService` class (lines ~739-760) with TODO comments (`# TODO: Implement actual AI integration`, `# TODO: Implement actual chat`). This is a leftover/duplicate of the fully implemented `AIService` in `src/services/ai_service.py`. It creates a name collision and is confusing.

## Goals

- Remove the stub `AIService` class from `src/services/embedding_service.py`
- Verify no code references this stub
- Clean removal with zero behavior change

## Scope

**In scope:**
- Delete the stub `AIService` class (lines ~739-760) from `embedding_service.py`
- Search for any imports of `AIService` from `embedding_service` and update them
- Remove any related unused imports in `embedding_service.py`

**Out of scope:**
- Refactoring `embedding_service.py` further
- Splitting `embedding_service.py` into separate modules (could be a future TODO)

## Phases

### Phase 1: Verify no consumers (small)
- Search codebase for `from services.embedding_service import AIService`
- Search for `from services.embedding_service import *`
- Confirm no code depends on the stub

### Phase 2: Remove (small)
- Delete the stub `AIService` class from `embedding_service.py`
- Remove any imports that were only used by the stub

### Phase 3: Verify (small)
- Run `make lint`
- Run CLI to confirm no regressions
