# MONOREPO.md — Layout, dev workflow e estratégia de distribuição

> **Doc do projeto `llm-wiki`** (esse repo). Define **infraestrutura**:
> como o repositório é organizado, como rodar localmente, como
> publicar. **Não fala de implementação dos módulos** — isso fica
> em docs próprios (`API.md`, `WEB-UI.md`, `CLI.md`) quando cada
> módulo começar a tomar forma.
>
> Status: **proposta**. Hoje o repo é monolítico (CLI scaffolder
> + template). Esse doc descreve para onde vamos migrar.
>
> **Diretriz tonal**: igual `CLAUDE-SKILLS.md` e `OBSIDIAN.md` —
> feedback honesto, escopo mínimo, decisão por dor real e não por
> entusiasmo.

---

## 1. Motivação

Hoje `llm-wiki/` é uma CLI única que copia um template para um
diretório novo. Funciona, mas não dá pra encaixar dentro disso
três coisas que estão chegando:

1. **`api/`** — servidor Node (Express + WebSocket) que liga
   Anthropic API ↔ filesystem do vault. Tem chat-loop, tools,
   streaming. É **código de aplicação com runtime**.
2. **`web-ui/`** — frontend React/Vite/shadcn que conversa com a
   `api/`. Build próprio, deps próprias, hot reload próprio.
3. **`cli/`** — o scaffolder atual, mas reorganizado: ele passa
   a ser uma das peças do conjunto, não o repo inteiro.

Os três são **independentes** (versão própria, deps próprias,
ciclo próprio), mas se desenvolvem **juntos** — `web-ui/` consome
contratos de `api/`, `cli/` precisa saber das duas pra fazer
scaffold. Esse é o caso de uso clássico de monorepo.

Adicionalmente, queremos **`source-base/`** na raiz como vault de
teste local, e **`sourcebase.config.json`** como configuração ativa
do projeto (qual preset, qual idioma, etc).

**Não-motivações** (não justificam essa migração):
- Performance. Não tem build pesada nem testes lentos hoje.
- Abstração. Não estamos reaproveitando código entre módulos
  agora (a não ser tipos, que workspaces resolvem grátis).
- Modismo. Monorepo só vale aqui porque temos um problema real
  de "três módulos que coevoluem".

---

## 2. Layout-alvo

```
llm-wiki/                            ← raiz do monorepo
├── package.json                      ← workspaces: ["cli", "api", "web-ui"]
├── package-lock.json
├── sourcebase.config.json            ← config ATIVA do ambiente local
├── tsconfig.json                     ← base, módulos estendem
├── .gitignore                        ← ignora node_modules, dist, etc
│
├── DECISIONS.md                      ← decisões vigentes do projeto
├── MONOREPO.md                       ← este doc
├── CLAUDE-SKILLS.md                  ← catálogo de skills do oráculo
├── OBSIDIAN.md                       ← plugins do Obsidian
├── README.md                         ← README público no npm
├── LICENSE
│
├── config/                           ← PASTA (não é módulo)
│   ├── presets/
│   │   ├── default.json
│   │   ├── book.json
│   │   ├── project.json
│   │   ├── research.json
│   │   └── pkm.json
│   └── schemas/
│       └── sourcebase.config.schema.json
│
├── source-base/                      ← VAULT de teste local
│   ├── raw/                          ← fontes mock pra testar
│   └── wiki/                         ← seed do oráculo
│
├── cli/                              ← MÓDULO npm (publicado)
│   ├── package.json                  ← name: "create-source-base"
│   ├── bin/cli.mjs                   ← scaffolder
│   └── src/                          ← (futuro) lógica auxiliar
│
├── api/                              ← MÓDULO npm (publicado V2)
│   ├── package.json                  ← name: "@llm-wiki/api"
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts                 ← Express + ws
│       ├── chat-session.ts           ← chat-loop com Anthropic SDK
│       └── tools/
│           ├── fs-tool.ts
│           ├── wiki-tool.ts
│           └── oracle-tool.ts
│
├── web-ui/                           ← MÓDULO npm (publicado V2)
│   ├── package.json                  ← name: "@llm-wiki/web-ui"
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── routes/                   ← /, /wiki/*, /raw/*
│       └── components/               ← shadcn + custom
│
└── scripts/                          ← scripts da raiz (orquestração)
    ├── config-use.mjs                ← troca preset local
    └── reset-source-base.mjs         ← regenera source-base/ vazio
```

### Glossário

