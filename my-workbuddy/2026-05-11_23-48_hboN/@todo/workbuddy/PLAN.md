# my-workbuddy — PLAN

## Context

O `my-workbuddy` é um repositório pessoal de conhecimento baseado no padrão LLM Wiki (descrito em `LLM-WIKI.md`). O objetivo é centralizar documentações, transcrições de reuniões e notas do dia a dia de múltiplos squads, e usar uma LLM para manter uma wiki estruturada e consultável.

O projeto combina:
1. **Repositório de fontes brutas** (`raw/`) — imutável, organizado por Space (squad/contexto) e categoria
2. **Wiki gerada pela LLM** (`wiki/`) — markdown estruturado, interligado, mantido automaticamente
3. **Configurações** (`config/`) — prompts LLM, templates, configurações do app
4. **UI local em Next.js** (`ui/`) — interface para ingest, chat contextual, visualização e gestão git

## Goals

1. Centralizar todas as fontes de conhecimento (transcrições, docs, notas) num único repositório
2. Usar LLM para processar fontes e manter uma wiki estruturada e atualizada automaticamente
3. Permitir queries contextuais rápidas (ex: "qual o último estado do assunto X?") via chat
4. Ter uma UI local amigável para uso no dia a dia (ingest, chat, visualização, git)
5. Suportar múltiplos squads/contextos com busca priorizada por space

## Scope

### In scope
- Estrutura de diretórios `raw/`, `wiki/`, `config/`
- App Next.js local (`ui/`) com 5 telas: Dashboard, Ingest, Chat, Wiki Browser, Git
- LLM adapter (`@anthropic-ai/claude-code` SDK como provider V1, padrão adapter para crescer)
- Ingest inteligente: salvar raw + LLM processa e atualiza wiki (streaming)
- Re-ingest: re-processar arquivo raw que mudou (streaming)
- Chat space-aware: priorizar busca por space selecionado (streaming SSE)
- Log de operações em JSONL
- Gestão git básica via UI

### Out of scope (FUTURE.md)
- TTL de transcrições antigas (janela de 3 meses)
- Busca semântica com embeddings
- Batch ingest de múltiplos arquivos
- Lint automático agendado
- LLM adapter V2: `@anthropic-ai/sdk` direto (mais controle, sem dependência do Claude Code CLI)
- Outros LLM providers (OpenAI, Ollama)
- Deploy remoto / multi-usuário

## Decisions

| Decisão | Escolha | Rationale |
|---|---|---|
| Pasta do app | `ui/` | Mais claro que `app/`, não conflita com App Router |
| Framework | Next.js 16 LATEST (App Router, TypeScript) | Padrão moderno, API routes built-in |
| UI Components | shadcn/ui + Tailwind | Acelera desenvolvimento, componentes customizáveis |
| Markdown render | react-markdown + remark-gfm + rehype-highlight + rehype-slug | Ecossistema maduro, suporte a GFM, syntax highlight, anchors |
| LLM API | `@anthropic-ai/claude-code` SDK via adapter pattern | Tool use nativo (lê/escreve filesystem), ideal pra ingest e chat |
| LLM seleção | `config/app.json` campo `llm.provider` | Troca de adapter sem código — só muda a config (V2 em FUTURE.md) |
| LLM streaming | Server-Sent Events (SSE) via Next.js API routes | API key no server, stream de volta pro browser |
| API Key storage | `ui/.env.local` (gitignored) + `ui/.env.example` template | Padrão Next.js, seguro por default |
| Git operations | `simple-git` npm package | Estável, cobre todos os casos de uso |
| Log format | JSONL (`wiki/log.jsonl`) | Append-only, parseável, grep-friendly, escalável |
| Raw structure | `raw/[SPACE]/[CATEGORY]/` dinâmico | Filesystem é source of truth; spaces/categorias criados conforme necessidade |
| Config de categories | `raw/config.json` (global) + `raw/[SPACE]/config.json` (override local) | Descentralizado, co-localizado com os dados |
| Schema/instruções LLM | `config/prompts/*.md` (sem AGENTS.md) | AGENTS.md é convenção do Claude Code; config/ é mais adequado pra app próprio |
| Relevância de fontes | docs > decisions > transcriptions > people > notes | Codificado em `raw/config.json` como campo `relevance` |

## Estrutura de diretórios

