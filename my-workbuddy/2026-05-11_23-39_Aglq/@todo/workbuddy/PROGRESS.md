# my-workbuddy — Progress

**Status:** 0/35 items · Phase: Fase 1 — Fundação

## Current Focus
[Iniciando implementação]
Next step: Criar estrutura de diretórios + config files (Fase 1)
Blocker: none

## Progress

### Fase 1 — Fundação (estrutura + config)
- [ ] Criar `.gitignore`
- [ ] Criar `raw/config.json` (categories padrão e relevâncias)
- [ ] Criar `raw/eo/config.json` + pastas de categorias
- [ ] Criar `raw/garantias/config.json` + pastas de categorias
- [ ] Criar `raw/novos-produtos/config.json` + pastas de categorias
- [ ] Criar `raw/general/config.json` + pastas de categorias
- [ ] Criar `config/app.json`
- [ ] Criar `config/prompts/ingest.md`
- [ ] Criar `config/prompts/re-ingest.md`
- [ ] Criar `config/prompts/query.md`
- [ ] Criar `config/prompts/lint.md`
- [ ] Criar `config/templates/transcription.md`
- [ ] Criar `config/templates/doc.md`
- [ ] Criar `config/templates/note.md`
- [ ] Criar `wiki/index.md`
- [ ] Criar `wiki/overview.md`
- [ ] Criar `wiki/log.jsonl`
- [ ] Criar `FUTURE.md`
- [ ] Atualizar `@todo/CONTEXT.md`

### Fase 2 — Setup UI
- [ ] Criar projeto Next.js 16 em `ui/` (App Router + TypeScript + Tailwind)
- [ ] Instalar e configurar shadcn/ui
- [ ] Criar `ui/.env.example`
- [ ] Implementar layout global com sidebar (5 telas: Dashboard, Ingest, Chat, Wiki, Git)

### Fase 3 — API Routes (File System + LLM)
- [ ] `GET /api/raw` — listar spaces e categorias do filesystem
- [ ] `GET /api/wiki` — listar/ler páginas wiki
- [ ] `POST /api/ingest` — salvar raw + opcionalmente disparar LLM (streaming SSE)
- [ ] `POST /api/reingest` — re-processar raw via LLM (streaming SSE)
- [ ] `POST /api/chat` — query contextual via LLM com space-aware search (streaming SSE)
- [ ] `POST /api/git` — operações git (status, commit, pull, push, log)

### Fase 4 — Telas básicas (sem LLM)
- [ ] Dashboard (stats básicos, últimos logs do log.jsonl)
- [ ] Ingest (form: space + category + título + data + conteúdo + "Save" / "Save & Ingest")
- [ ] Wiki Browser (lista de páginas + render markdown com links navegáveis)
- [ ] Git (status, commit, pull, push)

### Fase 5 — Inteligência LLM
- [ ] LLM adapter: `lib/llm/types.ts` + `lib/llm/factory.ts` + `lib/llm/claude-code.adapter.ts`
- [ ] Ingest inteligente: LLM lê raw → extrai info → atualiza wiki pages + log.jsonl (streaming)
- [ ] Re-ingest: re-processar raw que mudou, atualiza wiki pages com `sources` afetados
- [ ] Chat contextual: space-aware search, streaming SSE, opção de salvar resposta como report

### Fase 6 — Refinamentos
- [ ] Dashboard com stats reais (log.jsonl parsing)
- [ ] Chat com selector de space(s) e priorização visual
- [ ] Melhorias de UX (loading states, error handling, toasts)

## Decisions Made During Execution
- 2026-05-11: Brainstorming concluído. Estrutura `raw/[SPACE]/[CATEGORY]/` dinâmica. Config descentralizado via `raw/config.json` + `raw/[SPACE]/config.json`. Sem AGENTS.md — instruções LLM em `config/prompts/*.md`. Log em JSONL. LLM via `@anthropic-ai/claude-code` SDK com adapter pattern (V1). Streaming via SSE nas API routes do Next.js. UI em Next.js 16 + shadcn/ui. Markdown render via react-markdown + plugins.