- **Módulo**: pasta com `package.json` próprio, listada em
  `workspaces`. Pode virar pacote npm publicável no futuro. Tem
  três: `cli`, `api`, `web-ui`.
- **Pasta**: organização de arquivos, sem `package.json`. São
  duas: `config/` (configs reutilizáveis) e `source-base/` (vault
  de teste). Não viram pacote.
- **Raiz**: orquestra. Tem `package.json` com workspaces, scripts
  globais (`dev`, `build`, `config:use`, etc), e os docs de
  projeto.

---

## 3. `sourcebase.config.json` — single source of truth

Um arquivo na raiz controla **qual configuração** o ambiente local
está usando. Os módulos `api/` e `web-ui/` leem ele em runtime,
nunca hardcodam decisão.

### Exemplo

```json
{
  "$schema": "./config/schemas/sourcebase.config.schema.json",
  "preset": "default",
  "language": "pt-br",
  "model": "claude-sonnet-4-5",
  "vaultPath": "./source-base",
  "name": "Sandbox",
  "domain": "ambiente de desenvolvimento"
}
```

### Como cada módulo usa

| Módulo    | Lê o quê                                                  | Para                                   |
| --------- | --------------------------------------------------------- | -------------------------------------- |
| `api/`    | `vaultPath`, `model`, `preset`, `language`                | bootar o chat-loop, sandboxar paths    |
| `web-ui/` | `language`, `name`, `domain`                              | i18n, header, branding mínimo          |
| `cli/`    | só **gera** esse arquivo no scaffold                      | converter escolhas do prompt em JSON   |

### Schema

Vive em `config/schemas/sourcebase.config.schema.json`, validado
em runtime via `ajv` (única dep extra, leve). Se o arquivo está
inválido, módulos falham rápido com mensagem clara — não
silenciosamente.

### Trocando preset local

Comando na raiz:

```bash
npm run config:use book
```

Reescreve `sourcebase.config.json` apontando preset = `book`.
Implementação é trivial (~10 linhas em `scripts/config-use.mjs`).
api/ e web-ui/ recarregam config no próximo request (ou no F5 do
browser), sem precisar reiniciar.

---

## 4. Workflow de desenvolvimento local

### Setup inicial (uma vez)

```bash
git clone …/llm-wiki
cd llm-wiki
npm install                 # workspaces resolvem symlinks de api↔web-ui
npm run source-base:reset   # cria source-base/ com fontes mock
```

### Loop diário

```bash
npm run dev
```

Por baixo (na raiz):
```json
{
  "scripts": {
    "dev": "concurrently -n api,web -c blue,green \"npm:dev:api\" \"npm:dev:web\"",
    "dev:api": "npm run dev -w @llm-wiki/api",
    "dev:web": "npm run dev -w @llm-wiki/web-ui"
  }
}
```

`api/` sobe em `:3001` (tsx watch). `web-ui/` sobe em `:5173` (Vite dev).
Browser em `http://127.0.0.1:5173`. Conversa pelo websocket
`ws://127.0.0.1:3001/chat`. Lê e escreve em `./source-base/`.

### Edição

- Mexeu em `api/src/...`? `tsx` reinicia, próxima request usa
  código novo.
- Mexeu em `web-ui/src/...`? Vite faz hot reload, browser atualiza.
- Mexeu em `config/presets/...`? Recarrega no próximo request.
- Mexeu em `sourcebase.config.json`? Idem.

### Trocar preset

```bash
npm run config:use research
```

E continua editando, sem reiniciar nada.

### Por que não tem `dev-vault/` separado nem `npm link`

- `source-base/` na raiz é **o** vault de teste. Não precisa de
  outro.
- Os módulos se referem por nome (`@llm-wiki/api`) graças aos
  workspaces. `npm link` não entra em cena.

---

## 5. Estratégia de distribuição (V1 → V2)

### V1 — Hoje em diante: scaffolder copia o repo inteiro

A CLI (`create-source-base`) copia o monorepo todo (menos
`source-base/`, `node_modules/`, docs internos), troca placeholders
e gera um `sourcebase.config.json` baseado nas escolhas do prompt.
O usuário fica com:

```
meu-oraculo/                          ← gerado
├── package.json                      ← workspaces igual ao nosso
├── sourcebase.config.json            ← gerado pelo scaffold
├── source-base/
│   ├── raw/                          ← vazio (.gitkeep)
│   └── wiki/                         ← seed do preset
├── config/                           ← copiado integral
├── api/                              ← copiado integral
└── web-ui/                           ← copiado integral
```

