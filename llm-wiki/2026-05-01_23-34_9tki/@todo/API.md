# API.md — Plano do módulo `api/`

> **Doc do projeto `llm-wiki`**. Plano de implementação do módulo
> backend (`api/`): servidor Node que liga Anthropic API ↔
> filesystem do vault, expõe chat via WebSocket e tools sandboxadas.
>
> Status: **proposta**, nenhuma linha de código escrita ainda. Para
> infraestrutura (layout, dev workflow, distribuição), ver
> `MONOREPO.md`. Para UX/frontend, ver `WEB-UI.md`.
>
> **Diretriz tonal**: feedback honesto, escopo mínimo, decisão por
> dor real e não por entusiasmo.

---

## 1. Motivação

Três pressões empurrando esse módulo:

1. **Imutabilidade real do `raw/`.** Hoje a regra "não mexa em
   `raw/`" é convenção do `CLAUDE.md`. O agente respeita 99% do
   tempo, mas é frágil — depende do prompt. Se o backend só expõe
   tools de leitura para `raw/` e tools de escrita para `wiki/`, a
   imutabilidade vira **garantia capability-based**, não
   convenção. Mais forte e mais fácil de explicar.
2. **Tools prontas no `scena`.** Já existe um chat-loop maduro com
   Anthropic SDK em `~/Documents/CodePlay/e2e-gen/` (nome legado
   da pasta; o package se chama `scena`). Reaproveitar isso custa
   pouco e ganha muita coisa: streaming, prompt cache, tool
   dispatcher com retry, custo por turno, logger persistente,
   anti-loop.
3. **Persona PM precisa de um servidor**. Sem `api/`, a UI não
   tem com quem conversar. PM não roda CLI — precisa de um
   processo de longa duração que ele liga e usa pelo browser.

**Não-motivações** (não justificam complexidade extra):
- Performance. O `claude` CLI já é rápido; o gargalo é o modelo,
  não o transporte.
- Custo. SDK direto e CLI Claude Code consomem tokens parecido.
- Features de IA. O modelo é o mesmo; estamos só trocando a casca.

---

## 2. Stack

| Camada       | Escolha                                          | Por quê                                                      |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------ |
| Runtime      | Node 20+                                         | já é o requisito do template                                 |
| Linguagem    | TypeScript                                       | mesmo stack do `scena`, reuso direto                         |
| HTTP         | **Express**                                      | maduro, simples, ecossistema enorme                          |
| LLM          | `@anthropic-ai/sdk`                              | tool use nativo, streaming, prompt cache                     |
| Schemas      | `zod` + `z.toJSONSchema()`                       | mesmo padrão do `scena`                                      |
| Streaming    | **WebSocket** (`ws` lib)                         | bidirecional: cancel mid-turn, tool approval interativo      |
| Config       | `ajv` lendo `sourcebase.config.json`             | validação clara, falha rápida                                |
| FS utils     | `gray-matter`, `fast-glob`                       | parsing de frontmatter e listagens                           |

