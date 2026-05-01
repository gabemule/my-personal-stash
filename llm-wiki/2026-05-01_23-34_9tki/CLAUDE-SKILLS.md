# CLAUDE-SKILLS.md — Catálogo de skills/operações do oráculo

> **Doc do projeto `create-source-base`** (não vai dentro do oráculo
> gerado). Catálogo das **operações** (skills) que um oráculo pode
> oferecer, com feedback honesto sobre cada uma: o que entrega, custo
> de implementação, se vale a pena agora ou depois. Serve de roadmap
> para decidir o que adicionar ao template.
>
> **Status atual do template:** apenas o **núcleo** (Init, Ingest,
> Query, Lint, Status, Manifest) está implementado. As demais são
> candidatas para evolução.
>
> A coluna *Inspiração Ar9av* indica que skill análoga existe no
> [Ar9av/obsidian-wiki](https://github.com/Ar9av/obsidian-wiki). Nada
> foi copiado; é referência conceitual apenas.

---

## Núcleo (já no template)

### `wiki-init` — Inicializar oráculo

**O que faz**: Conversa inicial após `npx create-source-base`. Confirma
nome/domínio, preenche `overview.md`, `index.md`, escreve a primeira
entrada em `log.md`, sugere primeiras páginas-semente conforme o preset.

**Quando usar**: uma única vez por oráculo.

**Inspiração Ar9av**: similar a `wiki-setup`.

**Feedback**: essencial. Sem isso, o agente fica meio perdido na primeira
ingestão. Implementação simples (instruções no `CLAUDE.md` §6.5).

---

### `wiki-ingest` — Ingerir uma fonte

**O que faz**: Lê uma fonte de `raw/`, conversa sobre os pontos-chave, cria
página da fonte, atualiza/cria entidades e conceitos, atualiza `index.md`,
apenda em `log.md`.

**Quando usar**: cada nova fonte (provável uso diário).

**Inspiração Ar9av**: similar a `wiki-ingest`. O Ar9av separa em estágios
(ingest → extract → resolve → schema); aqui ficam fundidos por
simplicidade. Se o agente começar a se perder, vale separar.

**Feedback**: skill mais crítica. **Vale 80% do valor do oráculo.** Capriche
no `CLAUDE.md` §6.1.

---

### `wiki-query` — Perguntar contra a wiki

**O que faz**: Lê `index.md`, identifica páginas relevantes, lê e sintetiza
resposta com citações. Pergunta se deve arquivar como `analises/`.

**Quando usar**: sempre que quiser usar o oráculo como oráculo.

**Inspiração Ar9av**: similar a `wiki-query`.

**Feedback**: simples e poderosa. Custo nulo de implementação (só prompt).

---

### `wiki-lint` — Health check

**O que faz**: Detecta links quebrados, órfãos, conceitos sem página,
frontmatter inconsistente, contradições, sumários desatualizados.

**Quando usar**: após cada N ingestões (digamos 10) ou quando sentir que
está bagunçado.

**Inspiração Ar9av**: similar a `wiki-lint`.

**Feedback**: importante. Sem lint, a wiki degrada silenciosamente.

---

### `wiki-status` — Diagnóstico rápido

**O que faz**: Conta fontes, conta páginas, mostra última entrada do log,
páginas atualizadas nos últimos 7 dias. Não muda estado.

**Quando usar**: quando quiser a "saúde" sem ler nada.

**Inspiração Ar9av**: similar a `wiki-status`.

**Feedback**: barato e útil. Implementado como **shell puro** (sem chamar
o LLM) para zerar custo.

---

### `wiki-manifest` — Manifesto derivado de ingestão

**O que faz**: Cruza `raw/**/*` com `original_file:` das páginas
`wiki/source-*.md` e mostra, para cada arquivo de `raw/`, se já foi
ingerido (`✓`) ou está pendente (`·`). Sinaliza páginas-fonte órfãs
(apontam para `raw/` inexistente) e páginas sem `original_file:`. Suporta
`--pending`, `--orphan`, `--json`.

**Quando usar**: para responder rápido "o que ainda falta ingerir?" sem
ler `log.md`. `npm run pending` é o atalho mais comum.

**Inspiração Ar9av**: equivale ao manifesto JSON deles, mas **derivado**
em vez de armazenado — recomputa do zero a cada execução, não tem como
ficar dessincronizado.

**Feedback**: barato (~150 linhas, sem deps) e elimina a necessidade de
manter state em arquivo. Implementado como **shell puro** (sem LLM).

---

## Candidatas (não no template — instalar quando doer)

### `wiki-resolve` — Merge especializado

**O que faria**: Quando uma ingestão toca muitas páginas, separar
conceitualmente "extrair conhecimento" do passo "mesclar contra o que
existe". Hoje, isso é feito junto dentro do ingest.

**Custo**: médio. Exige um segundo prompt focado em diff/merge.

**Feedback**: vale **se** começar a notar que ingestões grandes ficam
inconsistentes. Sintoma típico: contradições não detectadas, sumários que
não refletem mais o conteúdo. Por enquanto, lint + ingest dão conta.

**Inspiração Ar9av**: skill `resolve` deles é justamente isso.

---

### `wiki-history-ingest` — Ingerir histórico do agente

**O que faria**: Ler logs de conversas passadas com Claude Code (ou outros
agentes) e extrair conhecimento delas como se fossem fontes.

**Custo**: alto. Requer parser dos formatos de histórico de cada agente.

**Feedback**: muito interessante para "minerar" raciocínio passado, mas só
vale depois do oráculo já ter rotina estabelecida. **Não priorizar.**

**Inspiração Ar9av**: skill `wiki-history-ingest`.

---

### `wiki-archive` — Arquivar snapshot

**O que faria**: Copiar `wiki/` inteiro para `wiki-archive-YYYY-MM-DD/` (ou
um branch git), permitindo "rebuild from sources" quando a wiki drifa.

**Custo**: trivial (`cp -r` ou `git tag`).

**Feedback**: já dá pra fazer com git tag (`git tag snapshot-...`). Não
justifica skill própria. Mencionado no README PT-BR (seção "Quando a
wiki drifa") já é suficiente.

**Inspiração Ar9av**: tem skill dedicada de archive/restore.

---

### `wiki-rebuild` — Reconstruir parte da wiki

**O que faria**: A partir das fontes em `raw/`, reconstruir uma categoria
inteira de `wiki/` do zero (preservando o resto). Útil após mudanças de
schema.

**Custo**: alto em tokens (relê tudo). Médio em prompt.

**Feedback**: **vale**, mas só depois de meses de uso. Antes disso, raro
precisar.

---

### `wiki-bridge` — Conectar dois oráculos

**O que faria**: Detectar overlap entre dois oráculos separados (ex:
`pessoal/` e `projeto-acme/` mencionam a mesma pessoa) e propor páginas
"ponte" ou consolidação.

**Custo**: alto.

**Feedback**: ideia legal, mas é complexidade alta para benefício
incerto. **Pular** até virar dor real.

---

### `wiki-graph-colorize` — Colorir o graph view

**O que faria**: Editar `.obsidian/graph.json` para tingir nós por
tag/categoria/visibilidade.

**Custo**: baixo. Script shell + prompt curto.

**Feedback**: **legal de ter** mas estética. Pode ser interessante depois
de 50+ páginas (graph fica visualmente confuso). Não priorizar agora.

**Inspiração Ar9av**: skill `graph-colorize` deles é boa referência.

---

### `wiki-suggest-sources` — Sugerir fontes a buscar

**O que faria**: Analisar lacunas na wiki e propor temas/perguntas/fontes a
investigar. Lint avançado, focado em "o que falta".

**Custo**: médio.

**Feedback**: **muito útil em pesquisa**. Para outros domínios, valor
varia. Vale após ~30 fontes acumuladas (antes disso a wiki é tão pequena
que as lacunas são óbvias).

---

### `wiki-export` — Exportar para outro formato

**O que faria**: Gerar PDF, slides Marp, HTML estático, EPUB a partir do
estado da wiki.

**Custo**: depende do formato.

**Feedback**: legal para entregáveis (relatório de pesquisa, deck de
apresentação). **Sob demanda**, não priorizar.

---

### `wiki-search` — Busca semântica/BM25

**O que faria**: Substituir `index.md` como entrypoint quando a wiki
crescer demais. Usa embeddings ou BM25.

**Custo**: médio (rodar embeddings localmente ou via API).

**Feedback**: o gist do Karpathy menciona `qmd` exatamente para isso.
**Só vale depois de centenas de páginas**, antes disso `index.md` resolve.
Sintoma para ativar: "o agente está demorando muito para encontrar a
página certa" ou "está consultando arquivos errados".

---

### `wiki-batch-ingest` — Ingerir várias fontes de uma vez

**O que faria**: Aceitar uma pasta com várias fontes e ingerir todas em
sequência, sem perguntar entre uma e outra.

**Custo**: baixo (loop em torno de `wiki-ingest`).

**Feedback**: útil para bootstrap inicial (ex: 30 PDFs já lidos que você
quer empurrar de uma vez). Adicionar quando essa necessidade aparecer.

---

### `wiki-pii-mask` — Mascarar dados sensíveis

**O que faria**: Detectar e marcar (ou redatar) PII em fontes/páginas. Útil
em domínios de saúde, financeiro, jurídico.

**Custo**: alto.

**Feedback**: **dispensável no seu caso** (você disse "nada privado"). Se
um dia for usar para domínio sensível, ressuscitamos.

---

## Resumo: o que está e o que não está no template

| Skill                  | No template? | Quando ativar         |
|------------------------|--------------|-----------------------|
| `wiki-init`            | ✅            | sempre                |
| `wiki-ingest`          | ✅            | sempre                |
| `wiki-query`           | ✅            | sempre                |
| `wiki-lint`            | ✅            | sempre                |
| `wiki-status`          | ✅            | sempre                |
| `wiki-manifest` (shell)| ✅            | sempre                |
| `wiki-resolve`         | ❌            | quando ingest perder consistência |
| `wiki-history-ingest`  | ❌            | quando quiser minerar conversas passadas |
| `wiki-archive`         | ❌ (git tag basta) | nunca, provavelmente  |
| `wiki-rebuild`         | ❌            | após meses de uso, se drifa |
| `wiki-bridge`          | ❌            | se tiver muitos oráculos com overlap real |
| `wiki-graph-colorize`  | ❌            | após 50+ páginas      |
| `wiki-suggest-sources` | ❌            | após ~30 fontes       |
| `wiki-export`          | ❌            | sob demanda           |
| `wiki-search`          | ❌            | após centenas de páginas |
| `wiki-batch-ingest`    | ❌            | quando incomodar      |
| `wiki-pii-mask`        | ❌            | só se domínio sensível|

---

## Como adicionar uma skill nova

1. Adicione um slash command em `.claude/commands/wiki-<nome>.md` com o
   prompt da operação.
2. Adicione uma seção em `CLAUDE.md` §6 descrevendo o procedimento.
3. (Opcional) Adicione um script em `package.json` se for útil em headless.
4. Documente aqui em `CLAUDE-SKILLS.md` com o feedback honesto de
   custo/benefício.