Aí ele roda `npm install` + `npm run dev` e pronto.

**Vantagens**:
- Simples de implementar (lógica do scaffolder é "copiar e renomear").
- Loop dev = loop prod (o usuário desenvolve no mesmo layout que
  nós).
- Customizável: quem quer mudar a UI, mexe em `web-ui/` direto.

**Desvantagens**:
- Cada oráculo carrega ~200MB de `node_modules` quando rodar `npm
  install`.
- Bug fix em `api/` não propaga automaticamente — usuário precisa
  regerar oráculo ou copiar arquivos manualmente.
- PM pode quebrar código de `api/` ou `web-ui/` acidentalmente.

### V2 — Futuro: scaffolder instala libs npm publicadas

Quando `api/` e `web-ui/` estiverem estáveis, publicamos:
- `@llm-wiki/api` no npm;
- `@llm-wiki/web-ui` no npm (ou bundlado dentro do api, decidir).

A CLI passa a gerar um oráculo **leve**:

```
meu-oraculo/                          ← gerado
├── package.json                      ← deps: { "@llm-wiki/api", "@llm-wiki/web-ui" }
├── sourcebase.config.json
└── source-base/
    ├── raw/
    └── wiki/
```

Roda `npm install` (baixa libs do npm, ~50MB) e `npm start` (que
chama binário do `@llm-wiki/api`, que serve `@llm-wiki/web-ui`
como assets).

**Vantagens**:
- Bug fix → `npm update` no oráculo. PM nunca toca código.
- Oráculos pequenos (sem código duplicado).
- Atualização independente: nova feature de `web-ui` chega via
  publicação, sem mexer no api.

**Desvantagens**:
- Cada release exige `npm publish` (ferramenta como `changesets`
  resolve depois).
- Customização vira "fork do api/web-ui ou abre PR no upstream",
  mais alto.

### Quando migrar V1 → V2

Decisão pendente em §8.1. Default: **espera dor real** — quando
o primeiro usuário pedir update sem regenerar.

---

## 6. Tooling

### Sim

| Ferramenta            | Para                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| **npm workspaces**    | Resolução de pacotes locais (`@llm-wiki/api` ↔ `@llm-wiki/web-ui`).   |
| **`concurrently`**    | Rodar `api/` e `web-ui/` em paralelo no `npm run dev`.                |
| **`tsx`**             | Rodar TypeScript em dev, sem build, com watch.                        |
| **`ajv`**             | Validar `sourcebase.config.json` contra schema em runtime.            |
| **`vite`**            | Build/dev do `web-ui/` (hot reload, build estático).                  |

### Não (com justificativa)

| Ferramenta            | Por que não                                                           |
| --------------------- | --------------------------------------------------------------------- |
| **Turborepo**         | Overkill para 3 módulos. Brilha com 10+ pacotes, builds caras, cache compartilhado. Nada disso é nosso problema hoje. Reavaliar quando builds paralelas + cache fizerem diferença real (provável que nunca). |
| **Lerna / Nx**        | Mesmo motivo. Adiciona ferramental sem resolver dor existente.        |
| **pnpm / yarn**       | npm workspaces resolve. Trocar gerenciador é custo de migração sem ganho concreto. Reavaliar se `npm install` ficar lento. |

---

## 7. Plano de migração

Saímos do estado atual (CLI monolítica em `bin/` + `template/`)
sem big-bang. Três PRs sequenciais e mergeáveis:

### PR 1 — Migrar para workspaces sem mudar funcionalidade

- Mover `bin/cli.mjs` → `cli/bin/cli.mjs`.
- Mover `template/` → `cli/template/`.
- Mover `package.json` atual → `cli/package.json` (sem mudar
  conteúdo, só path).
- Criar `package.json` raiz novo com `"workspaces": ["cli"]`.
- Atualizar `cli/bin/cli.mjs` para resolver paths relativos a si
  mesmo (já faz isso via `__dirname`, então nada muda).
- Smoke test: `cd /tmp && node ~/llm-wiki/cli/bin/cli.mjs teste`
  continua funcionando exatamente igual.

**Critério de sucesso**: zero mudança de comportamento. Só
reorganização.

### PR 2 — Adicionar `config/`, `source-base/`, `sourcebase.config.json`

- Criar `config/presets/{default,book,project,research,pkm}.json`
  consolidando o que hoje vive em `cli/template/pt-br/_presets/`.
