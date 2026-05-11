# CONTEXT.md — Project Knowledge Base

> Maintained by Cline for context recovery between sessions.
> Last updated: 2026-05-11

## Stack & Infra

- **Framework:** Next.js 16 LATEST (App Router, TypeScript)
- **UI:** shadcn/ui + Tailwind CSS
- **Markdown render:** react-markdown + remark-gfm + rehype-highlight + rehype-slug
- **LLM V1:** `@anthropic-ai/claude-code` SDK via adapter pattern (`ui/src/lib/llm/`) — tool use nativo
- **LLM V2 (FUTURE):** `@anthropic-ai/sdk` direto — mais controle, sem dependência do Claude Code CLI
- **LLM seleção:** `config/app.json` campo `llm.provider` — troca sem código
- **Git ops:** simple-git npm package
- **Log format:** JSONL (`wiki/log.jsonl`)
- **Deploy:** localhost only (desenvolvimento local)

## Architecture

```
my-workbuddy/
├── config/                     # Configurações do app e LLM
│   ├── app.json                # Config geral (LLM model, paths, defaults)
│   ├── prompts/                # System prompts para a LLM (markdown)
│   │   ├── ingest.md
│   │   ├── re-ingest.md
│   │   ├── query.md
│   │   └── lint.md
│   └── templates/              # Templates de frontmatter
│       ├── transcription.md
│       ├── doc.md
│       └── note.md
├── raw/                        # Fontes brutas (imutáveis)
│   ├── config.json             # Categories padrão e relevâncias (global)
│   ├── eo/                     # Squad E&O
│   │   ├── config.json         # Meta do space (label, descrição, overrides)
│   │   ├── transcriptions/
│   │   ├── docs/
│   │   ├── decisions/
│   │   ├── people/
│   │   └── notes/
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
│   └── src/
│       ├── app/
│       │   ├── api/            # API Routes (server-side, streaming SSE)
│       │   │   ├── raw/        # GET — listar spaces/categorias
│       │   │   ├── wiki/       # GET — listar/ler páginas wiki
│       │   │   ├── ingest/     # POST — salvar raw + LLM ingest
│       │   │   ├── reingest/   # POST — re-processar raw via LLM
│       │   │   ├── chat/       # POST — query contextual via LLM (SSE)
│       │   │   └── git/        # POST — operações git
│       │   └── (pages)         # Dashboard, Ingest, Chat, Wiki, Git
│       ├── components/
│       └── lib/
│           ├── llm/            # types.ts, factory.ts, claude-code.adapter.ts
│           ├── wiki-engine.ts
│           ├── git.ts
│           ├── fs.ts
│           └── config.ts
├── LLM-WIKI.md
├── FUTURE.md
└── @todo/
    ├── CONTEXT.md              # Este arquivo
    └── workbuddy/
        ├── PLAN.md
        └── PROGRESS.md
```

### Key patterns

- **Raw structure:** `raw/[SPACE]/[CATEGORY]/[YYYY-MM-DD]-[title].md` — filesystem é source of truth
- **Config descentralizado:** `raw/config.json` (global) + `raw/[SPACE]/config.json` (override local)
- **Categorias padrão:** `docs/` (3), `decisions/` (3), `transcriptions/` (2), `people/` (2), `notes/` (1) — número = relevância
- **Hierarquia de relevância:** docs > decisions > transcriptions > people > notes
- **LLM adapter:** Interface `LLMAdapter` em `lib/llm/types.ts`, factory em `lib/llm/factory.ts`, implementação V1 em `lib/llm/claude-code.adapter.ts`
- **System prompts:** `config/prompts/*.md` — editáveis sem tocar no código
- **Chat space-aware:** Selector de space(s) prioriza busca mas não exclui outros spaces
- **Re-ingest:** Wiki pages têm `sources: []` no frontmatter; re-ingest atualiza todas as pages afetadas

## Conventions

- Arquivos raw: frontmatter YAML com `type`, `space`, `date`, `category`, `title`
- Wiki pages: frontmatter com `sources: []` (lista de raw files que originaram a página)
- Log entries JSONL: `{ date, type, source?, space?, pages_touched?, summary }`
- API key: `ANTHROPIC_API_KEY` em `ui/.env.local` (gitignored)
- Nomes de spaces: kebab-case (ex: `novos-produtos`, `eo`, `garantias`, `general`)
- Sem `AGENTS.md` — instruções LLM vivem em `config/prompts/*.md`

## Current State

- **Status:** Docs de planejamento criados e refinados
- **Em progresso:** Fase 1 — Fundação (estrutura de diretórios + config files)
- **Próximo:** Criar `.gitignore`, `raw/config.json`, spaces, `config/`, `wiki/` iniciais

## Active Decisions (ADRs)

Nenhum ADR formal criado ainda. Decisões técnicas documentadas em `@todo/workbuddy/PLAN.md#Decisions`.

## Known Pitfalls

- `ui/.env.local` deve estar no `.gitignore` — nunca commitar API keys
- Categorias de raw são dinâmicas (lidas do filesystem) — não hardcodar na UI
- Re-ingest deve rastrear `sources:` no frontmatter das wiki pages para saber quais atualizar
- Chat space-aware: quando nenhum space selecionado = busca global (não retornar vazio)
- `raw/config.json` define defaults; `raw/[SPACE]/config.json` pode sobrescrever com `categories: [...]`
