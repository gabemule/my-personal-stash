# WEB-UI.md — Plano do módulo `web-ui/`

> **Doc do projeto `llm-wiki`**. Plano de implementação do módulo
> frontend (`web-ui/`): aplicação React que consome a `api/`,
> renderiza markdown e dá ao usuário não-técnico (PM) uma forma
> civilizada de operar o oráculo.
>
> Status: **proposta**, nenhuma linha de código escrita ainda. Para
> infraestrutura (layout, dev workflow, distribuição), ver
> `MONOREPO.md`. Para backend e tools, ver `API.md`.
>
> **Diretriz tonal**: feedback honesto, escopo mínimo, decisão por
> dor real e não por entusiasmo.

---

## 1. Motivação

A pressão central é **persona**. Vou passar o oráculo para o PM
do projeto. Pedir pra ele instalar Node, configurar
`ANTHROPIC_API_KEY`, rodar `claude` no terminal e digitar
`/wiki-ingest` é fricção a mais do que ele aceita. Uma página
web local com chat e markdown renderizado é o mínimo civilizado.

**Não-motivações**:
- Substituir o Obsidian. **Não vamos.** Quem prefere Obsidian
  continua usando direto no vault. A Web UI **convive**.
- Reinventar Notion. UI é mínima de propósito.
- Suportar mobile. Desktop-first, sem media queries especiais
  na v1.

---

## 2. Persona alvo

**Primária**: PM do projeto. Não-técnico ou semi-técnico. Quer:
- abrir uma página, digitar/colar uma fonte, ver wiki crescer;
- ler análise renderizada (não markdown cru);
- não tocar em terminal nem em arquivos.

**Secundária**: dev/eu. Continua tendo acesso direto ao filesystem
(o vault é o mesmo, Obsidian segue funcionando). A UI é uma camada
opcional, não substitui o vault.

**Anti-persona**: usuário de produção remoto/multi-tenant. Não é
SaaS. É local-first, single-user, roda no laptop do PM.

---

## 3. Stack

| Camada     | Escolha                                          | Por quê                                                      |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------ |
| Build      | **Vite**                                         | rápido de subir, dev server com HMR, build estático          |
| Framework  | **React** + TypeScript                           | mais ecossistema, mais devs no mundo, sem SSR                |
| Styling    | **TailwindCSS**                                  | utility-first, sem CSS-in-JS, custo zero de runtime          |
| UI kit     | **shadcn/ui** (Radix + Tailwind)                 | textarea, button, dialog, sheet, scroll-area prontos, customizáveis (cola código no repo) |
| Markdown   | `react-markdown` + `remark-gfm` + `rehype-slug`  | bem testado, plugins maduros                                 |
| Wikilinks  | plugin custom (`remark` simples)                 | resolve `[[X]]` → `<a href="/wiki/X.md">`                    |
| WS client  | `WebSocket` nativo do browser + reconnect manual | sem lib (~50 LoC de backoff)                                 |
| Roteamento | `react-router-dom`                               | 3 rotas; algo mais simples não compensa o setup              |

**Coisas que recusei**:
- **Next.js** — SSR, file routing, API routes, nada disso útil
  aqui. Overkill.
- **MUI / Chakra / Mantine** — pesados, opinativos, fogem do
  Tailwind. shadcn dá os mesmos componentes sem virar dependência.
- **socket.io-client** — server usa `ws` cru; cliente também.
- **Redux / Zustand / Jotai** — estado é pequeno e localizado
  (sessão de chat + página atual). `useState` + `useReducer`
  bastam. Adicionar lib quando a dor aparecer.
- **Storybook** — não temos design system pra documentar v1.

---

## 4. Telas e fluxos

UI mínima, três rotas + 1 indicador global.

### 4.1 `/` — Chat

**Layout**:
- Coluna principal: histórico de mensagens (rolagem, auto-scroll
  para novas).
- Footer fixo: textarea multilinha + botão "enviar".
- Sidebar lateral colapsável (Sheet shadcn): últimas 5 entradas
  de `wiki/log.md`.

**Comportamento**:
- Stream das respostas com indicador "agente está pensando" e
  badges de tool calls em curso (`fs_tool.read_file`,
  `wiki_tool.update_page`, etc).
- Botão "novo turno" / "limpar histórico" no header.
- Markdown nas mensagens é renderizado (não cru). Code blocks
  com syntax highlight. Wikilinks `[[X]]` viram links navegáveis
  pra `/wiki/X.md`.
- Cancel: botão "parar" durante geração → fecha ws → server aborta.
- Enter envia (Shift+Enter quebra linha).

### 4.2 `/wiki/*` — Browser de páginas

**Layout**:
- Sidebar (Sheet): árvore de `wiki/` (gerada via
  `oracle_tool.manifest`).
- Conteúdo central: página renderizada com `react-markdown`.
- Header: título da página + botão "abrir no Obsidian"
  (deep link `obsidian://open?path=...`, opcional, gracioso se
  falhar).

**Comportamento**:
- Wikilinks `[[X]]` viram `<a href="/wiki/X.md">`. Se a página
  não existe, o link aparece com estilo "quebrado" + tooltip
  ("página inexistente").
- Frontmatter renderizado como tabelinha leve no topo.
- Backlinks no rodapé (quem aponta pra essa página) — derivado
  do `manifest`.

