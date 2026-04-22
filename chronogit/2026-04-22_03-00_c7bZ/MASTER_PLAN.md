# Plano Mestre do Produto — ChronoGit

## 1. Identificação do produto

**Nome:** ChronoGit
**Categoria:** CLI open source para governança de fluxo Git, automação de changelog, apoio a releases e assistência inteligente de commits
**Comando principal:** `chrono`
**Alias curto opcional:** `cg`
**Distribuição alvo:** npm package global e local
**Stack principal:** Node.js + TypeScript
**Formato de configuração:** YAML
**Pasta de configuração do repo:** `.chrono/`
**Pasta de configuração global:** `~/.chrono/`
**Objetivo central:** transformar o fluxo Git de um repositório em um contrato explícito, versionado, validável e operacional

---

# 2. Resumo executivo

O ChronoGit será uma CLI que lê um arquivo de workflow do repositório e, a partir dele, consegue:

* validar se branches, commits e promoções seguem o fluxo esperado
* ajudar na criação de branches padronizadas
* apoiar merges e promoções entre branches
* sincronizar branches com suas bases
* gerar changelogs entre refs
* gerar release notes
* abrir pull requests padronizados
* sugerir commit messages, inclusive com IA
* fazer code review automatizado com guidelines por linguagem
* explicar o workflow do repositório para onboarding e governança
* servir como motor de política operacional para times que usam GitFlow, Trunk Based, Dev/HML/Prod e fluxos customizados

O produto não será apenas um conjunto de aliases Git. Ele será uma **camada de inteligência e política sobre Git**, mantendo Git como fonte da verdade e o workflow YAML como fonte da regra.

---

# 3. Problema que o produto resolve

Hoje, em muitos times, o fluxo Git sofre com os seguintes problemas:

* regras orais e não documentadas
* branches com nomes inconsistentes
* dúvidas sobre branch base correta
* promoções erradas entre ambientes
* hotfixes sem replicação para branches corretas
* commits fora do padrão
* changelog manual ou inconsistente
* release notes mal montadas
* onboarding lento para novos devs
* dependência de liderança para lembrar "como funciona o fluxo daqui"
* code review inconsistente e sem padrões explícitos

O ChronoGit resolve isso ao centralizar o fluxo em arquivo declarativo e operar esse fluxo com uma CLI padronizada.

---

# 4. Objetivos do produto

## 4.1 Objetivo principal

Entregar uma CLI open source capaz de ler e aplicar um workflow Git declarativo por repositório, oferecendo validação operacional, automação de changelog, suporte a promoção entre branches, assistência a commits e code review automatizado.

## 4.2 Objetivos secundários

* fornecer branding próprio, independente de alias Git
* permitir workflow explícito por arquivo
* suportar múltiplos modelos reais de branching
* permitir uso em times pequenos e grandes
* ser extensível para recursos de IA
* ser utilizável em terminal, CI e automações
* reduzir erro humano e ambiguidade em fluxo Git
* permitir guidelines de code review por linguagem e por repositório

## 4.3 Objetivos de adoção

* ser simples de instalar
* ter curva de entrada rápida
* funcionar bem em repositórios já existentes
* permitir adoção progressiva
* permitir bootstrap a partir de arquivos-base oficiais

---

# 5. Não objetivos (v0.1)

O ChronoGit não terá como objetivo inicial:

* substituir Git
* ser GUI
* gerenciar hospedagem GitHub/GitLab/Bitbucket de forma nativa (apenas GitHub via `gh` CLI na v0.1)
* alterar branch protection diretamente no provedor
* fazer deploy
* ser um sistema de CI/CD
* ser um framework de semver completo corporativo
* modelar toda a esteira da empresa além do fluxo Git local do repositório

Essas integrações podem existir no futuro. Veja `FUTURE.md`.

---

# 6. Princípios de produto

## 6.1 Regra explícita

Toda regra importante do fluxo deve existir no arquivo do repositório.

## 6.2 Git como fonte de verdade

Estado de branches, commits, tags, diffs e refs vem do Git.

## 6.3 Configuração visível

Nada de preset oculto em runtime. Arquivos-base oficiais existem como arquivos reais e o repo usa seu próprio `workflow.yaml`.

## 6.4 IA como assistente

IA sugere, resume e melhora a UX. Não define fluxo nem inventa estado.

## 6.5 Evolução incremental

O schema não deve nascer monstruoso. Deve crescer com coerência.

## 6.6 UX de CLI profissional

Mensagens claras, erros objetivos, flags previsíveis e saída legível.

## 6.7 Guidelines como extensão de produto