**Coisas que recusei**:
- **Hono/Fastify** — Express resolve, sem ganho real.
- **SSE** — funciona pro `scena` porque o consumidor é terminal
  Node fire-and-forget. Aqui temos dois usos bidirecionais reais:
  (a) cancelar turno em curso quando o PM percebeu que mandou
  errado (`ws.close` aborta `AbortController` no server, sem
  endpoint paralelo feio); (b) tool approval interativo no
  futuro (server manda diff de `update_page`, espera "aplicar/
  rejeitar"). Migrar SSE→WS depois é refactor chato; escolher
  WS já compensa o custo modesto (`ws` lib + ~50 linhas de
  reconnect com backoff no cliente + ~30 de lifecycle no server).
- **socket.io** — overkill. `ws` cru (~13kb, maduro) basta. Sem
  broadcast, sem rooms, sem fallback HTTP.
- **MCP client** — sem MCP na v1; reavaliar se precisar Playwright
  ou tools externas.

---

## 3. Arquitetura runtime

```
Browser  ──── ws://127.0.0.1:3001/chat ────►  Express :3001
                                                  │
                                                  ├─ ChatSession (loop SDK)
                                                  │     ├─ fs_tool   (read)
                                                  │     ├─ wiki_tool (write)
                                                  │     └─ oracle_tool
                                                  │
                                                  └─ filesystem do vault
                                                      ├─ raw/  (read-only p/ LLM)
                                                      ├─ wiki/ (read+write)
                                                      └─ logs/ (append-only)
```

### Decisões

- **Bind**: `127.0.0.1` apenas. Sem CORS aberto, sem exposição na
  rede local.
- **API key**: `ANTHROPIC_API_KEY` no `.env` lido pelo Express. O
  frontend nunca vê a key.
- **Concorrência**: 1 sessão de chat por vez na v1. Lock simples
  em memória. Multi-aba é "não suportado" explicitamente.
- **Cancel mid-turn**: cliente fecha o `ws` → server detecta close
  → `AbortController.abort()` cancela request do SDK Anthropic
  imediatamente.
- **Reconexão**: backoff exponencial no cliente (~50 LoC). Server
  faz ping/pong (~30 LoC) pra detectar cliente morto.
- **Config**: lê `sourcebase.config.json` da raiz no boot, valida
  com `ajv`, falha rápido se inválido. Hot reload em mudança
  do arquivo (chokidar) — opcional v2.

---

## 4. Tools

Padrão **super-tool com `action` enum**, replicado do `scena`. Três
super-tools, separação por concern: **leitura** / **escrita** /
**orquestração**.

### 4.1 `fs_tool` — leitura sandboxada (raw/ ou wiki/)

| Action       | Entrada (zod)                                                 | Saída                   | Garantia                                |
| ------------ | ------------------------------------------------------------- | ----------------------- | --------------------------------------- |
| `read_file`  | `{ base: "raw"\|"wiki", path: string }`                       | `// path\n\n<conteúdo>` | sandbox em `<vault>/<base>`, traversal bloqueado |
| `list_files` | `{ base: "raw"\|"wiki", glob?: string, limit?: number }`      | array de paths          | sandbox em `<vault>/<base>`, hard-limit |
| `glob`       | `{ base: "raw"\|"wiki", pattern: string }`                    | array de paths          | sandbox em `<vault>/<base>`             |

**Sem `write_file`. Sem `delete_file`. Sem `move_file`.** Essa é a
chave da imutabilidade do `raw/`: o agente literalmente não tem
ferramenta que escreva ou mexa em arquivos. `wiki/` recebe escrita
apenas via `wiki_tool` (§4.2), com schema fechado.

Notas:
- `base` é enum explícito; **não** descobrimos a zona pelo prefixo
  do `path` (encoraja path traversal). Cada call declara claramente
  em qual zona quer ler.
- Resolver no server faz `path.resolve(vault, base, path)` e
  rejeita qualquer resultado fora de `path.resolve(vault, base)`.
- Reaproveita `claude/tools/fs/read-file.ts`, `list-files.ts` e
  `glob.ts` do `scena`, plumbando `cwd` em runtime.

### 4.2 `wiki_tool` — escrita somente em `wiki/`

| Action          | Entrada (zod)                                         | Saída                  | Garantia                        |
| --------------- | ----------------------------------------------------- | ---------------------- | ------------------------------- |
| `create_page`   | `{ path, frontmatter, body }`                         | `{ ok, path }`         | falha se já existe              |
| `update_page`   | `{ path, frontmatter?, body?, mode: replace\|merge }` | `{ ok, path, diff }`   | falha se não existe             |
| `append_log`    | `{ entry: string }`                                   | `{ ok }`               | só `wiki/log.md`, append-only   |
| `update_index`  | `{ section, content }`                                | `{ ok, diff }`         | só `wiki/index.md`, surgical    |

Notas:
- **Frontmatter** parseado com `gray-matter`. Schema validado contra
  os tipos do `CLAUDE.md` §6.5 (source/entity/concept/analysis).
- `update_page` em modo `merge` faz merge de frontmatter + concat
  de seções por heading. Modo `replace` reescreve tudo. Default =
  `merge`.
- `append_log` é o único caminho para escrever em `log.md` — o
  agente não pode rewrite o log (princípio append-only).
- Toda escrita resolve via `path.resolve(vault, "wiki", path)` e
  rejeita resultado fora de `path.resolve(vault, "wiki")`. Não há
  parâmetro `base` aqui — escrita só em `wiki/`, ponto.
- Para **ler** páginas (antes de update, ex.), o agente usa
  `fs_tool.read_file({ base: "wiki", path })`.

### 4.3 `oracle_tool` — operações da wiki como objeto

Wrappers finos sobre os scripts shell já existentes em
`cli/template/_common/scripts/` (que após PR 2 do MONOREPO migram
pra `scripts/` na raiz ou ficam onde estão). Executados via
`child_process` em processo separado, com timeout.

| Action     | Entrada    | Saída                                       | Wrapping de                       |
| ---------- | ---------- | ------------------------------------------- | --------------------------------- |
| `manifest` | `{}`       | árvore de páginas + frontmatter resumido    | `scripts/manifest.mjs`            |
| `pending`  | `{}`       | lista de fontes em `raw/` ainda não ingeridas | derivado de manifest + raw scan |
| `lint`     | `{}`       | issues (links quebrados, órfãos, schema)    | `scripts/lint.mjs` (a criar)      |
| `status`   | `{}`       | contagens (#sources, #entities, último log) | `scripts/status.mjs` (a criar)    |

> Hoje só `manifest.mjs` e `status.mjs` existem. `lint.mjs` é a
> criar. Decidir depois se duplicamos a lógica em TS dentro do
> `api/` ou se sempre via script externo.

---

## 5. Reuso do `scena`

> Caminhos relativos a `~/Documents/CodePlay/e2e-gen/src/`.

### Trazer

| Arquivo `scena`                            | Como reusar                                              | Esforço de adaptação |
| ------------------------------------------ | -------------------------------------------------------- | -------------------- |
| `claude/chat-session.ts`                   | **núcleo**. Copiar e trocar tools por fs_/wiki_/oracle_  | médio (300–400 LoC)  |
| `claude/tools/fs/read-file.ts`             | compõe `fs_tool.read_file`; `base` resolvida em runtime  | trivial              |
| `claude/tools/fs/list-files.ts`            | compõe `fs_tool.list_files`; `base` resolvida em runtime | trivial              |
| `claude/tools/fs/glob.ts` (se existir)     | compõe `fs_tool.glob`; `base` resolvida em runtime       | trivial              |
| `core/shared/logger.ts`                    | usar tal qual                                            | nenhum               |
| `core/shared/error-handler.ts`             | usar tal qual                                            | nenhum               |
| `claude/constants.ts`                      | herdar limites (max retries, max tool output etc.)       | nenhum (revisar)     |
| `claude/types.ts` (subset)                 | tipos `MessageParam`, `ToolDef`, `ChatTurn`              | nenhum               |
| Padrão **super-tool com `action` enum**    | replicar nos 3 tools                                     | é só padrão          |
| Padrão de **prompt caching**               | replicar (system prompt + manifest cacheados)            | é só padrão          |
| Padrão de **stream consumer** (`for await` no SDK) | reusar consumo do stream; **transporte muda** SSE→WS  | baixo (~30 LoC pipe) |
| Padrão de **anti-loop / MAX_TOOL_RETRIES** | replicar                                                 | é só padrão          |

### Não trazer

| Arquivo                              | Por quê descartar                                  |
| ------------------------------------ | -------------------------------------------------- |
| `claude/mcp-client.ts`               | sem MCP na v1; reavaliar se precisar Playwright    |
| `claude/tools/playwright/*` (todos)  | nada a ver com wiki                                |
| `claude/tools/routes/*` (todos)      | conceito de "rotas" é específico do scena          |
| `claude/tools/scenarios/*` (todos)   | conceito de "cenários" é específico do scena       |
| `claude/tools/auth/api-auth.ts`      | sem auth de API externa; vault é local             |
| `core/context/bundler.ts`            | bundler de contexto do scena, não se aplica        |
| `core/context/collector.ts`          | idem                                               |
| `core/runners/playwright.ts`         | idem                                               |
| `core/scenarios/registry.ts`         | idem                                               |
| `playwright/*` (raiz do scena)       | idem                                               |
| `core/config/templates/*`            | templates de scena, não de wiki                    |

### Estratégia de cópia

**Copiar arquivos para `api/src/vendored/`, NÃO importar como
dependência.** O `scena` não é publicado e está em flux. Mantemos
controle local; quando ele estabilizar, reavaliamos.

---

## 6. Riscos e mitigações

| Risco                                                  | Probabilidade | Mitigação                                                          |
| ------------------------------------------------------ | ------------- | ------------------------------------------------------------------ |
| `scena` muda API antes da gente extrair                | média         | copiar arquivos para `api/src/vendored/`, sem dep                  |
| Custo Anthropic explode                                | baixa         | dashboard de custo por sessão (já no `scena`); alerta diário       |
| Imutabilidade quebrada por bug em path traversal       | baixa         | testes unitários nos tools (padrão do `scena`)                     |
| Frontmatter inconsistente entre tipos de página        | média         | zod schema por `type`; rejeitar create/update inválido             |
| Two browsers/abas escrevendo concorrentemente          | média         | lock em memória; UI mostra "outra sessão ativa"                    |
| Cancel mid-turn deixa estado inconsistente             | baixa         | tool calls são atomicas; cancel só interrompe entre tool calls     |

---

## 7. Decisões pendentes (backend)

### 7.1 Status do `scena`
O `scena` está estável o suficiente para extrairmos os arquivos
agora, ou ainda em flux? Se em flux, quanto tempo até estabilizar?

### 7.2 Posicionamento vs Claude Code CLI
A `api/` vai ser:
- **(a) substituta**: oráculos novos só falam SDK; CLI deprecated;
- **(b) complementar**: dev usa CLI no Obsidian + slash commands;
  PM usa Web UI; ambos lendo o mesmo vault;
- **(c) opt-in**: template default continua CLI; SDK/UI é addon
  via `--with-web`.

Defendo (c) na v1, migrando para (b) em v2 se der certo.

### 7.3 Fontes binárias em `raw/`
- PDF → extrair texto on-the-fly com `pdf-parse`?
- Imagem → vision API do Claude direto (mandar bytes)?
- Decidir caso a caso. Não é dealbreaker pra v1.

### 7.4 Prompt cache TTL
Limites Anthropic: 5min/1h. Cabe `system prompt + manifest` cacheados?
Vale renovar ativamente para sessões longas?

### 7.5 Telemetria
Log de uso (anônimo) para entender padrões, sem mandar conteúdo?
Ligado a §8.7 do `MONOREPO.md` (local-only vs SaaS).

---

## 8. Referências

- `MONOREPO.md` — infraestrutura, layout, dev workflow, fases de
  entrega.
- `WEB-UI.md` — frontend que consome a `api/`.
- `CLAUDE-SKILLS.md` — skills do oráculo (mapeiam pra fluxos
  esperados pela `api/`).
- `~/Documents/CodePlay/e2e-gen/` — `scena`, fonte primária dos
  arquivos a vendorizar.
- Anthropic SDK docs — tool use, prompt caching, streaming.
