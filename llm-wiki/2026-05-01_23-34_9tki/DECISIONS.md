# DECISIONS.md — Decisões vigentes do projeto

> Registro estruturado das decisões de design do `create-source-base`.
> Substitui o `PLAN.md` antigo (cronológico + estudo preliminar).
>
> **Convenção**: cada decisão é uma seção curta com **contexto**,
> **decisão**, **por quê** e **status**. Sem datas no corpo —
> ordem temática, não cronológica. Quem quer cronologia, vê `git
> log`. Decisões superadas ficam no §D, com link para a que
> substituiu.
>
> **Status possíveis**:
> - `vigente` — está em vigor;
> - `superada por §X` — substituída por outra decisão (link no §D);
> - `revogada` — abandonada sem substituta.

---

## A. Distribuição & estrutura de pacote

### A1. Distribuído como pacote npm `create-source-base`

**Contexto**: o template começou como pasta clonada via `git
clone` + `setup.sh`. Pesado pra distribuir e atualizar.

**Decisão**: virou pacote npm publicável. Uso = `npx
create-source-base meu-oraculo`.

**Por quê**:
- Onboarding em 1 linha, sem clone manual nem `chmod +x`.
- Versão e publicação tracked pelo npm; não dependemos de tag git.
- `commander` + `prompts` substituem o shell script com prompts
  interativos mais ricos.

**Status**: vigente.

---

### A2. Convenção PT-BR no conteúdo, EN nos filenames e frontmatter keys

**Contexto**: oráculo PT-BR misturando filenames PT-BR
(`fontes/origem-x.md`) com convenções markdown em EN gera atrito
e wikilinks feios.

**Decisão**: filenames e chaves de frontmatter sempre em EN
(`source-x.md`, `type:`, `original_file:`); valores e corpo em
PT-BR. Wikilinks `[[english-filename]]` ou `[[english-filename|texto pt-br]]`.

**Por quê**:
- EN nos filenames é o padrão do ecossistema markdown/Obsidian.
- Permite alias PT-BR no link sem renomear o arquivo.
- Frontmatter keys em EN funcionam com qualquer plugin Dataview /
  Templater sem custom locale.

**Status**: vigente.

---

### A3. Layout i18n: `_common/` + `<lang>/_shared/` + `<lang>/_presets/`

**Contexto**: a maioria dos artefatos do template (scripts,
package.json, .gitignore, slash commands) é idioma-agnóstica.
Manter tudo dentro de `pt-br/` duplicaria quando entrar `en/`.

**Decisão**:
- `template/_common/` — artefatos idioma-agnósticos;
- `template/<lang>/_shared/` — docs e seeds no idioma;
- `template/<lang>/_presets/<preset>/` — páginas-semente do preset.

CLI copia em camadas: `_common/` → `<lang>/_shared/` → preset.

**Por quê**:
- Zero duplicação na hora de adicionar `en/`.
- Mudanças em scripts/commands atingem todos os idiomas no mesmo
  diff.

**Status**: vigente.

---

### A4. Slash commands em EN, mesmo gerando oráculo PT-BR

**Contexto**: slash commands são prompts pro agente (operacionais:
"read raw/X → write wiki/source-Y.md"), não mensagens pro usuário.

**Decisão**: prompts em EN. Cada slash command começa com
`> Communicate with the user in the language defined by CLAUDE.md`.
O `CLAUDE.md` (em PT-BR) define o idioma de comunicação.

**Por quê**:
- ~25–30% mais barato em tokens.
- Procedimento é puramente operacional, não depende da língua do
  conteúdo.
- Comunicação com usuário continua PT-BR via instrução do
  `CLAUDE.md`.

**Status**: vigente.

---

### A5. Meta-docs do projeto vivem no root, fora do template