Guidelines de review por linguagem são arquivos versionáveis e compartilháveis. Podem virar pacotes oficiais (`@chronogit/guidelines-typescript`, etc.).

---

# 7. Usuários-alvo

## 7.1 Desenvolvedor individual

Quer padronizar commits, branches e changelog no próprio projeto.

## 7.2 Tech lead

Quer governar o fluxo Git do time sem depender de tradição oral.

## 7.3 Time de engenharia

Quer um contrato claro de fluxo e uma forma de validar aderência.

## 7.4 Equipe de plataforma / DevEx

Quer padronizar múltiplos repositórios, incluindo guidelines de review compartilhados.

## 7.5 Maintainers open source

Querem uma CLI que ajude em release notes, changelog e governança.

---

# 8. Casos de uso principais

## 8.1 Inicialização do projeto

* copiar um workflow base para o repo
* validar o arquivo
* explicar o fluxo

## 8.2 Operação diária

* criar feature branch corretamente
* validar branch atual
* sincronizar branch com base
* gerar commit no padrão
* validar o estado antes de merge ou promoção
* abrir PR no padrão

## 8.3 Promoção entre branches

* promover `dev -> hml`
* promover `hml -> prod`
* validar que a promoção é permitida
* gerar changelog da promoção

## 8.4 Hotfix

* criar hotfix de `prod`
* publicar em `prod`
* obrigar replicação posterior para `dev` e/ou `hml`

## 8.5 Release

* gerar changelog entre tag e HEAD
* gerar release notes
* validar requisito de tag

## 8.6 Onboarding

* explicar o fluxo do repo
* mostrar branches permanentes, temporárias e transições

## 8.7 Code Review

* executar review automatizado de staged changes ou diff entre refs
* aplicar guidelines por linguagem definidas no repositório
* usar guidelines de pacotes oficiais `@chronogit/guidelines-*`

---

# 9. Visão funcional do produto

O produto será dividido em grandes módulos:

1. Workflow Engine
2. Git Runtime Adapter
3. Validation Engine
4. Branch Operations
5. Sync Engine
6. Promotion Engine
7. Commit Assistant
8. Changelog Engine
9. Release Notes Engine
10. PR Engine
11. Review Engine
12. Explain / Diagnostic Engine
13. AI Integration Layer
14. CLI Layer
15. Config / File System Layer
16. Cherry-pick Engine
17. Mergetool Handler

---

# 10. Estrutura do projeto técnico

```txt
chronogit/
  src/
    cli/
      commands/
      flags/
      prompts/
      output/
      formatters/
    application/
      workflow/
      validation/
      branch/
      sync/
      promotion/
      commit/
      changelog/
      release/
      pr/
      review/
      explain/
      doctor/
    domain/
      workflow/
      git/
      commits/
      transitions/
      changelog/
      release/
      review/
      ai/
    infra/
      git/
      fs/
      yaml/
      config/
      ai/
      terminal/
      logger/
    workflows/
      gitflow.yaml
      trunkbased.yaml
      dev-prod.yaml
      dev-hml-prod.yaml
    index.ts
  test/
    unit/
    integration/
    fixtures/
  docs/
  package.json
  README.md
  FUTURE.md
```

---

# 11. Arquitetura lógica

## 11.1 CLI Layer

Responsável por:

* leitura de argumentos
* flags
* subcomandos
* prompts interativos
* renderização de saída

## 11.2 Application Layer

Responsável por:

* orquestração de casos de uso
* composição de regras de domínio com adapters

## 11.3 Domain Layer

Responsável por:

* tipos centrais
* validações puras
* matching de branch
* resolução de transições
* agrupamento de changelog
* convenções de commit
* estrutura de review guidelines

## 11.4 Infra Layer

Responsável por:

* executar Git
* ler/escrever arquivos
* parsear YAML
* chamar provedores de IA
* lidar com stdout/stderr

---

# 12. Estrutura de configuração

## 12.1 Pasta padrão no repositório

```txt
.chrono/
```

> **Nota:** O nome da pasta é `.chrono/`, não `.chronogit/`. Mais curto e limpo.

## 12.2 Arquivos da pasta `.chrono/`

```txt
.chrono/
  workflow.yaml              # workflow do repo (branches, transitions, rules)
  config.yaml                # configurações operacionais do repo
  review-guidelines.yaml     # configuração de review (quais linguagens/guidelines)
  guidelines/                # guidelines por linguagem
    typescript.yaml
    react.yaml
    python.yaml
```

## 12.3 Pasta global do dev

