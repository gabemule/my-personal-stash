# Testing — Plan

## Context

The project has **zero test coverage**. The `tests/` directory contains only an empty `__init__.py`. `pytest` is listed as a dev dependency and `Makefile` has `test`/`test-watch` targets, but there are no actual tests. This is the highest-risk gap in the project — any refactoring or feature work can break things silently.

## Goals

- Establish test infrastructure and conventions
- Achieve meaningful coverage across all layers (utils, config, core, services, commands)
- Prioritize tests by risk and value — start with the most critical paths

## Scope

**In scope:**
- Test infrastructure setup (pytest config, fixtures, conftest)
- Unit tests for all layers
- Integration tests for key workflows
- Mocking strategy for external dependencies (Claude API, ChromaDB, file system)

**Out of scope:**
- E2E tests (defer to later — need stable CLI first)
- Performance/load tests
- VS Code extension tests (separate project, separate test setup)
- 100% coverage target (aim for meaningful coverage of critical paths)

## Decisions

- **pytest** as test runner (already in dev deps)
- **Co-located tests:** `tests/` directory mirroring `src/` structure
- **Fixtures over factories:** Use pytest fixtures for test data setup
- **Mock external deps:** Mock `anthropic` API calls, ChromaDB, file system where needed
- **No snapshot tests:** Not needed for a CLI tool

## Test Priority (by risk/value)

### Priority 1: Utils (foundation — everything depends on these)
These are pure functions with no external deps — easiest to test, highest leverage.

| Module | What to test |
|---|---|
| `utils/exceptions.py` | Exception hierarchy, inheritance |
| `utils/error_handler.py` | Decorator behavior for each exception type, exit codes |
| `utils/file_operations.py` | File read/write, path handling, edge cases |
| `utils/ignore_patterns.py` | Gitignore pattern matching, edge cases |
| `utils/yaml_loader.py` | YAML loading, error handling, malformed files |
| `utils/version.py` | Version string format |

### Priority 2: Config (configuration drives everything)

| Module | What to test |
|---|---|
| `config/core.py` | ConfigCore read/write/cache, file corruption handling |
| `config/settings.py` | SettingsManager get/set, defaults |
| `config/storage.py` | StorageManager paths, directory creation |
| `config/models.py` | Pydantic model validation, defaults, edge cases |
| `config/embeddings.py` | EmbeddingsManager active embeddings, selection |
| `config/languages/models.py` | LanguageConfig validation, inheritance resolution |
| `config/languages/registry.py` | Extension mapping, language detection |
| `config/providers/registry.py` | Provider registration, lookup |
| `config/constants/*.py` | Constants are correct values (sanity checks) |

### Priority 3: Core (domain logic)

| Module | What to test |
|---|---|
| `core/query/preprocessor.py` | Query normalization, stop words, synonyms, keywords |
| `core/query/result_merger.py` | Result merging, dedup, scoring, ranking |
| `core/formatting/context_formatter.py` | All output formats (ai_friendly, plain, markdown, json, xml), token counting, truncation |
| `core/chunking/langchain_adapter.py` | Chunking with different languages, separators, sizes |
| `core/chunking/protocol.py` | Protocol conformance |
| `core/embeddings/model_manager.py` | Singleton behavior, lazy loading (mock model) |
| `core/embeddings/vector_store.py` | Add/query/delete operations (mock ChromaDB or use in-memory) |
| `core/ai/ai_client_interface.py` | Factory registration, client creation |
| `core/ai/claude_client.py` | Request building, retry logic, streaming (mock API) |
| `core/ai/prompt_builder.py` | Prompt assembly per mode, file loading, security instructions |

### Priority 4: Services (orchestration)

| Module | What to test |
|---|---|
| `services/embedding_service.py` | EmbeddingService generate/select/delete, QueryService query flow |
| `services/ai_service.py` | TokenCalculator allocations, ChatHistoryManager truncation, AIService ask/chat flow |

### Priority 5: Commands (CLI layer)

| Module | What to test |
|---|---|
| `commands/generate.py` | Argument validation, request creation, error handling |
| `commands/select.py` | Direct and interactive selection |
| `commands/query.py` | Format selection, output handling |
| `commands/ask.py` | Full ask flow (mocked services) |
| `commands/chat.py` | Chat loop, slash commands |
| `commands/config.py` | CRUD operations |
| `commands/storage.py` | List/info/delete/clean operations |
| `cli.py` | Parser creation, command dispatch |

## Phases

### Phase 1: Infrastructure (small)
- Configure pytest in `pyproject.toml` (`[tool.pytest.ini_options]`)
- Create `tests/conftest.py` with shared fixtures (temp dirs, mock config, etc.)
- Create directory structure mirroring `src/`
- Add `pytest-cov` to dev deps for coverage reporting

### Phase 2: Utils tests (medium)
- Write tests for all `utils/` modules
- Target: ~90% coverage for utils

### Phase 3: Config tests (medium)
- Write tests for `config/` modules
- Mock file system where needed
- Target: ~80% coverage for config

### Phase 4: Core tests (large)
- Write tests for `core/` modules
- Mock ChromaDB, Anthropic API, sentence-transformers
- Target: ~70% coverage for core

### Phase 5: Service tests (medium)
- Write tests for `services/` modules
- Heavy mocking of dependencies
- Focus on orchestration logic, not external calls

### Phase 6: Command tests (medium)
- Write tests for `commands/` and `cli.py`
- Mock services layer
- Test argument parsing, validation, error paths