### 4.3 `/raw/*` — Browser de fontes

**Layout**:
- Lista de `raw/` (somente leitura).
- Preview do arquivo selecionado:
  - texto/markdown → `react-markdown`;
  - PDF → embed nativo do browser (`<object>` ou link);
  - outros → "tipo não suportado, abra no Finder".

**Comportamento**:
- Botão "ingerir essa fonte" → manda mensagem pré-formatada para
  o chat (`/wiki-ingest raw/<path>`).
- Sem write nessa rota — `raw/` é imutável.

### 4.4 Indicador global

- Header com nome do oráculo (de `sourcebase.config.json` →
  `name`) e badge de status (`oracle_tool.lint` rodando como
  semáforo: verde = ok, amarelo = avisos, vermelho = erros).
- Toggle de tema claro/escuro (CSS vars; respeita
  `prefers-color-scheme` por default).

### 4.5 Não vão ter na v1

- editor inline de páginas (decisão pendente §5.2);
- upload de novos `raw/` pela UI (PM coloca arquivo na pasta
  direto, ou v2);
- multi-vault / troca de oráculo;
- autenticação;
- dark mode customizado (deixa o navegador resolver, sem toggle
  na v0);
- diff visual de `update_page` antes de aplicar (vai pra v2).

---

## 5. Decisões pendentes (UX)

### 5.1 PM é técnico ou não-técnico?

Quando digo "PM", o nível dele é:
- **(a) zero técnico**: nunca abriu terminal → UI tem que ser tudo;
- **(b) semi-técnico**: abre terminal pra `npm run`, edita .env →
  podemos cortar fricção da UI;
- **(c) técnico**: roda npm, lê erro de stack → UI é conforto, não
  obrigação.

A resposta muda o que vai pra v0 vs v1.

### 5.2 Edição de `raw/` pela UI?

- **(a) nunca**: imutabilidade é dogma, edita-se no filesystem;
- **(b) v2+ com confirmação dupla**;
- **(c) v1 com flag**.

Defendo (a). Se a fonte tá errada, deleta no filesystem e ingere
de novo. Não polui a UI.

### 5.3 Edição de `wiki/` pela UI?

- **(a) nunca**: só o agente edita; humano edita no Obsidian;
- **(b) v2+ com markdown editor**;
- **(c) v1 com modal de "edit raw markdown" simples.

Defendo (b). v1 é só leitura + chat; v2 considera editor.

### 5.4 Prazo

Não prometi nada pro PM ainda? Tem deadline no horizonte? Se
não tem, fazemos com calma. Se tem, ajustamos escopo.

### 5.5 i18n da UI

A wiki em si é PT-BR (template `pt-br/`). UI da web segue PT-BR?
Ou EN com strings extraídas? Para PM brasileiro, PT-BR. Eu
defendo PT-BR hardcoded na v1; i18n quando segundo idioma chegar.

### 5.6 Tema

Light-only na v1, ou já entregar dark? Eu defendo seguir
`prefers-color-scheme` do navegador desde a v0 (custo baixo com
Tailwind dark mode), sem toggle manual.

---

## 6. Riscos e mitigações

| Risco                                                       | Probabilidade | Mitigação                                                          |
| ----------------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| PM perde sessão por F5 ou crash do server                   | alta na v0    | persistir histórico em `.cache/sessions/*.json` na v1             |
| Multi-aba escreve concorrentemente                          | média         | server tem lock; UI mostra banner "outra sessão ativa"             |
| Wikilink quebrado confunde PM                               | média         | resolver via `oracle_tool.manifest`; estilo visual claro            |
| `react-markdown` renderiza algo malicioso                   | baixa         | conteúdo vem do filesystem local controlado; mesmo assim, sem `rehype-raw` |
| shadcn cresce sem controle                                  | média         | só copiar componente quando precisar; não pré-instalar tudo        |
| WebSocket reconectando em loop drena bateria                | baixa         | backoff exponencial cap em 30s                                     |
| `react-router` sobreposto com paths reais (`/raw/file.md`)  | média         | usar query param ou prefixo `/raw/?path=...` em vez de path direto |

---

## 7. Componentes shadcn iniciais

Lista de componentes que sei que vamos usar v0/v1, em ordem de
prioridade:

1. **Button** — botões em geral.
2. **Textarea** — input do chat.
3. **ScrollArea** — histórico de chat com rolagem custom.
4. **Sheet** — sidebars (logs, árvore de `wiki/`, lista de `raw/`).
5. **Dialog** — confirmações futuras (apply diff, clear history).
6. **Tooltip** — hovers (wikilink quebrado, badges de tool).
7. **Badge** — indicadores de tool call e status.
8. **Separator** — divisores.

Adicionar quando precisar, não antes.

---

## 8. Referências

- `MONOREPO.md` — infraestrutura, layout, dev workflow, fases de
  entrega.
- `API.md` — backend que essa UI consome (contratos de tools,
  formato de eventos do ws).
- `OBSIDIAN.md` — plugins do Obsidian; a Web UI **complementa**,
  não substitui.
- `CLAUDE-SKILLS.md` — skills do oráculo (mapeiam pra fluxos da
  UI).
- shadcn/ui docs — `https://ui.shadcn.com/`.