```txt
~/.chrono/
  config.yaml                # preferências pessoais (ai, editor, output)
```

## 12.4 Arquivos-base oficiais embutidos no pacote

```txt
src/workflows/
  gitflow.yaml
  trunkbased.yaml
  dev-prod.yaml
  dev-hml-prod.yaml
```

## 12.5 Guideline packs oficiais (futuro)

```txt
@chronogit/guidelines-typescript
@chronogit/guidelines-react
@chronogit/guidelines-python
```

## 12.6 Conceito

O repositório sempre opera sobre seu próprio `workflow.yaml`. Arquivos oficiais são apenas ponto de partida. A pasta `.chrono/` é comprometida no git e faz parte do contrato do repositório.

---

# 13. Schema funcional do workflow

## 13.1 Caminho padrão

```txt
.chrono/workflow.yaml
```

## 13.2 Campos de topo

```yaml
version:
name:
description:
branches:
branchTypes:
rules:
transitions:
commits:
release:
ai:
```

## 13.3 Campo `version`

Versão do schema do workflow.

```yaml
version: 1
```

## 13.4 Campo `name`

Nome amigável do workflow.

## 13.5 Campo `description`

Descrição opcional do fluxo.

## 13.6 Campo `branches`

Mapa das branches permanentes do repositório.

## 13.7 Campo `branchTypes`

Tipos de branches temporárias.

## 13.8 Campo `rules`

Regras globais, por branch e por comportamento.

## 13.9 Campo `transitions`

Relações de promoção / merge permitidas.

## 13.10 Campo `commits`

Regras específicas para commits.

## 13.11 Campo `release`

Regras específicas de tagging, changelog e release notes.

## 13.12 Campo `ai`

Configurações de IA.

---

# 14. Especificação detalhada do schema de workflow

## 14.1 `branches`

```yaml
branches:
  dev:
    role: integration
    permanent: true
    protected: false
    description: branch de integração
```

### Campos suportados

* `role`: papel semântico da branch
* `permanent`: se é branch fixa
* `protected`: expectativa de proteção lógica
* `description`: texto explicativo

### Roles sugeridas

* `trunk`
* `production`
* `staging`
* `integration`
* `development`
* `release-base`

## 14.2 `branchTypes`

```yaml
branchTypes:
  feature:
    pattern: "^feature\\/[a-z0-9._-]+$"
    from: [dev]
    to: [dev]
    temporary: true
    description: novas funcionalidades
```

### Campos suportados

* `pattern`
* `from`
* `to`
* `temporary`
* `description`
* `requireTicket`: opcional
* `ticketPattern`: opcional
* `defaultStrategy`: opcional
* `examples`: opcional

## 14.3 `rules.defaults`

```yaml
rules:
  defaults:
    directCommit: false
    requirePullRequest: true
    requireCleanWorkingTree: false
    requireUpToDateBase: false
```

### Campos suportados

* `directCommit`
* `requirePullRequest`
* `requireCleanWorkingTree`
* `requireUpToDateBase`
* `requireLinearHistory`
* `defaultMergeStrategy`
* `defaultOutputFormat`

## 14.4 `rules.branches`

```yaml
rules:
  branches:
    prod:
      protected: true
      requireTag: true
      changelogRequired: true
      releaseNotesRequired: true
      requireReviewCount: 2
```

### Campos suportados

* `protected`
* `directCommit`
* `requirePullRequest`
* `requireTag`
* `changelogRequired`
* `releaseNotesRequired`
* `requireReviewCount`
* `requireCleanWorkingTree`
* `requireUpToDateBase`
* `allowedSources`
* `allowedTargets`
* `allowHotfixOnly`
* `blockIfDirty`

## 14.5 `transitions`

```yaml
transitions:
  - from: "dev"
    to: "hml"
    strategy: merge-commit
    requirePullRequest: true
    generateChangelogPreview: true
```

### Campos suportados

* `from`
* `to`
* `strategy`
* `requirePullRequest`
* `requireTag`
* `generateChangelog`
* `generateChangelogPreview`
* `generateReleaseNotes`
* `requiredAfter`
* `emergency`
* `description`

### Estratégias válidas

* `merge-commit`
* `squash`
* `rebase`
* `fast-forward`
* `manual`

## 14.6 `commits`

```yaml
commits:
  convention: conventional
  requireScope: false
  maxSubjectLength: 100
  allowedTypes:
    - feat
    - fix
    - chore
    - refactor
    - docs
    - test
    - perf
    - ci
```

### Campos suportados

* `convention`
* `requireScope`
* `maxSubjectLength`
* `allowedTypes`
* `allowBreakingChange`
* `bodyRequiredForBreakingChange`