**Contexto**: `CLAUDE-SKILLS.md` e `OBSIDIAN.md` são docs **do
`create-source-base`** (catálogo de skills com feedback de
custo/benefício, avaliação de plugins) — não conteúdo do oráculo
gerado. Estavam em `template/pt-br/_shared/` e iam dentro de cada
oráculo, errado.

**Decisão**: movidos pro root. Oráculo gerado fica com 2
markdowns no root (`README.md`, `CLAUDE.md`).

**Por quê**:
- Separa "doc do projeto" de "doc do oráculo".
- Oráculo gerado fica enxuto.

**Status**: vigente.

---

## B. Modelo do oráculo gerado

### B1. Padrão Karpathy: `raw/` imutável + `wiki/` LLM-only + `CLAUDE.md` schema

**Contexto**: existem várias formas de organizar uma "wiki LLM"
(Notion-like, agente livre, etc). Karpathy propõe um padrão
disciplinado: três camadas com responsabilidades claras.

**Decisão**:
- `raw/` — fontes originais imutáveis;
- `wiki/` — markdown interlinkado, escrito 100% pelo LLM;
- `CLAUDE.md` — schema/instruções que transformam o LLM em
  mantenedor disciplinado.

**Por quê**:
- Provenance rastreável (toda página da wiki cita raw).
- LLM como "redator único" elimina conflitos de estilo.
- Schema explícito reduz drift do agente.

**Status**: vigente.

---

### B2. Wiki flat, sem subpastas

**Contexto**: a primeira versão tinha `wiki/entities/`,
`wiki/concepts/`, `wiki/sources/`. Categorização por pasta cria
fricção (mover arquivo quebra wikilink) e duplica a informação
que já existe no frontmatter.

**Decisão**: `wiki/` flat. Categorização emerge via `type:` no
frontmatter e prefixo de filename (`source-`, `entity-`,
`concept-`, `analysis-`).

**Por quê**:
- Wikilinks `[[X]]` resolvem em 1 lugar só.
- Filtragem por `type` faz via Dataview, não via filesystem.
- Renomear/recategorizar é só trocar prefixo, sem mover.

**Status**: vigente.

---

### B3. `raw/` é imutável **para o agente**, não para o usuário

**Contexto**: releitura do gist do Karpathy esclareceu que a
imutabilidade é restrição do **LLM**, não do curador humano. O
`CLAUDE.md` antigo dizia "raw/ é imutável" sem desambiguar.

**Decisão**: `raw/` pode ser editado livremente pelo usuário (ele
é o curador). O agente nunca escreve em `raw/`. `CLAUDE.md` §2.1
deixa explícito: "agente não escreve; usuário edita à vontade".

**Por quê**:
- Fiel ao gist original do Karpathy.
- Permite o usuário corrigir uma fonte e re-ingerir.

**Status**: vigente.

---

### B4. Re-ingest reusa `/wiki-ingest` (sem comando novo)

**Contexto**: re-ingerir uma fonte que mudou é a mesma operação
semântica de ingerir uma fonte nova; só muda que existe estado
prévio na wiki.

**Decisão**: `/wiki-ingest` ganha **passo 0** (detecção): busca
em `wiki/source-*.md` por `original_file: $ARGUMENTS`. Se existe
→ modo update (preserva `created:`, atualiza no lugar, loga como
`reingest`). Se não → fluxo normal de ingest novo.

**Por quê**:
- Branch implícito (estado existe na wiki) é mais simples que
  duplicar comando + script + docs.
- Usuário não precisa lembrar qual comando usar.

**Status**: vigente.

---

### B5. Manifesto derivado em runtime, sem state armazenado

**Contexto**: pergunta natural depois do primeiro `/wiki-init`:
"o que já ingeri / o que falta?". Provenance distribuída no
frontmatter (`original_file:`) responde "o que ingeri", mas mal
"o que falta".

**Decisão**: `scripts/manifest.mjs` (~150 linhas, sem deps).
Anda em `raw/`, extrai `original_file:` de cada
`wiki/source-*.md`, cruza os dois. Sem arquivo de state.