- Criar `config/schemas/sourcebase.config.schema.json`.
- Criar `source-base/raw/` e `source-base/wiki/` na raiz, com
  fontes mock + `.gitignore` decidindo se entra no repo.
- Criar `sourcebase.config.json` na raiz apontando preset =
  `default`.
- Adicionar `scripts/config-use.mjs` + script `npm run config:use`
  na raiz.

**Critério de sucesso**: `npm run config:use book` reescreve o
JSON; CLI atual continua funcionando (não consome config ainda).

### PR 3 — Adicionar `api/` (esqueleto) + `web-ui/` (esqueleto)

- Criar `api/` com Express básico, ws stub, leitura de
  `sourcebase.config.json`.
- Criar `web-ui/` com Vite + React + shadcn, página vazia que
  conecta no ws e renderiza markdown da `wiki/`.
- Adicionar `npm run dev` na raiz com `concurrently`.

**Critério de sucesso**: `npm run dev` sobe ambos, browser
abre, conversa básica funciona contra `source-base/`.

Implementação real do chat-loop, tools, etc, é assunto dos docs
`API.md` e `WEB-UI.md`.

### Fases pós-PR3 (entrega da feature Web UI)

Após as 3 PRs de migração estarem mergeadas, a feature Web UI
em si tem 4 fases de entrega:

#### Fase 0 — Spike CLI (1–2 dias)
**Objetivo**: provar que o chat-loop adaptado do `scena` funciona
contra um vault real, ainda em terminal puro (sem ws/UI).

Entregáveis:
- `api/src/cli-spike.ts` rodando em terminal, com os 3 tools
  (fs/wiki/oracle);
- ingerir 1 fonte de ponta a ponta só com SDK, sem `claude` CLI.

**Critério de sucesso**: ingerir 1 fonte e gerar páginas
equivalentes ao que o slash command `/wiki-ingest` gera hoje.

#### Fase 1 — UI v0 (1 semana)
**Objetivo**: chat web funcional, leitura de wiki e raw.

Entregáveis:
- Express na porta 3001 + WebSocket (`ws`) em `/chat`, com
  `AbortController` para cancel mid-turn;
- Vite + React + shadcn na 5173, 3 rotas (`/`, `/wiki/*`, `/raw/*`);
- componentes shadcn iniciais conforme `WEB-UI.md` §7;
- markdown renderizado, wikilinks resolvem;
- `fs_tool`, `wiki_tool`, `oracle_tool` completos;
- reconnect com backoff (~50 LoC) + lifecycle ping/pong (~30 LoC);
- `npm run dev` na raiz sobe tudo.

**Critério de sucesso**: PM consegue ingerir 1 fonte e ler 3
páginas sem tocar terminal.

#### Fase 2 — UI v1 (2 semanas)
**Objetivo**: usabilidade real para uso diário do PM.

Entregáveis:
- histórico de sessões persistido (em `.cache/sessions/*.json`);
- "ingest assistant" — UI dedicada que mostra raw + checklist
  do `CLAUDE.md` §6.1 lado a lado;
- diffs visuais antes de aplicar `update_page`;
- `oracle_tool.lint` rodando como badge no header;
- gráfico simples de páginas (lib leve, não d3 inteiro).

#### Fase 3 — UI v2 (sob demanda)
Só se a dor aparecer:
- editor inline de páginas (markdown + frontmatter form);
- upload de raw via drag-drop;
- multi-vault selector;
- export pra estático (publicar wiki como site).

**Não comprometer com Fase 3 antes da Fase 1 estar em uso.**

---

## 8. Decisões pendentes


São pontos que não travam o início, mas precisam de resposta antes
de avançar para uso real.

### 8.1 Quando migrar V1 → V2 (clone → libs npm)?

- **(a)** Quando atingirmos N oráculos em produção (ex: N=5);
- **(b)** Quando o primeiro usuário pedir "update sem regenerar";
- **(c)** Quando quisermos código fechado (modelo comercial);
- **(d)** Nunca — V1 é a forma definitiva, customização é feature.

Defendo (b). Espera dor real. Confirma?

### 8.2 `source-base/` na raiz: gitignored ou commitado?

- **(a)** Gitignored. Cada dev gera o seu via
  `npm run source-base:reset`. Repo público fica limpo.
- **(b)** Commitado com fontes mock genéricas. Onboarding fica
  imediato (`npm install && npm run dev` já funciona). Mas pode
  poluir o repo com edits de teste.
