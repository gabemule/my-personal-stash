# my-workbuddy — Progress

**Status:** 47/47 items · Phase: Fase 5 concluída ✅

## Current Focus
[Fases 4 e 5 concluídas]
Next step: Fase 6 — Refinamentos (dashboard stats reais, UX polish)
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

### Fase 3 — API Routes (File System)
- [x] Instalar dependências: `simple-git`, `gray-matter`
- [x] `lib/config.ts` — WORKSPACE_ROOT, getAppConfig, getRawRoot, getWikiRoot
- [x] `lib/fs.ts` — listSpaces, listRawFiles, readRawFile, writeRawFile, listWikiPages, readWikiPage, writeWikiPage, appendLog, readLog
- [x] `lib/git.ts` — getStatus, commit, pull, push, getLog (via simple-git)
- [x] `GET /api/raw` — listar spaces e categorias do filesystem
- [x] `GET /api/wiki` — listar/ler páginas wiki
- [x] `GET|POST /api/git` — status, log, commit, pull, push
- [x] `POST /api/ingest` — salvar arquivo raw no filesystem
- [x] `GET /api/log` — ler log.jsonl

### Fase 4 — Telas básicas (sem LLM)
- [x] Dashboard (stats: spaces + wiki pages + quick actions)
- [x] Ingest (form: space + category + data + título + conteúdo + "Save")
- [x] Wiki Browser (lista de páginas + render markdown com react-markdown)
- [x] Git (status, commit, pull, push, log de commits)
- [x] Build ✅ — 9 API routes dinâmicas + 4 páginas estáticas

### Fase 5 — Inteligência LLM
- [x] Instalar `@anthropic-ai/sdk`, `react-markdown`, `remark-gfm`, `rehype-highlight`, `rehype-slug`
- [x] `lib/llm/types.ts` — interface LLMAdapter (stream + complete)
- [x] `lib/llm/claude.adapter.ts` — ClaudeAdapter via @anthropic-ai/sdk
- [x] `lib/llm/factory.ts` — getLLMAdapter() lê config/app.json
- [x] `POST /api/ingest/process` — streaming SSE: lê raw → LLM → escreve wiki pages + log
- [x] `POST /api/reingest` — streaming SSE: re-processa raw, atualiza páginas afetadas
- [x] `POST /api/chat` — streaming SSE: query contextual com wiki pages filtradas por space
- [x] Chat page — UI com streaming, space filter, markdown render
- [x] Ingest page — botão "Process →" com log de streaming em tempo real
- [x] Build ✅ — 10 API routes dinâmicas

### Fase 6 — Refinamentos (pendente)
- [ ] Dashboard com stats reais (log.jsonl parsing + raw file count)
- [ ] Chat com histórico de sessão (multi-turn)
- [ ] Melhorias de UX (loading states, error handling, toasts)

## Decisions Made During Execution
- 2026-05-11: Brainstorming concluído. Estrutura `raw/[SPACE]/[CATEGORY]/` dinâmica. Config descentralizado via `raw/config.json` + `raw/[SPACE]/config.json`. Sem AGENTS.md — instruções LLM em `config/prompts/*.md`. Log em JSONL. LLM via `@anthropic-ai/sdk` com adapter pattern. Streaming via SSE nas API routes do Next.js. UI em Next.js 16 + shadcn/ui. Markdown render via react-markdown + plugins.
- 2026-05-11: Space `eo` renomeado para `eao` (Squad Erros & Omissões).
- 2026-05-11: `ui/.git` removido — create-next-app cria repo aninhado por default; my-workbuddy raiz é gerenciado pelo pstash.
- 2026-05-11: `ui/AGENTS.md` e `ui/CLAUDE.md` mantidos — podem ser úteis como referência.
- 2026-05-11: LLM output format: `FILE: wiki/[slug].md\n---\n[content]\n---` para wiki pages + `LOG:\n{json}` para log entry. Parser regex no route handler.
- 2026-05-11: Chat page usa space filter (pills) para filtrar wiki pages por `frontmatter.spaces[]`.
