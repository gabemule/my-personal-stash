# Split Prompt Builder — Progress

**Status:** 0/4 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Create package directory and `__init__.py`
Blocker: none

## Progress

### Phase 1: Create package structure
- [ ] Create `src/core/ai/prompts/` directory
- [ ] Create `__init__.py` with re-exports

### Phase 2: Extract classes
- [ ] Move `PromptModeConfig` → `config_loader.py`
- [ ] Move `PromptConfigLoader` → `config_loader.py`
- [ ] Move `YamlLoader` → `yaml_loader.py` (evaluate dedup with `utils/yaml_loader.py`)
- [ ] Move `ModeConfigValidator` → `validators.py`
- [ ] Move `ModeFileValidator` → `validators.py`
- [ ] Move `PromptFileLoader` → `file_loader.py`
- [ ] Move `PromptBuilder` → `builder.py`

### Phase 3: Fix imports
- [ ] Update internal imports between split modules
- [ ] Update `src/core/ai/__init__.py` re-exports
- [ ] Update imports in consumers

### Phase 4: Verify
- [ ] Run `make lint` — no import errors
- [ ] Run CLI commands — prompt building works
- [ ] Delete old `src/core/ai/prompt_builder.py`

## Decisions Made During Execution
(none yet)