- **(c)** Misto: `source-base/raw/` e `source-base/wiki/` ficam,
  mas com `.gitkeep` apenas; arquivos individuais ignorados via
  glob `source-base/raw/*`.

Defendo (c). Estrutura presente, conteúdo descartável. Confirma?

### 8.3 `web-ui/` é módulo separado ou bundled em `api/`?

- **(a)** Módulo separado, publicado como `@llm-wiki/web-ui`.
  Mais limpo conceitualmente.
- **(b)** Bundled dentro de `@llm-wiki/api`: o `api/` builda
  `web-ui/` e serve como assets estáticos. Distribuição mais
  simples na V2 (1 pacote em vez de 2).

Defendo decidir só na hora da V2. Em V1, são módulos separados
sem prejuízo.

### 8.4 Lock-step de versão entre módulos?

Quando `api@1.2` é incompatível com `web-ui@1.0`, como sinalizar?
- **(a)** Versionamento independente + matriz de compatibilidade
  no README.
- **(b)** Lock-step (todos os módulos saem em `1.2.0` juntos).
  Simples, mas força bumps desnecessários.

Defendo (a) na V2. Em V1, irrelevante (tudo no mesmo commit).

### 8.5 Renomear `bin/cli.mjs` para `cli/bin/cli.mjs`

Trivial, parte da PR 1. Sem alternativa real.

### 8.6 Manter os docs PT-BR / código EN

Sim, mantém. Convenção do projeto. Não muda com o monorepo.

### 8.7 Local-only ou prevê SaaS? (cross-cutting) — **resolvida**

**Resposta do Barney**: local-only sempre. SaaS exigiria embedar
arquivos, abstrair storage, key management — é outro projeto, não
esse. Vault é local-first e ponto.

**Consequências**:
- `api/` binda `127.0.0.1`, sem auth, sem multi-tenant;
- `ANTHROPIC_API_KEY` vive em `.env` local; nunca tratado como
  per-tenant;
- `web-ui/` não projeta login, conta, billing;
- telemetria (`API.md` §7.5) — se entrar, é opt-in local sem
  upload remoto;
- "anti-persona SaaS remoto/multi-tenant" no `WEB-UI.md` §2 fica
  vinculada a esta decisão.


---


## 9. Riscos e mitigações

| Risco                                                  | Probabilidade | Mitigação                                                  |
| ------------------------------------------------------ | ------------- | ---------------------------------------------------------- |
| PR 1 quebra publicação npm de `create-source-base`     | baixa         | smoke test `npm pack` + `npm publish --dry-run` antes      |
| Workspaces atrapalham `npm install` em projetos gerados | média         | scaffolder remove campo `workspaces` do package.json copiado, ou usa um package.json template separado |
| Drift entre `config/presets/` e `cli/template/.../_presets/` | alta na transição | PR 2 unifica; CLI passa a ler de `config/` único           |
| Onboarding fica complicado pra novo dev                | média         | README da raiz com 3 comandos: `install`, `source-base:reset`, `dev` |
| `concurrently` esconde erros de um dos módulos         | baixa         | flag `--kill-others-on-fail` + cores diferentes (já no script) |

---

## 10. Referências

- `DECISIONS.md` — decisões vigentes do projeto (substituiu
  `PLAN.md`).
- `CLAUDE-SKILLS.md` — catálogo de skills do oráculo (mapeia para
  endpoints futuros do `api/`).
- `OBSIDIAN.md` — plugins do Obsidian; o `web-ui/` complementa, não
  substitui.
- `API.md` — implementação do módulo `api/` (backend).
- `WEB-UI.md` — implementação do módulo `web-ui/` (frontend).
- `CLI.md` — *(a criar quando PR 2 começar)* implementação do
  `cli/` pós-monorepo.


---

## 11. Próximos passos sugeridos

1. Barney revisa esse doc, responde §8 (decisões pendentes).
2. Abrir PR 1 (migração para workspaces sem mudança funcional).
3. Após PR 1 mergeada e publicada (`create-source-base@0.2.0`),
   abrir PR 2 (config/, source-base/, sourcebase.config.json).
4. Após PR 2, abrir PR 3 (api/ + web-ui/ esqueletos rodando dev
   local).
5. A partir daí, implementação real do chat-loop e UI passa a
   ser tracked em `API.md` e `WEB-UI.md`.

**Não escrever uma linha de código de migração antes da §8 estar
respondida.**