**Por quê**:
- State armazenado drifa silenciosamente quando o usuário
  renomeia/move arquivos em `raw/`.
- Recomputar do zero a cada execução elimina essa classe inteira
  de bugs.
- Custo (I/O de frontmatters) é desprezível em wikis até ~mil
  páginas.

**Status**: vigente.

---

## C. Agente & runtime

### C1. Claude Code como agente padrão (interativo + headless)

**Contexto**: padrão Karpathy exige agente capaz de editar 10–15
markdowns numa passada, seguir schema, decidir create vs update.
Modelos locais 7–9B em 16 GB têm dificuldade real nisso.

**Decisão**: Claude Code como agente padrão. Uso interativo via
slash commands; uso headless via `claude -p` em `scripts/run.mjs`.

**Por quê**:
- Qualidade alta em **resolve** e **lint** (mexer em N arquivos
  coerentemente).
- Slash commands em `.claude/commands/*.md` são primeira-classe.
- Headless permite automação (`npm run ingest fonte.pdf`).

**Status**: vigente.

---

### C2. Sem Ollama / sem agente local na v1

**Contexto**: pedido inicial era "LLM local". Análise mostrou que
modelos ≤9B em 16 GB cortam qualidade demais em multi-file edit.

**Decisão**: v1 fica em Claude Code. Local-only / Ollama fica
como "futuro / talvez", reavaliado depois do oráculo maduro.

**Por quê**:
- Aprender o padrão e ter wiki útil > provar que roda local.
- Sem dados privados na primeira versão (Barney informou).
- Híbrido (Formato 4 do estudo original) só faz sentido depois
  da rotina estabelecida.

**Status**: vigente.

---

### C3. Skills mínimas no template; expansão sob demanda

**Contexto**: o ecossistema Anthropic Skills tem dezenas de
skills úteis, mas instalar todas polui o oráculo gerado e gasta
tokens em discovery.

**Decisão**: template inclui só o núcleo (init, ingest, query,
lint, status). Demais ficam catalogadas em `CLAUDE-SKILLS.md`
com feedback de custo/benefício, instaladas sob demanda.

**Por quê**:
- Oráculo gerado fica enxuto.
- `CLAUDE-SKILLS.md` vira checklist quando o usuário sente dor.

**Status**: vigente.

---

### C4. Nenhum plugin Obsidian pré-instalado

**Contexto**: Obsidian é só o visualizador; vault funciona sem
plugin. Pré-instalar Dataview/Templater/etc no template gera
acoplamento desnecessário.

**Decisão**: zero plugin pré-instalado. `OBSIDIAN.md` cataloga
recomendados com prioridade (Dataview/Templater dia 1, Web
Clipper conforme aparecer conteúdo web).

**Por quê**:
- Vault permanece portável (abre em qualquer editor markdown).
- Decisão de plugin fica do usuário, não do template.

**Status**: vigente.

---

## D. Decisões superadas

### D1. ~~`setup.sh` + `git clone` como método de instalação~~

Superada por **A1**. Pacote npm publicável substitui setup script
e clone manual.

### D2. ~~`TEMPLATE.md` no oráculo gerado~~

Superada por **A5** + reorganização. Conteúdo absorvido:
- "Customizações por domínio" → `CLAUDE.md` §10.
- "Drift recovery" → `README.md` PT-BR como seção própria.

### D3. ~~Subpastas `entities/`, `concepts/`, `sources/` em `wiki/`~~

Superada por **B2**. Wiki flat com categorização via `type:` e
prefixo de filename.

### D4. ~~`raw/` imutável também para o usuário~~

Superada por **B3**. Imutabilidade é restrição do agente apenas;
usuário é curador.

### D5. ~~Comando `/wiki-reingest` separado~~

Nunca implementado. Superada antecipadamente por **B4**:
`/wiki-ingest` detecta o caso via passo 0.
