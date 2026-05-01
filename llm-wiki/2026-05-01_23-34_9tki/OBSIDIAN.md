# OBSIDIAN.md — Plugins recomendados para o oráculo

> **Doc do projeto `create-source-base`** (não vai dentro do oráculo
> gerado). Catálogo de plugins do Obsidian que ajudam o uso do oráculo,
> com feedback honesto de "instalar dia 1" / "esperar a dor aparecer"
> / "dispensável". Serve de roadmap pra decidir o que integrar ao
> template (ex: pré-configurar Dataview no `wiki/index.md`) e como
> referência pro usuário ao montar o vault.
>
> **Política atual do template**: nada vem pré-instalado. Cada
> oráculo é um vault Obsidian neutro; o usuário escolhe da lista o
> que faz sentido. Tudo é opcional.

---

## Núcleo do Obsidian (já vem nativo, só lembrar de usar)

### Graph view
**O que faz**: visualiza páginas como nós e wikilinks como arestas.
**Como ajuda**: ver a forma da wiki — quem é hub, quem é órfão.
**Feedback**: **use sempre.** É o melhor "lint visual" gratuito.
*Atalho: `Cmd+G` ou ribbon icon*

### Local graph
**O que faz**: graph view restrito aos vizinhos da página atual.
**Como ajuda**: explorar conexões a partir de uma entidade/conceito.
**Feedback**: **use sempre** quando navegando.

### Search (busca de texto)
**O que faz**: busca full-text em todo o vault.
**Como ajuda**: encontrar onde um termo aparece antes de criar página nova.
**Feedback**: **use sempre.** Especialmente para evitar duplicatas.

### Backlinks panel
**O que faz**: mostra quem aponta para a página atual.
**Como ajuda**: entender o "raio" de uma entidade/conceito.
**Feedback**: **deixe sempre aberto** lateralmente.

---

## Plugins comunitários — instalar dia 1

### [Dataview](https://github.com/blacksmithgu/obsidian-dataview)
**O que faz**: queries SQL-ish sobre frontmatter de páginas.
**Como ajuda**:
- Listar todas as fontes ingeridas no último mês.
- Tabela de entidades por papel.
- Páginas com `atualizado < 30 dias atrás`.

Exemplo prático no `wiki/index.md` (a wiki é flat, então filtramos por
`type` no frontmatter):
```
\`\`\`dataview
TABLE summary, updated FROM "wiki" WHERE type = "source" SORT updated DESC
\`\`\`
```

**Feedback**: **install dia 1.** O `index.md` pode usar Dataview para se
gerar automaticamente em parte. O `CLAUDE.md` pode instruir o agente a
usar blocos Dataview onde fizer sentido. Custo zero, valor altíssimo.

---

### [Templater](https://github.com/SilentVoid13/Templater)
**O que faz**: templates dinâmicos de página com lógica (datas, prompts,
inserção de conteúdo).
**Como ajuda**: se um dia você quiser criar páginas manualmente (raro),
templates evitam erro de frontmatter. Mais útil ainda: templates por tipo
(`type: entity`, `type: concept`).
**Feedback**: **install dia 1.** Mesmo que você não escreva manualmente,
ter o template documenta o formato esperado.

---

## Plugins comunitários — instalar quando doer

### [Obsidian Web Clipper](https://obsidian.md/clipper)
**O que faz**: extensão de browser que converte páginas web em markdown
e salva direto no vault (configura para `raw/`).
**Como ajuda**: **fluxo de ingest fica trivial.** Vê um artigo, dá um
clique, ele cai em `raw/`, você roda `npm run ingest -- raw/<file>.md`.
**Feedback**: **install assim que for ingerir conteúdo web.** Mude o
"output folder" do plugin para `raw/` (ou um subdir de `raw/`).

---

### [Tag Wrangler](https://github.com/pjeby/tag-wrangler)
**O que faz**: renomear/fundir/limpar tags em massa.
**Como ajuda**: depois de N ingestões, tags duplicadas (`projeto-x` vs
`projetox`) aparecem. Esse plugin resolve.
**Feedback**: **install quando aparecerem 50+ tags.** Antes disso, tag
discipline na mão dá conta.

---

### [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes)
**O que faz**: notas diárias/semanais/mensais com templates.
**Como ajuda**: se o oráculo for **pessoal** (journaling), entradas diárias
viram fontes naturais. Como a wiki é flat, ajuste o "Daily notes folder"
para `raw/journal/` (não `wiki/`) — entradas diárias são fontes, não
páginas curadas.
**Feedback**: **só para oráculos pessoais.** Outros não precisam.