```
my-workbuddy/
├── .gitignore
├── config/                     # Configurações do app e LLM
│   ├── app.json                # Config geral (LLM model, paths, defaults)
│   ├── prompts/                # System prompts para a LLM (markdown)
│   │   ├── ingest.md           # Prompt para ingest de nova fonte
│   │   ├── re-ingest.md        # Prompt para re-ingest de fonte atualizada
│   │   ├── query.md            # Prompt para chat/query contextual
│   │   └── lint.md             # Prompt para health-check do wiki
│   └── templates/              # Templates de frontmatter para novos arquivos
│       ├── transcription.md
│       ├── doc.md
│       └── note.md
├── raw/                        # Fontes brutas (imutáveis)
│   ├── config.json             # Definição de categories padrão e relevâncias
│   ├── eao/                    # Squad E&O
│   │   ├── config.json         # Meta do space (label, descrição, overrides)
│   │   ├── transcriptions/
│   │   ├── docs/
│   │   ├── decisions/
│   │   ├── people/
│   │   └── notes/
│   ├── garantias/              # Squad Garantias
│   │   ├── config.json
│   │   └── (categorias)
│   ├── novos-produtos/         # Squad Novos Produtos
│   │   ├── config.json
│   │   └── (categorias)
│   └── general/                # Cross-squad, pessoal, 1:1s
│       ├── config.json
│       └── (categorias)
├── wiki/                       # Wiki gerada/mantida pela LLM
│   ├── index.md                # Índice geral de todas as páginas
│   ├── overview.md             # Visão geral consolidada
│   ├── log.jsonl               # Log de operações (append-only)
│   ├── squads/                 # Páginas por squad/space
│   ├── topics/                 # Páginas por assunto
│   ├── people/                 # Páginas por pessoa
│   ├── decisions/              # Decisões extraídas
│   └── reports/                # Docs/reports gerados via query
├── ui/                         # Next.js app (localhost:3000)
│   ├── .env.local              # API keys (gitignored)
│   ├── .env.example            # Template de variáveis
│   └── src/
│       ├── app/                # App Router
│       │   ├── page.tsx        # Dashboard
│       │   ├── ingest/page.tsx
│       │   ├── chat/page.tsx
│       │   ├── wiki/page.tsx + [...slug]/page.tsx
│       │   ├── git/page.tsx
│       │   └── api/            # API Routes (server-side)
│       │       ├── raw/route.ts
│       │       ├── wiki/route.ts
│       │       ├── ingest/route.ts     # Save raw + trigger LLM (streaming)
│       │       ├── reingest/route.ts   # Re-process raw via LLM (streaming)
│       │       ├── chat/route.ts       # Query contextual via LLM (streaming SSE)
│       │       └── git/route.ts
│       ├── components/
│       └── lib/
│           ├── llm/
│           │   ├── types.ts            # Interface LLMAdapter
│           │   ├── factory.ts          # Resolve adapter via config/app.json
│           │   └── claude-code.adapter.ts  # V1: @anthropic-ai/claude-code
│           ├── wiki-engine.ts
│           ├── git.ts
│           ├── fs.ts
│           └── config.ts
├── LLM-WIKI.md                 # Referência original (read-only)
├── FUTURE.md                   # Roadmap de features futuras
└── @todo/                      # Context management (Cline)
    ├── CONTEXT.md
    └── workbuddy/
        ├── PLAN.md             # Este arquivo
        └── PROGRESS.md
```

## Spaces iniciais

```
raw/
├── eao/             # Squad E&O
├── garantias/       # Squad Garantias
├── novos-produtos/  # Squad Novos Produtos
└── general/         # Cross-squad, pessoal, 1:1s
```

## Categorias padrão por Space

| Categoria | Propósito | Relevância |
|---|---|---|
| `docs/` | Documentação oficial/final | ⭐⭐⭐ Alta (autoritativo) |
| `decisions/` | Decisões registradas (ADR leve) | ⭐⭐⭐ Alta |
| `transcriptions/` | Transcrições de reuniões | ⭐⭐ Média (contextual) |
| `people/` | Contexto sobre pessoas | ⭐⭐ Média |
| `notes/` | Notas livres, rascunhos, brainstorms | ⭐ Baixa |

Categorias são dinâmicas — novas pastas aparecem automaticamente na UI.
Override local possível via `raw/[SPACE]/config.json`.

## Phases

### Fase 1 — Fundação (estrutura + config)
- Criar `.gitignore`
- Criar estrutura de diretórios `raw/`, `wiki/`, `config/`
- Criar `raw/config.json` (categories padrão e relevâncias)
- Criar `raw/[space]/config.json` para cada space inicial (eao, garantias, novos-produtos, general)
- Criar pastas de categorias em cada space
- Criar `config/app.json`
- Criar `config/prompts/` (ingest.md, re-ingest.md, query.md, lint.md)
- Criar `config/templates/` (transcription.md, doc.md, note.md)
- Criar `wiki/index.md`, `wiki/overview.md`, `wiki/log.jsonl`
- Criar `FUTURE.md`
- Atualizar `@todo/CONTEXT.md`

### Fase 2 — Setup UI
- Criar projeto Next.js 16 em `ui/` (App Router + TypeScript + Tailwind)
- Instalar e configurar shadcn/ui
- Criar `ui/.env.example` com template de variáveis
- Implementar layout global com sidebar (5 telas: Dashboard, Ingest, Chat, Wiki, Git)

### Fase 3 — API Routes (File System + LLM)
- `GET /api/raw` — listar spaces e categorias do filesystem
- `GET /api/wiki` — listar/ler páginas wiki
- `POST /api/ingest` — salvar arquivo raw no filesystem + opcionalmente disparar LLM (streaming SSE)
- `POST /api/reingest` — re-processar arquivo raw via LLM (streaming SSE)
- `POST /api/chat` — query contextual via LLM com space-aware search (streaming SSE)
- `POST /api/git` — operações git (status, commit, pull, push, log)

### Fase 4 — Telas básicas (sem LLM)
- Dashboard (stats básicos, últimos logs do log.jsonl)
- Ingest (form: space + category + título + data + conteúdo + "Save" / "Save & Ingest")
- Wiki Browser (lista de páginas + render markdown com links navegáveis)
- Git (status, commit, pull, push)

### Fase 5 — Inteligência LLM
- LLM adapter: `lib/llm/types.ts` (interface) + `lib/llm/factory.ts` + `lib/llm/claude-code.adapter.ts`
- Ingest inteligente: LLM lê raw → extrai info → atualiza wiki pages + log.jsonl (streaming)
- Re-ingest: re-processar arquivo raw que mudou, atualiza wiki pages com `sources` afetados
- Chat contextual: space-aware search, streaming SSE, opção de salvar resposta como report

### Fase 6 — Refinamentos
- Dashboard com stats reais (log.jsonl parsing)
- Chat com selector de space(s) e priorização visual
- Melhorias de UX (loading states, error handling, toasts)
