# Future Roadmap — Plan

## Context

This document captures future enhancement ideas for the product vision. These are **not scheduled for immediate work** — they represent where the project should go after the current round of refactoring and infrastructure TODOs is complete.

None of these items have a PROGRESS.md because they are not active. When one is picked up, create a dedicated `@todo/[FEATURE]/` folder with its own PLAN.md and PROGRESS.md.

## Prerequisites

All items below assume the current TODO backlog is complete:
- REMOVE-DEAD-CODE, TOKEN-MANAGER, SCORING-ALGORITHM (code quality)
- SPLIT-AI-SERVICE, SPLIT-PROMPT-BUILDER (architecture)
- UV-LOCK-FILE, TESTING, CI-CD-HOOKS (infrastructure)
- CONFIG-REFACTOR, VSCODE-REFACTOR (cleanup)

---

## Roadmap Items

### 1. Smart Query Processing

Transform basic query preprocessing into a context-aware, intelligent query processing system.

**Sub-features:**

#### 1a. Context Detection Engine
- Detect programming languages, frameworks, and domains from query text
- Build detection mappings from existing `languages.yaml` configuration
- Output a `TechnicalContext` dataclass (languages, frameworks, domains, patterns, confidence)
- Feed `technology_stack` into the prompt builder for automatic guidelines selection

#### 1b. Smart Expansion Engine
- Context-aware synonym expansion (e.g., React queries expand with hooks/JSX terms, not SQL terms)
- Strategy pattern: per-framework and per-domain expansion strategies
- Replaces current naive synonym expansion that adds noise

#### 1c. Intent Analysis System
- Classify query intent: tutorial, troubleshooting, reference, patterns, comparison
- Signal-based detection ("how to" → tutorial, "error" → troubleshooting)
- Intent-based search optimization (e.g., troubleshooting boosts error-handling code)

#### 1d. Progressive Enhancement Pipeline
- Decorator-based pipeline: Basic → Context-Aware → Intent-Aware → Smart
- Each layer adds intelligence while maintaining fallback to the previous layer
- Backward-compatible with current `QueryPreprocessor`

**Estimated effort:** 4-8 weeks (4 phases)
**Expected impact:** ~10x improvement in query relevance, <50ms overhead

---

### 2. File Retrieval Intelligence

Determine when to retrieve complete files vs. individual chunks based on query intent.

- Config files (.yaml, .json, .env) → always full file
- Documentation (.md) → prefer full file
- Large code files → chunks with overlap
- Architecture queries → multi-file cross-reference
- Signal detection: "full implementation", "complete code", "config file" → file-level retrieval

**Estimated effort:** 1-2 weeks
**Expected impact:** Better context quality for config/doc queries

---

### 3. Multilingual Framework Enhancement

Extend current en/pt_br dictionary support to a full multilingual framework.

- `LanguageDictionary` ABC with `get_synonyms()`, `get_stop_words()`, `get_programming_keywords()`
- `LanguageRegistry` with runtime registration (OCP)
- `LanguageDetector` — heuristic-based query language detection
- Cross-language expansion (query in Portuguese, expand synonyms in English too)
- Template for adding new languages (es, fr, de, ja, zh, ru)

**Estimated effort:** 2-3 weeks
**Expected impact:** Better non-English query support

---

### 4. Query Domain Unification

Move `context_formatter.py` from `src/core/formatting/` into `src/core/query/` to unify the query processing domain.

Current:
```
src/core/query/          # query preprocessing
src/core/formatting/     # context formatting (separate)
```

Target:
```
src/core/query/
├── preprocessor.py
├── smart_processor.py   # NEW
├── intent_analyzer.py   # NEW
├── result_merger.py
├── context_formatter.py # MOVED from core/formatting/
├── retrieval_strategy.py # NEW
├── dictionary/
└── models/
```

**Estimated effort:** 1 week (mostly moving + updating imports)
**Expected impact:** Cleaner domain boundaries

---

### 5. Additional Provider Support

Extend `TokenManager` and `AIClientInterface` to support providers beyond Claude.

- OpenAI GPT-4 / GPT-4o integration
- Provider-specific token counting (tiktoken for OpenAI, anthropic tokenizer for Claude)
- Provider registry with dynamic switching
- Unified response format across providers

**Estimated effort:** 2-4 weeks per provider
**Expected impact:** Multi-LLM support

---

## Priority Guidance

When picking the next item from this roadmap:

1. **Smart Query Processing (1a-1d)** has the highest user-facing impact
2. **File Retrieval Intelligence (2)** is a quick win with clear value
3. **Query Domain Unification (4)** is prep work for Smart Query — do it first if pursuing (1)
4. **Multilingual (3)** and **Providers (5)** are independent and can be done anytime
