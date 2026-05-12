# CONTEXT.md — Project Knowledge Base

> Maintained by Cline for context recovery between sessions.
> Last updated: 2026-05-11

## Stack & Infra

- **Framework:** Next.js 16 (App Router, TypeScript)
- **UI:** shadcn/ui + Tailwind CSS + sonner (toasts)
- **Markdown render:** react-markdown + remark-gfm
- **LLM:** `@anthropic-ai/sdk` via adapter pattern (`ui/lib/llm/`) — streaming SSE
- **LLM seleção:** `config/app.json` campo `llm.provider` — troca sem código
- **Git ops:** simple-git npm package
- **Log format:** JSONL (`wiki/log.jsonl`)
- **Deploy:** localhost only (desenvolvimento local)

## Architecture

```
my-workbuddy/
├── config/
│   ├── app.json                # Config geral (LLM model, paths, defaults)
│   ├── prompts/                # System prompts para a LLM (markdown)
│   │   ├── ingest.md
│   │   ├── re-ingest.md
│   │   ├── query.md
│   │   └── lint.md
│   └── templates/
│       ├── transcription.md
│       ├── doc.md
│       └── note.md
├── raw/                        # Fontes brutas (imutáveis)
│   ├── config.json             # Categories padrão e relevâncias (global)
│   ├── eao/                    # Squad E&O
│   ├── garantias/
│   ├── novos-produtos/
│   └── general/
├── wiki/                       # Wiki gerada/mantida pela LLM
│   ├── index.md
│   ├── overview.md
│   ├── log.jsonl               # Log append-only de operações
│   ├── squads/
│   ├── topics/
│   ├── people/
│   ├── decisions/
│   └── reports/
├── ui/                         # Next.js app (localhost:3000)
│   ├── app/
│   │   ├── api/
│   │   │   ├── raw/            # GET — listar spaces/categorias
│   │   │   ├── wiki/           # GET — listar/ler páginas wiki
│   │   │   ├── ingest/         # POST — salvar raw file
│   │   │   ├── ingest/process/ # POST — LLM ingest (SSE)
│   │   │   ├── reingest/       # POST — re-processar raw via LLM (SSE)
│   │   │   ├── lint/           # POST — lintar wiki pages via LLM (SSE)
│   │   │   ├── chat/           # POST — query contextual via LLM (SSE)
│   │   │   ├── git/            # GET|POST — operações git
│   │   │   └── log/            # GET — ler log.jsonl
│   │   ├── page.tsx            # Dashboard (server component, stats reais)
│   │   ├── add-file/           # Adicionar raw file + auto-ingest
│   │   ├── ingest/             # Ingest manual: lista raw files + staged
│   │   ├── lint/               # Lint wiki pages via LLM
│   │   ├── chat/               # Chat multi-turn com wiki context
│   │   ├── wiki/               # Wiki browser (markdown render)
│   │   └── git/                # Git status, commit, pull, push
│   ├── components/
│   │   ├── app-sidebar.tsx     # Sidebar com 7 itens de navegação
│   │   └── ui/                 # shadcn/ui components
│   └── lib/
│       ├── llm/                # types.ts, factory.ts, claude.adapter.ts
│       ├── fs.ts               # filesystem helpers
│       ├── git.ts              # simple-git wrapper
│       └── config.ts           # WORKSPACE_ROOT, getAppConfig, etc.
└── @todo/
    ├── CONTEXT.md              # Este arquivo
    └── workbuddy/
        ├── PLAN.md
        └── PROGRESS.md
```

### Key patterns

- **Raw structure:** `raw/[SPACE]/[CATEGORY]/[YYYY-MM-DD]-[title].md`
- **Config descentralizado:** `raw/config.json` (global) + `raw/[SPACE]/config.json` (override)
- **LLM adapter:** Interface `LLMAdapter` em `lib/llm/types.ts`, factory em `lib/llm/factory.ts`
- **System prompts:** `config/prompts/*.md` — editáveis sem tocar no código
- **Streaming:** SSE via `ReadableStream` nas API routes do Next.js
- **Chat multi-turn:** frontend envia `messages[]` completo; backend injeta wiki context na última mensagem
- **Re-ingest:** Wiki pages têm `sources: []` no frontmatter; re-ingest atualiza todas as pages afetadas
- **Dashboard:** server component puro — lê filesystem diretamente

## Conventions

- Arquivos raw: frontmatter YAML com `type`, `space`, `date`, `category`, `title`
- Wiki pages: frontmatter com `sources: []` (lista de raw files que originaram a página)
- Log entries JSONL: `{ date, type, source?, space?, pages_touched?, summary }`
- API key: `ANTHROPIC_API_KEY` em `ui/.env.local` (gitignored)
- Nomes de spaces: kebab-case (ex: `novos-produtos`, `eao`, `garantias`, `general`)
- Sem `AGENTS.md` — instruções LLM vivem em `config/prompts/*.md`

## Current State

- **Status:** Fases 1-6 concluídas ✅
- **Em progresso:** Feature — Add File / Ingest / Lint como itens separados na sidebar
- **Próximo:** Criar `/add-file`, refatorar `/ingest`, criar `/lint`, criar `POST /api/lint`

## Active Decisions (ADRs)

Nenhum ADR formal criado ainda. Decisões técnicas documentadas em `@todo/workbuddy/PROGRESS.md`.

## Known Pitfalls

- `ui/.env.local` deve estar no `.gitignore` — nunca commitar API keys
- Categorias de raw são dinâmicas (lidas do filesystem) — não hardcodar na UI
- Re-ingest deve rastrear `sources:` no frontmatter das wiki pages para saber quais atualizar
- Chat space-aware: quando nenhum space selecionado = busca global (não retornar vazio)
- `raw/config.json` define defaults; `raw/[SPACE]/config.json` pode sobrescrever com `categories: [...]`
- Dashboard é server component — não pode usar hooks React; lê filesystem diretamente
- LLM output format para ingest/reingest: `FILE: wiki/[slug].md\n---\n[content]\n---` + `LOG:\n{json}`
