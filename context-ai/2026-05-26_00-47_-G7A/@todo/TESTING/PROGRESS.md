# Testing — Progress

**Status:** 0/6 phases · Phase: Not started

## Current Focus
Not started yet.
Next step: Configure pytest in `pyproject.toml` and create `tests/conftest.py`
Blocker: none

## Progress

### Phase 1: Infrastructure
- [ ] Configure pytest in `pyproject.toml`
- [ ] Create `tests/conftest.py` with shared fixtures
- [ ] Create test directory structure mirroring `src/`
- [ ] Add `pytest-cov` to dev deps

### Phase 2: Utils tests
- [ ] `test_exceptions.py`
- [ ] `test_error_handler.py`
- [ ] `test_file_operations.py`
- [ ] `test_ignore_patterns.py`
- [ ] `test_yaml_loader.py`
- [ ] `test_version.py`

### Phase 3: Config tests
- [ ] `test_core.py` (ConfigCore)
- [ ] `test_settings.py` (SettingsManager)
- [ ] `test_storage.py` (StorageManager)
- [ ] `test_models.py` (Pydantic models)
- [ ] `test_embeddings.py` (EmbeddingsManager)
- [ ] `test_languages_models.py`
- [ ] `test_languages_registry.py`
- [ ] `test_providers_registry.py`

### Phase 4: Core tests
- [ ] `test_preprocessor.py` (QueryPreprocessor)
- [ ] `test_result_merger.py` (ResultMerger)
- [ ] `test_context_formatter.py` (ContextFormatter)
- [ ] `test_langchain_adapter.py` (LangChainChunker)
- [ ] `test_model_manager.py` (ModelManager)
- [ ] `test_vector_store.py` (VectorStore)
- [ ] `test_ai_client_interface.py` (AIClientFactory)
- [ ] `test_claude_client.py` (ClaudeClient)
- [ ] `test_prompt_builder.py` (PromptBuilder)

### Phase 5: Service tests
- [ ] `test_embedding_service.py`
- [ ] `test_query_service.py`
- [ ] `test_ai_service.py`

### Phase 6: Command tests
- [ ] `test_generate.py`
- [ ] `test_select.py`
- [ ] `test_query.py`
- [ ] `test_ask.py`
- [ ] `test_chat.py`
- [ ] `test_config.py`
- [ ] `test_storage.py`
- [ ] `test_cli.py`

## Decisions Made During Execution
(none yet)