## 14.7 `release`

```yaml
release:
  tagging:
    enabled: true
    mode: semver
    pattern: "^v\\d+\\.\\d+\\.\\d+$"
  changelog:
    enabled: true
    output: CHANGELOG.md
    mode: conventional
  releaseNotes:
    enabled: true
    style: technical
```

### Campos suportados

* `tagging.enabled`
* `tagging.mode`
* `tagging.pattern`
* `tagging.prefix`
* `changelog.enabled`
* `changelog.output`
* `changelog.mode`
* `changelog.groupBy`
* `changelog.includeAuthors`
* `releaseNotes.enabled`
* `releaseNotes.style`
* `releaseNotes.output`

## 14.8 `ai`

```yaml
ai:
  enabled: true
  commitMessages: true
  changelogEnhancement: true
  releaseNotes: true
  explainDiff: true
  review: true
  provider: anthropic
  model: claude-sonnet-4-6
```

### Campos suportados

* `enabled`
* `provider`
* `model`
* `commitMessages`
* `changelogEnhancement`
* `releaseNotes`
* `explainDiff`
* `review`

---

# 15. Schema de configuração operacional

## 15.1 `.chrono/config.yaml` (nível repo — versionável)

```yaml
pr:
  defaultTarget: development
  template: .github/PULL_REQUEST_TEMPLATE.md
  provider: github

sync:
  strategy: rebase        # ou merge (padrão: rebase)

commit:
  requireTicket: false
  ticketPattern: "^[A-Z]+-\\d+$"
```

## 15.2 `~/.chrono/config.yaml` (nível global — pessoal, não versionado)

```yaml
ai:
  provider: anthropic
  apiKey: ${ANTHROPIC_API_KEY}
  model: claude-sonnet-4-6
  auto: false             # se true, commit e changelog usam IA automaticamente (sem --ai)

editor: nano

stash:
  autoStash: true         # faz stash automático antes de trocar de branch
  autoRecover: true       # restaura stash automaticamente após a operação

mergetool:
  tool: vscode            # ferramenta padrão para resolver conflitos (vscode, intellij, p4merge, vimdiff, etc.)

output:
  color: true
  format: text
```

## 15.3 Hierarquia de resolução de config

```
1. defaults internos (hardcoded no binário)
2. ~/.chrono/config.yaml    (preferências globais do dev)
3. .chrono/config.yaml      (config do repo — versionável)
4. git config branch.<n>.X  (override por branch — runtime, por dev)
```

Chave mais específica sempre vence.

---

# 16. Schema de review guidelines

## 16.1 `.chrono/review-guidelines.yaml`

```yaml
review:
  enabled: true
  languages:
    typescript: ./guidelines/typescript.yaml
    react: ./guidelines/react.yaml
```

## 16.2 `.chrono/guidelines/typescript.yaml`

```yaml
name: TypeScript Guidelines
rules:
  - id: no-empty-catch
    description: "Never use empty catch blocks. Always handle or log the error."
    severity: error
  - id: explicit-return-types
    description: "Public functions should have explicit return types."
    severity: warning
  - id: no-any
    description: "Avoid 'any' type. Use 'unknown' or proper typing."
    severity: error
  - id: descriptive-names
    description: "Variables and functions should have descriptive names."
    severity: warning
  - id: no-console
    description: "Avoid console.log in production code. Use the logger."
    severity: warning
```

### Campos suportados por regra

* `id`: identificador único
* `description`: descrição da regra para a IA
* `severity`: `error`, `warning`, `info`

## 16.3 Guideline packs oficiais (futuro)

No futuro, guidelines poderão ser instalados como pacotes npm:

```bash
npm install -D @chronogit/guidelines-typescript
```

E referenciados no `review-guidelines.yaml`:

```yaml
review:
  enabled: true
  languages:
    typescript: "@chronogit/guidelines-typescript"
```

---

# 17. Arquivos-base oficiais de workflow

## 17.1 `gitflow.yaml`

Fluxo baseado em:

* `main` e `develop` permanentes
* `feature/*` nasce de `develop`
* `release/*` nasce de `develop`
* `hotfix/*` nasce de `main`, retorna para `main` e `develop`

## 17.2 `trunkbased.yaml`

Fluxo baseado em:

* `main` permanente
* branches curtas, merge em `main`
* release simples e frequente

## 17.3 `dev-hml-prod.yaml`

Fluxo baseado em:

* `dev`, `hml`, `prod` permanentes
* promoções sequenciais entre ambientes
* hotfix direto de `prod`, replicação posterior para `dev` e `hml`

