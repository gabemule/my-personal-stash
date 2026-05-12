# my-workbuddy — Progress

**Status:** 35/35 items · Phase: Fase 4 — Telas básicas

## Current Focus
[Fase 3 concluída — iniciando Fase 4]
Next step: Dashboard com stats reais (listSpaces + readLog)
Blocker: none

## Progress

### Fase 1 — Fundação (estrutura + config)
- [x] Criar `.gitignore`
- [x] Criar `raw/config.json` (categories padrão e relevâncias)
- [x] Criar `raw/eao/config.json` + pastas de categorias
- [x] Criar `raw/garantias/config.json` + pastas de categorias
- [x] Criar `raw/novos-produtos/config.json` + pastas de categorias
- [x] Criar `raw/general/config.json` + pastas de categorias
- [x] Criar `config/app.json`
- [x] Criar `config/prompts/ingest.md`
- [x] Criar `config/prompts/re-ingest.md`
- [x] Criar `config/prompts/query.md`
- [x] Criar `config/prompts/lint.md`
- [x] Criar `config/templates/transcription.md`
- [x] Criar `config/templates/doc.md`
- [x] Criar `config/templates/note.md`
- [x] Criar `wiki/index.md`
- [x] Criar `wiki/overview.md`
- [x] Criar `wiki/log.jsonl`
- [x] Criar `FUTURE.md`
- [x] Atualizar `@todo/CONTEXT.md`

### Fase 2 — Setup UI
- [x] Criar projeto Next.js 16 em `ui/` (App Router + TypeScript + Tailwind)
- [x] Instalar e configurar shadcn/ui
- [x] Criar `ui/.env.example`
- [x] Implementar layout global com sidebar (5 telas: Dashboard, Ingest, Chat, Wiki, Git)
- [x] Remover `ui/.git` (repo aninhado criado pelo create-next-app)

### Fase 3 — API Routes (File System + LLM)
- [x] Instalar dependências: `simple-git`, `gray-matter`
- [x] `lib/config.ts` — WORKSPACE_ROOT, getAppConfig, getRawRoot, getWikiRoot
- [x] `lib/fs.ts` — listSpaces, listRawFiles, readRawFile, writeRawFile, listWikiPages, readWikiPage, writeWikiPage, appendLog, readLog
- [x] `lib/git.ts` — getStatus, commit, pull, push, getLog (via simple-git)
- [x] `GET /api/raw` — listar spaces e categorias do filesystem
- [x] `GET /api/wiki` — listar/ler páginas wiki
- [x] `GET|POST /api/git` — status, log, commit, pull, push
- [x] `POST /api/ingest` — salvar arquivo raw no filesystem
- [x] `POST /api/reingest` — stub 501 (Fase 5)
- [x] `POST /api/chat` — stub 501 (Fase 5)
- [x] Build ✅ — 6 API routes dinâmicas

### Fase 4 — Telas básicas (sem LLM)
- [ ] Dashboard (stats reais: listSpaces + readLog)
- [ ] Ingest (form: space + category + título + data + conteúdo + "Save")
- [ ] Wiki Browser (lista de páginas + render markdown)
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
- 2026-05-11: Space `eo` renomeado para `eao` (Squad Erros & Omissões).
- 2026-05-11: `ui/.git` removido — create-next-app cria repo aninhado por default; my-workbuddy raiz é gerenciado pelo pstash.
- 2026-05-11: `ui/AGENTS.md` e `ui/CLAUDE.md` mantidos — podem ser úteis como referência.
- 2026-05-11: `/api/reingest` e `/api/chat` implementados como stubs 501 — LLM será adicionado na Fase 5.
