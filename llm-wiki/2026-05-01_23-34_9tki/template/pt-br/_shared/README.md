# {{NAME}}

> Oráculo LLM Wiki — base de conhecimento mantida por agente (Claude Code)
> seguindo o padrão descrito por
> [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Domínio:** {{DOMAIN}}
**Início:** {{DATE}}

---

## O que é isto

- 📥 **`raw/`** — suas fontes originais, **imutáveis** (você as adiciona; o agente nunca modifica).
- 📚 **`wiki/`** — markdown interligado, **escrito 100% pelo agente** (você lê).
- 🧠 **`CLAUDE.md`** — manual que disciplina o agente.

Você é o **curador** (escolhe fontes e faz perguntas). O agente é o
**bibliotecário** (lê, resume, interliga, mantém atualizado).

---

## Fluxo do dia a dia

### 1. Inicializar (uma vez)

```bash
npm run init
```

O agente conversa com você, preenche `wiki/overview.md` e `wiki/index.md`,
detecta páginas-semente do preset (se houver) e abre o `log.md`.

### 2. Ingest — registrar uma fonte nova

Workflow básico, **uma fonte por vez**:

```bash
# 1. Coloque a fonte em raw/ (qualquer subpasta — raw/ é seu)
cp ~/Downloads/artigo.md raw/articles/

# 2a. Interativo (recomendado, conversa antes de escrever)
#     no Claude Code:  /wiki-ingest raw/articles/artigo.md

# 2b. Headless (sem conversa, escreve direto)
npm run ingest -- raw/articles/artigo.md
```

O agente lê, conversa sobre os pontos principais (no modo interativo),
escreve uma página `wiki/source-<slug>.md` com `original_file:` apontando
de volta pra `raw/`, **atualiza** páginas existentes que a fonte
enriquece, **cria** páginas novas para entidades/conceitos novos
(`wiki/entity-...`, `wiki/concept-...`), atualiza `index.md` e apenda em
`log.md`. Uma fonte boa toca de 1 a ~20 páginas.

> 🔁 **Editou um arquivo de `raw/`?** Roda o ingest no mesmo arquivo de
> novo. O agente detecta que já existe a `wiki/source-*.md`
> correspondente (via `original_file:`) e faz **re-ingest** — atualiza
> em vez de criar. Você é o curador de `raw/` e pode editar, renomear
> ou reorganizar à vontade; o agente nunca toca em `raw/`.

> Não jogue 50 arquivos de uma vez. Ingira um, veja o resultado, ajuste
> convenções no `CLAUDE.md` se algo não saiu como queria, ingira o
> próximo. As primeiras 3-5 ingestões são calibração.

### 3. Query — perguntar contra a wiki

```bash
npm run query -- "qual a tese central deste oráculo?"
```

Ou abra o chat (`npm run chat`) e converse à vontade. O agente lê o
`index.md` primeiro, identifica páginas relevantes, sintetiza a resposta
com **citações** (`[[wikilinks]]`) e te pergunta se a resposta merece
virar uma página em `wiki/analysis-<slug>.md`.

### 4. Lint — health check periódico

```bash
npm run lint
```

Apresenta um relatório: links quebrados, páginas órfãs, conceitos sem
página, contradições, frontmatter inconsistente. **Não corrige
automaticamente** — você decide o que arrumar.

### 5. Status — diagnóstico rápido (sem chamar LLM)

```bash
npm run status
```

Mostra contagem de fontes, contagem de páginas por `type`, última
entrada do log, páginas atualizadas recentemente.

### 6. Manifesto — o que já ingeri / o que falta

```bash
npm run manifest    # tabela: cada arquivo de raw/ → ✓ ingerido ou · pendente
npm run pending     # só os pendentes
```

Script puro shell (sem chamar LLM). Cruza `raw/**/*` com a chave
`original_file:` das páginas `wiki/source-*.md`. **Nada é armazenado** —
recomputa do zero a cada execução. Também sinaliza páginas-fonte órfãs
(`original_file:` apontando pra arquivo que sumiu de `raw/`) e páginas
sem `original_file:`.

---

## Estrutura

```
.
├── README.md, CLAUDE.md
├── package.json
├── .claude/commands/         ← slash commands (/wiki-init, /wiki-ingest, ...)
├── raw/                      ← VOCÊ alimenta aqui (imutável p/ o agente)
└── wiki/                     ← O AGENTE mantém aqui (você só lê)
    ├── index.md
    ├── log.md
    ├── overview.md
    └── *.md                  ← páginas (flat, sem subpastas por default)
```

**Convenções**:
- Filenames: `kebab-case` em **inglês** (`andrej-karpathy.md`, `llm-wiki-pattern.md`).
- Frontmatter keys: **inglês** (`title`, `type`, `tags`, `created`, `updated`, `summary`, `sources`, `references`).
- Conteúdo, headings, valores de frontmatter: **PT-BR**.
- Wikilinks: `[[english-filename]]` ou `[[english-filename|texto pt-br]]`.

---

## Conceitos fundamentais

- **`raw/` vs `wiki/`.** `raw/` é a verdade original (você escreve).
  `wiki/` é a destilação interligada (o agente escreve). O agente nunca
  modifica `raw/`.
- **Persistência > re-derivação.** Diferente de RAG, o conhecimento é
  **acumulado** na wiki. Cada ingest melhora a base; nenhuma pergunta
  começa do zero.
- **`index.md` como spine.** Em escala de até ~hundreds de páginas, é
  mais simples e eficaz que embeddings.
- **`log.md` como timeline.** Tudo que acontece (ingest/query/lint)
  deixa um traço cronológico.
- **`wiki/` flat.** Sem subpastas por default. Categorização emerge via
  `type:` no frontmatter, prefixos no filename e tags.

---

## Quando a wiki drifa

Acumulou inconsistência (sumários velhos, links quebrados, contradições
silenciosas)? Três opções, do mais barato pro mais caro:

1. **Lint agressivo** — `npm run lint` várias rodadas, corrigindo o que
   ele aponta.
2. **Reconstruir parte** — peça ao agente pra reescrever uma categoria
   inteira (ex: todas as `entity-*`) a partir das fontes em `raw/`.
   `raw/` é imutável, então isso é seguro.
3. **Arquivar e recomeçar** — `git tag snapshot-<data>` ou copia `wiki/`
   pra `wiki-archive-<data>/`, apaga `wiki/` (mantém só `index.md`,
   `log.md`, `overview.md` esqueletos) e roda `/wiki-init` + ingest
   das fontes mais importantes.

---

## Documento de referência

- [`CLAUDE.md`](./CLAUDE.md) — manual completo do agente.

---

## Inspirações

- **Andrej Karpathy** — [LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
- **Vannevar Bush** — [As We May Think (1945)](https://www.theatlantic.com/magazine/archive/1945/07/as-we-may-think/303881/).

---

> Gerado por [`create-source-base`](https://github.com/) — versão do template: 0.1.