---

### [Calendar](https://github.com/liamcain/obsidian-calendar-plugin)
**O que faz**: widget de calendário com links pras notas diárias.
**Como ajuda**: complementa Periodic Notes.
**Feedback**: opcional. Se já usa Periodic, instale junto.

---

### [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin)
**O que faz**: diagramas desenhados à mão dentro do Obsidian.
**Como ajuda**: páginas de conceito ganham um diagrama explicativo. Útil
para arquiteturas, mind maps, fluxos.
**Feedback**: **install se você é visual.** O agente pode até referenciar
diagramas com `![[diagrama.excalidraw]]`. Sem dor, dispensável.

---

### [Marp](https://github.com/MarcoGad/obsidian-marp) / [Slides Extended](https://github.com/MSzturc/obsidian-advanced-slides)
**O que faz**: gera slides a partir de markdown.
**Como ajuda**: pedir ao agente "monta um deck a partir das páginas X, Y, Z"
e exportar PDF/PPTX.
**Feedback**: **só se você apresenta.** Para uso pessoal, dispensável.

---

### [Graph Analysis](https://github.com/SkepticMystic/graph-analysis)
**O que faz**: métricas sobre o grafo (centralidade, similaridade,
co-citação).
**Como ajuda**: identificar páginas-hub, comunidades, sugestões de links.
**Feedback**: **legal a partir de 100+ páginas.** Antes disso, observação
visual basta.

---

### [Smart Connections](https://github.com/brianpetro/obsidian-smart-connections)
**O que faz**: embeddings locais + chat com vault.
**Como ajuda**: busca semântica nativa no Obsidian.
**Feedback**: **conflita com a filosofia do oráculo** (o agente é o
Claude Code, não um plugin). Pode confundir o fluxo. **Não recomendo.**

---

### [Copilot for Obsidian](https://github.com/logancyang/obsidian-copilot)
**O que faz**: chat com LLM dentro do Obsidian.
**Como ajuda**: conversa rápida sem sair do Obsidian.
**Feedback**: **conflita com o Claude Code.** Você usaria duas interfaces
ao mesmo tempo. **Não recomendo.**

---

## Plugins dispensáveis para o oráculo

### Tasks
**Por que dispensar**: o oráculo é base de conhecimento, não gerenciador
de tarefas. Tasks misturam mundos.

### Kanban
**Por que dispensar**: idem.

### Daily Notes (sem Periodic Notes)
**Por que dispensar**: Periodic Notes é superior. Use o Periodic.

### Mind Map (de markdown headings)
**Por que dispensar**: graph view + Excalidraw cobrem.

### Style Settings
**Por que dispensar**: estética. Não atrapalha mas não ajuda.

---

## Configurações do Obsidian que valem ajustar

Mesmo sem plugins extras, abra **Settings** e configure:

### Files & Links
- **Default location for new attachments**: `raw/assets/`. Garante que
  imagens coladas/clipadas vão para o lugar certo (e o agente pode lê-las
  como fonte).
- **Use [[Wikilinks]]**: ✅ ativado. Compatível com convenção do
  `CLAUDE.md`.
- **New link format**: `Relative path to file`. Importante para os
  wikilinks ficarem bem formados.

### Editor
- **Strict line breaks**: ✅ ativado. Mantém markdown previsível.

### Hotkeys
- Aperte `Cmd+G` para Graph view (já é default).
- (Se usar Web Clipper) bind `Cmd+Shift+D` para "Download attachments
  for current file" — baixa imagens externas localmente, conforme dica do
  gist do Karpathy.

### Appearance
- **Default new tab page**: `wiki/overview.md`. Abre na "home" do oráculo.

---

## Resumo TL;DR

| Plugin                 | Quando instalar              | Prioridade |
|------------------------|------------------------------|------------|
| Dataview               | dia 1                        | 🟢 alta    |
| Templater              | dia 1                        | 🟢 alta    |
| Obsidian Web Clipper   | quando ingerir conteúdo web  | 🟢 alta    |
| Tag Wrangler           | ao passar de 50 tags         | 🟡 média   |
| Periodic Notes         | só oráculos pessoais         | 🟡 média   |
| Excalidraw             | se for visual                | 🟡 média   |
| Marp                   | só se apresenta              | 🔵 baixa   |
| Graph Analysis         | após 100+ páginas            | 🔵 baixa   |
| Smart Connections      | **não**                      | ⚫ pular   |
| Copilot for Obsidian   | **não**                      | ⚫ pular   |