---

# 18. Comandos principais

## 18.1 Tier 1 — Core (P0) — Puros, sem IA

| Comando | Descrição |
|---|---|
| `chrono init` | Inicializa `.chrono/` no repo com workflow base |
| `chrono config` | Gerencia configurações (global, local, branch) |
| `chrono workflow list` | Lista workflows base disponíveis |
| `chrono workflow show` | Mostra workflow carregado |
| `chrono workflow validate` | Valida schema YAML do workflow |
| `chrono workflow explain` | Explica o fluxo semanticamente |
| `chrono status` | Estado do repo vs workflow |
| `chrono validate` | Valida branch/commits contra o workflow |

## 18.2 Tier 2 — Operações Git (P1) — Puros, sem IA

| Comando | Descrição |
|---|---|
| `chrono start` | Cria branch conforme o workflow |
| `chrono commit` | Commit convencional interativo |
| `chrono sync` | Sincroniza branch com base (stash, pull, merge/rebase, pop) |
| `chrono pr` | Abre PR no GitHub com ticket e template |
| `chrono changelog` | Gera changelog entre refs |
| `chrono rollback` | Rollback seguro via revert branch + PR (não reescreve história) |
| `chrono cherrypick` | Seleciona e aplica commits de outra branch interativamente |

## 18.3 Tier 3 — Análise e Promoção (P2) — Puros, sem IA

| Comando | Descrição |
|---|---|
| `chrono doctor` | Diagnóstico aprofundado do repo e fluxo |
| `chrono plan` | Plano de comparação/promoção entre refs |
| `chrono promote` | Apoio à promoção entre branches |
| `chrono workspace` | Gerencia git worktrees |
| `chrono ssh-config` | Configura SSH/identidade por repo |
| `chrono mergetool` | Configura e lança mergetool para resolver conflitos |

## 18.4 Tier 4 — IA (P3) — Precisam de provider

| Comando/Flag | Descrição |
|---|---|
| `chrono commit --ai` | Sugere mensagem de commit via IA |
| `chrono changelog --ai` | Melhora changelog via IA |
| `chrono explain` | Explica mudanças em linguagem natural (IA-first) |
| `chrono review` | Code review com guidelines por linguagem (IA-first) |
| `chrono release-notes` | Gera release notes para stakeholders (IA-first) |

---

# 19. Detalhamento dos módulos

## 19.1 Workflow Engine

### Responsabilidades

* localizar arquivo de workflow em `.chrono/workflow.yaml`
* parsear YAML
* validar tipos
* construir representação interna
* resolver patterns
* validar coerência

### Métodos mínimos

* `load(repoPath)`
* `validate(workflow)`
* `resolveType(branchName)`
* `resolveTransition(from, to)`

---

## 19.2 Git Runtime Adapter

### Responsabilidades

* obter branch atual
* listar branches
* resolver refs
* ler commits
* obter diff
* obter merge base
* obter tags
* obter ahead/behind

### Estratégia

Usar o binário `git` com adapter próprio. Sem wrappers de terceiros.

### Métodos mínimos

* `getCurrentBranch()`
* `getStatus()`
* `getDiff(from, to)`
* `getStagedDiff()`
* `getCommits(from, to)`
* `getTags()`
* `getMergeBase(a, b)`
* `getAheadBehind(a, b)`
* `createBranch(name, from)`
* `checkout(branch)`
* `stash()`
* `stashPop()`
* `pull(branch, strategy)`
* `merge(branch, strategy)`
* `rebase(branch)`

---

## 19.3 Validation Engine

### Responsabilidades

* validar branch atual contra workflow
* validar naming
* validar origem esperada
* validar destino
* validar commit convention
* validar transições

### Tipos de resultado

* `success`
* `warning`
* `error`
* `blocked`

---

## 19.4 Branch Operations

### Responsabilidades

* criar branch corretamente
* montar nomes com prefixos
* validar naming antes da criação
* suportar ticket opcional

---

## 19.5 Sync Engine

### Responsabilidades

* detectar branch base esperada pelo workflow
* fazer stash se working tree sujo
* atualizar branch base via pull
* voltar para branch original
* fazer merge ou rebase contra a base
* fazer stash pop
* reportar conflitos com clareza

---

## 19.6 Promotion Engine

### Responsabilidades

* resolver transição entre refs
* validar se transição existe no workflow
* avaliar requisitos (tag, PR, changelog)
* preparar changelog
* preparar release notes
* opcionalmente aplicar merge

---

## 19.7 Commit Assistant

