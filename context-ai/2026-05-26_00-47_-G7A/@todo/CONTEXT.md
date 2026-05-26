# CONTEXT.md — Project Knowledge Base

> Maintained by AI for context recovery between sessions.
> Last updated: 2025-05-25

## Stack & Infra

- **Language:** Python >=3.9, <3.13 (CLI), TypeScript (VS Code extension)
- **AI:** Anthropic Claude API via `anthropic` SDK
- **Embeddings:** sentence-transformers (local model)
- **Vector DB:** ChromaDB (local persistent storage at `~/.context-ai/storage/`)
- **Chunking:** LangChain text-splitters (language-aware)
- **CLI:** argparse + Rich (terminal UI)
- **Config validation:** Pydantic v2
- **Token counting:** tiktoken
- **Package:** `context-ai-alpha` on PyPI, `setuptools` backend
- **Dev tools:** pytest, black, flake8, isort, autoflake, mypy

## Architecture

- **Pattern:** Modular Monolith with Clean Architecture layers
- **Layers:** `commands/` → `services/` → `core/` → `config/` + `utils/`
- **Entry point:** `src/cli.py` → `main()` (registered as `context-ai` console script)
- **Key abstractions:** `AIClientInterface`, `ChunkerProtocol`, `ProviderProtocol`, `ConfigManagerProtocol`
- **Singleton pattern:** `ConfigCore`, `SettingsManager`, `StorageManager`, `LanguagesRegistry`, `ModelManager`
- **VS Code extension:** Separate sub-project in `context-ai-vscode/`, communicates via env var `CONTEXT_AI_VSCODE`

## Conventions

- Python files: `snake_case.py`, classes: `PascalCase`, constants: `SCREAMING_SNAKE_CASE`
- Private members: `_prefix`
- Factory functions: `get_<thing>()` for singletons
- Commands: `add_<cmd>_parser()` + `execute_<cmd>_command()` pattern
- Error handling: `handle_command_errors` decorator wraps all commands
- Docstrings on every module, class, and public function

## Current State

- **Working:** All 7 CLI commands (generate, select, query, ask, chat, config, storage)
- **Working:** 4 prompt modes (minimal, standard, comprehensive, strict)
- **Working:** Language-aware chunking with configurable separators
- **Working:** Cross-collection query with result merging
- **Missing:** Zero test coverage
- **Missing:** No CI/CD pipeline
- **Missing:** No Python lock file
- **In progress:** VS Code extension (early stage)

## Active TODOs

Recommended execution order (top to bottom). Dependencies noted in last column.

| # | Feature | Status | Priority | Dependencies / Notes |
|---|---|---|---|---|
| 1 | `@todo/REMOVE-DEAD-CODE/` | Not started | Medium | **Do first** — quick win, removes noise before other refactors |
| 2 | `@todo/TOKEN-MANAGER/` | Not started | Medium | Centralizes 3-4 duplicate token counting implementations + budget logic into single `TokenManager` |
| 3 | `@todo/SCORING-ALGORITHM/` | Not started | High | **Before TESTING** — fixes multi-query bug + scoring flaws |
| 4 | `@todo/SPLIT-AI-SERVICE/` | Not started | Medium | **Before TESTING** — easier to write tests for split modules than a 1141-line god module |
| 5 | `@todo/SPLIT-PROMPT-BUILDER/` | Not started | Medium | **Before TESTING** — same reasoning. Can run in parallel with #4 |
| 6 | `@todo/UV-LOCK-FILE/` | Not started | High | **Before CI-CD-HOOKS** — CI pipeline needs reproducible installs via lock file |
| 7 | `@todo/TESTING/` | Not started | High | **After #3, #4, #5** — tests are easier to write after scoring is fixed and god modules are split |
| 8 | `@todo/CI-CD-HOOKS/` | Not started | High | **After #6, #7** — CI pipeline runs tests (needs #7) with locked deps (needs #6) |
| 9 | `@todo/CONFIG-REFACTOR/` | Not started | Medium | **After TESTING** — resolve circular deps, add singleton resets, config validation. Needs tests to verify safely |
| 10 | `@todo/VSCODE-REFACTOR/` | Not started | Low | Independent — split ChatViewProvider god class into focused services. Separate sub-project |
| 11 | `@todo/DOCS-CLEANUP/` | Not started | Low | Independent — fix broken doc refs, package name inconsistency, stub commands, tighten deps |

**Future:** `@todo/FUTURE/PLAN.md` — roadmap items (Smart Query Processing, File Retrieval Intelligence, Multilingual Framework, Query Domain Unification, Additional Providers, Tree-sitter Chunking). Not scheduled until current backlog is clear.

**Dependency graph:**
```
#1 REMOVE-DEAD-CODE ──┐
#2 TOKEN-MANAGER       │  (independent, anytime)
#3 SCORING-ALGORITHM ──┤
#4 SPLIT-AI-SERVICE ───┼──→ #7 TESTING ──→ #8 CI-CD-HOOKS ──→ #9 CONFIG-REFACTOR
#5 SPLIT-PROMPT-BUILDER┘         ↑
#6 UV-LOCK-FILE ─────────────────┘

#10 VSCODE-REFACTOR (independent, separate sub-project)
#11 DOCS-CLEANUP (independent, anytime)
```

## Known Pitfalls

- `src/services/ai_service.py` is 1141 lines with 7 internal classes (god module)
- `src/core/ai/prompt_builder.py` is 910 lines (god module)
- Stub `AIService` in `embedding_service.py` (dead code, name collision)
- `_token_cache` in `context_formatter.py` grows unbounded (fix tracked in TOKEN-MANAGER)
- 3-4 different token counting implementations give inconsistent results (fix tracked in TOKEN-MANAGER)
- Masked circular deps in config layer via lazy imports (fix tracked in CONFIG-REFACTOR)
- 4 singletons missing `reset_*()` functions (fix tracked in CONFIG-REFACTOR)
- `ChatViewProvider` in VS Code extension is a god class (fix tracked in VSCODE-REFACTOR)
- PyPI package name is `context-ai-alpha` but README says `pip install context-ai`
