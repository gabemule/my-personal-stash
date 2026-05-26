# Split Prompt Builder — Plan

## Context

`src/core/ai/prompt_builder.py` is a 910-line module containing multiple classes: `PromptModeConfig`, `YamlLoader`, `ModeConfigValidator`, `ModeFileValidator`, `PromptConfigLoader`, `PromptFileLoader`, and `PromptBuilder`. These handle prompt template loading, validation, mode configuration, and prompt assembly. The file is too large for a single module.

## Goals

- Split `prompt_builder.py` into a package `src/core/ai/prompts/` with one module per responsibility
- `PromptBuilder` remains the main public interface
- All existing imports from `core.ai.prompt_builder` must continue to work via re-exports
- Zero behavior change — pure structural refactor

## Scope

**In scope:**
- Move each class to its own module within `src/core/ai/prompts/`
- Create `__init__.py` with re-exports for backward compatibility
- Update internal imports
- Update imports in consumers (`src/core/ai/__init__.py`, `src/services/ai_service.py`)

**Out of scope:**
- Changing any logic or behavior
- Renaming classes
- Refactoring class internals
- Adding tests (separate TODO)

## Decisions

- **Package `src/core/ai/prompts/`:** Groups all prompt-related logic under one namespace. Avoids cluttering `src/core/ai/` with many loose files.
- **Keep `YamlLoader` here vs reuse `utils/yaml_loader.py`:** Evaluate during execution — if they're identical, consolidate. If prompt-specific, keep local.

## Target Structure

```
src/core/ai/prompts/
├── __init__.py              — re-exports: PromptBuilder, get_prompt_builder
├── builder.py               — PromptBuilder (main orchestrator)
├── config_loader.py         — PromptConfigLoader, PromptModeConfig
├── file_loader.py           — PromptFileLoader
├── validators.py            — ModeConfigValidator, ModeFileValidator
└── yaml_loader.py           — YamlLoader (if prompt-specific, otherwise import from utils)
```

## Phases

### Phase 1: Create package structure (small)
- Create `src/core/ai/prompts/` directory
- Create `__init__.py` with re-exports

### Phase 2: Extract classes (medium)
- Move `PromptModeConfig` → `config_loader.py`
- Move `PromptConfigLoader` → `config_loader.py`
- Move `YamlLoader` → `yaml_loader.py` (or remove if duplicates `utils/yaml_loader.py`)
- Move `ModeConfigValidator` → `validators.py`
- Move `ModeFileValidator` → `validators.py`
- Move `PromptFileLoader` → `file_loader.py`
- Move `PromptBuilder` → `builder.py`

### Phase 3: Fix imports (small)
- Update internal imports between split modules
- Update `src/core/ai/__init__.py` re-exports
- Update imports in `src/services/ai_service.py` and any other consumers

### Phase 4: Verify (small)
- Run `make lint` to check for import errors
- Run the CLI to verify prompt building still works
- Delete the old `src/core/ai/prompt_builder.py` file