### Responsabilidades

* ler staged diff
* classificar mudança
* inferir tipo e escopo
* validar regras do workflow
* montar mensagem final

---

## 19.8 Changelog Engine

### Responsabilidades

* agrupar commits entre refs
* produzir markdown
* separar breaking changes
* suportar modos `conventional`, `diff-summary`, `hybrid`

---

## 19.9 PR Engine

### Responsabilidades

* validar que branch tem prefixo permitido
* detectar ticket do branch name ou config
* resolver target via config hierárquica
* verificar PR existente (evitar duplicata)
* usar template se configurado
* invocar `gh` CLI para criar o PR

---

## 19.10 Review Engine

### Responsabilidades

* carregar `.chrono/review-guidelines.yaml`
* carregar guidelines de cada linguagem
* coletar staged diff ou diff entre refs
* montar prompt com guidelines para a IA
* categorizar findings por severidade
* exibir report com findings numerados

---

## 19.11 Release Notes Engine

### Responsabilidades

* traduzir mudanças técnicas para linguagem de release
* suportar estilos: `technical`, `stakeholder`, `compact`, `qa`
* operar com IA obrigatoriamente para estilos não técnicos

---

## 19.12 Explain Engine

### Responsabilidades

* explicar diff staged, diff entre refs ou promoção
* traduzir para linguagem natural via IA
* suportar estilos: `technical`, `plain`, `qa`, `summary`

---

## 19.14 Cherry-pick Engine

### Responsabilidades

* listar commits de uma branch de origem
* permitir seleção interativa e paginada de commits
* suportar multi-select de commits
* aplicar cherry-pick na ordem cronológica correta
* detectar e reportar conflitos com clareza
* suportar retomada após resolução de conflitos

---

## 19.15 Mergetool Handler

### Responsabilidades

* detectar ferramentas de merge instaladas no sistema
* resolver ferramenta a usar via config global (`mergetool.tool`)
* lançar ferramenta via `git mergetool --tool=<name>`
* listar ferramentas disponíveis no sistema
* configurar ferramenta padrão na config global

---

## 19.13 AI Layer

### Responsabilidades

* abstrair provider (Anthropic, OpenAI, etc.)
* montar prompts
* normalizar retorno
* proteger fluxo contra alucinação operacional

### Interface mínima

* `generateCommitMessage(diff, guidelines)`
* `enhanceChangelog(changelog, style)`
* `generateReleaseNotes(commits, style)`
* `explainDiff(diff, style)`
* `reviewDiff(diff, guidelines[])`

---

# 20. UX de terminal

## 20.1 Princípios

* mensagens curtas e claras
* erros acionáveis
* saída colorida por padrão, desabilitável com `--no-color`
* suporte a JSON para automação
* texto humano para uso manual
* `--help` em todos os comandos

## 20.2 Formatos de saída

* `text` (padrão)
* `json`

## 20.3 Estrutura de erro textual

```txt
Erro: <título curto>
Detalhe: <explicação>
Sugestão: <ação recomendada>
```

Exemplo:

```txt
Erro: branch atual inválida para iniciar feature
Atual: prod
Esperado: dev
Sugestão: faça checkout em dev e tente novamente
```

## 20.4 Estrutura de saída JSON

```json
{
  "ok": true,
  "command": "validate",
  "warnings": [],
  "errors": [],
  "data": {},
  "metadata": {}
}
```

---

# 21. Flags globais

Todos ou quase todos os comandos devem suportar:

* `--help`
* `--json`
* `--verbose`
* `--quiet`
* `--dry-run`
* `--cwd <path>`
* `--workflow <path>`
* `--no-color`

---

# 22. Códigos de erro

* `REPO_NOT_FOUND`
* `WORKFLOW_NOT_FOUND`
* `WORKFLOW_INVALID`
* `WORKFLOW_CONFLICT`
* `INVALID_BRANCH_NAME`
* `UNKNOWN_BRANCH_TYPE`
* `INVALID_BRANCH_BASE`
* `INVALID_TRANSITION`
* `TRANSITION_BLOCKED`
* `TAG_REQUIRED`
* `NO_STAGED_CHANGES`
* `INVALID_COMMIT_TYPE`
* `COMMIT_SCOPE_REQUIRED`
* `COMMIT_SUBJECT_TOO_LONG`
* `INVALID_RANGE`
* `REF_NOT_FOUND`
* `BRANCH_ALREADY_EXISTS`
* `PR_ALREADY_EXISTS`
* `SYNC_CONFLICT`
* `CHERRY_PICK_CONFLICT`
* `AI_PROVIDER_NOT_CONFIGURED`
* `REVIEW_GUIDELINES_NOT_FOUND`
* `CONFIG_NOT_FOUND`

---

# 23. Estratégia de IA

## 23.1 Provider padrão

Anthropic (configurável via `~/.chrono/config.yaml`).

## 23.2 Providers futuros

OpenAI, OpenRouter, provider local. Veja `FUTURE.md`.

## 23.3 Interface única

* `generateCommitMessage(diff, context)`
* `enhanceChangelog(raw, style)`
* `generateReleaseNotes(commits, style, guidelines)`
* `explainDiff(diff, style)`
* `reviewDiff(diff, guidelines[])`

## 23.4 Regras de segurança

* nunca assumir mudança não presente no diff
* nunca inferir branch policy
* sempre trabalhar sobre inputs explícitos do Git
* em caso de ambiguidade, responder com cautela
* API key nunca logada ou exposta em output

---

# 24. Estratégia de testes

## 24.1 Testes unitários

* parser YAML
* validators
* matching de regex
* resolução de transição
* formatter de changelog
* parser de commit

## 24.2 Testes de integração

* repositórios Git fixture
* branches reais
* commits reais
* tags
* diffs entre refs

## 24.3 Testes E2E

* `init`
* `validate`
* `start`
* `sync`
* `commit`
* `changelog`
* `workflow explain`

## 24.4 Fixtures

Criar repositórios de exemplo:

* `gitflow-fixture`
* `trunkbased-fixture`
* `dev-hml-prod-fixture`

---

# 25. Modelos de workflow oficiais

## 25.1 GitFlow

```yaml
version: 1
name: GitFlow
branches:
  main:
    role: production
    permanent: true
  develop:
    role: integration
    permanent: true
branchTypes:
  feature:
    pattern: "^feature\\/.+$"
    from: [develop]
    to: [develop]
    temporary: true
  release:
    pattern: "^release\\/.+$"
    from: [develop]
    to: [main, develop]
    temporary: true
  hotfix:
    pattern: "^hotfix\\/.+$"
    from: [main]
    to: [main, develop]
    temporary: true
commits:
  convention: conventional
  allowedTypes: [feat, fix, chore, refactor, docs, test, perf, ci]
```

## 25.2 Trunk Based

```yaml
version: 1
name: Trunk Based
branches:
  main:
    role: trunk
    permanent: true
branchTypes:
  feature:
    pattern: "^feature\\/.+$"
    from: [main]
    to: [main]
    temporary: true
  hotfix:
    pattern: "^hotfix\\/.+$"
    from: [main]
    to: [main]
    temporary: true
commits:
  convention: conventional
  allowedTypes: [feat, fix, chore, refactor, docs, test, perf, ci]
```

## 25.3 Dev / Prod

Fluxo enxuto com apenas duas branches permanentes, onde a feature branch é mergeada em `dev` para testes e integração. Uma vez validada, a **mesma feature branch** é mergeada diretamente em `prod` — sem ambiente intermediário. Indicado para times pequenos ou projetos com ciclos de entrega curtos.

```yaml
version: 1
name: Dev Prod
branches:
  dev:
    role: integration
    permanent: true
    description: branch de integração e testes
  prod:
    role: production
    permanent: true
    description: produção
branchTypes:
  feature:
    pattern: "^feature\\/.+$"
    from: [dev]
    to: [dev, prod]
    temporary: true
    description: feature mergeada em dev para testes, depois em prod diretamente
  bugfix:
    pattern: "^bugfix\\/.+$"
    from: [dev]
    to: [dev, prod]
    temporary: true
  hotfix:
    pattern: "^hotfix\\/.+$"
    from: [prod]
    to: [prod, dev]
    temporary: true
transitions:
  - from: feature
    to: dev
    strategy: merge-commit
    description: merge para integração e testes
  - from: feature
    to: prod
    strategy: merge-commit
    requireTag: true
    generateChangelog: true
    description: promoção direta para produção após validação em dev
  - from: dev
    to: prod
    strategy: merge-commit
    requireTag: true
    generateChangelog: true
    generateReleaseNotes: true
commits:
  convention: conventional
  allowedTypes: [feat, fix, chore, refactor, docs, test, perf, ci]
```

## 25.4 Dev / HML / Prod

```yaml
version: 1
name: Dev HML Prod
branches:
  dev:
    role: integration
    permanent: true
    description: branch de integração contínua
  hml:
    role: staging
    permanent: true
    description: homologação e QA
  prod:
    role: production
    permanent: true
    description: produção
branchTypes:
  feature:
    pattern: "^feature\\/.+$"
    from: [dev]
    to: [dev]
    temporary: true
  bugfix:
    pattern: "^bugfix\\/.+$"
    from: [dev]
    to: [dev]
    temporary: true
  hotfix:
    pattern: "^hotfix\\/.+$"
    from: [prod]
    to: [prod, dev, hml]
    temporary: true
  release:
    pattern: "^release\\/.+$"
    from: [dev]
    to: [hml, prod]
    temporary: true
transitions:
  - from: dev
    to: hml
    strategy: merge-commit
    generateChangelogPreview: true
  - from: hml
    to: prod
    strategy: merge-commit
    requireTag: true
    generateChangelog: true
    generateReleaseNotes: true
commits:
  convention: conventional
  allowedTypes: [feat, fix, chore, refactor, docs, test, perf, ci]
```

---

# 26. Dependências técnicas

## CLI framework

* `commander` ou `yargs`

## YAML

* `yaml`

## Terminal output

* `chalk`
* `ora` (spinner opcional)
* `cli-table3` (tabelas opcional)

## Git

* adapter próprio chamando o binário `git`

## Testes

* `vitest`

## GitHub PR

* `gh` CLI (pré-requisito para `chrono pr`)

---

# 27. Roadmap de execução

## Fase 0 — Foundation

* bootstrap do projeto TypeScript
* CLI base com commander
* parser e validator de YAML
* adapter Git mínimo
* workflows base oficiais
* estrutura de config (.chrono/)

## Fase 1 — Workflow Core

* `workflow validate`
* `workflow explain`
* `workflow show`
* `workflow list`
* `status`
* `validate`

## Fase 2 — Branch Operations

* `start`
* `sync`
* `cherrypick`

## Fase 3 — Commit Assistant

* `commit` (modo puro)
* conventional commit parser/validator

## Fase 4 — Changelog

* `changelog`
* write mode
* grouping modes

## Fase 5 — PR + Config + SSH + Mergetool + Rollback

* `pr` (GitHub via gh)
* `config`
* `ssh-config`
* `workspace`
* `mergetool`
* `rollback` (reutiliza PR Engine — extensível para GitLab/Bitbucket no futuro)

## Fase 6 — Promotion + Diagnosis

* `doctor`
* `plan`
* `promote`

## Fase 7 — IA Layer

* provider interface
* `commit --ai`
* `changelog --ai`
* `explain`
* `review`
* `release-notes`

---

# 28. Critérios de aceite do produto

## 28.1 Núcleo

* consegue carregar e validar `workflow.yaml`
* consegue interpretar branch atual
* consegue validar naming e tipo de branch
* consegue gerar changelog entre refs
* consegue sincronizar branch com base

## 28.2 UX

* mensagens claras em todos os erros
* flags consistentes
* ajuda por comando (`--help`)
* saída JSON válida e estável

## 28.3 Confiabilidade

* não quebra em repositório Git comum
* lida com ausência de tags
* lida com branch desconhecida de forma explícita
* não assume fluxo inexistente

---

# 29. Decisões já tomadas

* CLI própria em Node.js + TypeScript
* Workflow definido em YAML
* Pasta de configuração: `.chrono/` (não `.chronogit/`)
* Config do repo em `.chrono/config.yaml` (versionável)
* Config pessoal em `~/.chrono/config.yaml` (não versionado)
* Editor padrão: `nano`
* Arquivos base oficiais existem como arquivos reais
* IA opcional e desacoplada via interface única
* Git como fonte da verdade
* Review guidelines por linguagem, em arquivos separados
* GitHub como único provider de PR na v0.1
* `chrono diff` descartado — funcionalidade no `plan` e `explain`
* Guideline packs oficiais serão pacotes npm (`@chronogit/guidelines-*`) no futuro
* Anthropic como primeiro provider de IA (`claude-sonnet-4-6`); OpenAI e outros no futuro
* `rollback` usa fluxo seguro de `git revert` + branch de rollback + PR, sem reescrever história; implementado após PR Engine (Fase 5) para reutilizar infraestrutura extensível de PRs
* `cherrypick` nome sem hífen (consistência com CLI)
* config `mergetool.tool` é global/pessoal (`~/.chrono/config.yaml`), não por repo

---

# 30. Itens em aberto para decisão

* nome final do package npm
* biblioteca de CLI: `commander` vs `yargs`
* estratégia de snapshots de output nos testes
* formato exato do `config.yaml` global vs local (quais chaves em cada nível)
* nível de automação do `promote` no MVP (validar + planejar ou executar merge)
