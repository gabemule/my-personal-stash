# ChronoGit — Plano de Execução

Guia de desenvolvimento com checklists. Marque os itens conforme avança.

Para detalhes completos, consulte:
- `MASTER_PLAN.md` — arquitetura, schema, decisões e módulos
- `SPECS.md` — especificação detalhada de cada comando
- `FUTURE.md` — backlog de futuro

---

## Fase 0 — Foundation

> Bootstrap do projeto. Sem isso, nada funciona.

- [ ] Criar estrutura de pastas do projeto (`src/cli`, `src/application`, `src/domain`, `src/infra`)
- [ ] Configurar TypeScript (`tsconfig.json`, strict mode)
- [ ] Configurar `package.json` com bin entries:
  - [ ] `chrono` — binário principal
  - [ ] `cg` — alias curto (ambos apontam para o mesmo entry point)
- [ ] Instalar dependências base (`commander` ou `yargs`, `yaml`, `chalk`, `ora`, `cli-table3`)
- [ ] Instalar dependências de dev (`vitest`, `tsx`, `@types/node`)
- [ ] Criar CLI base com commander (entry point, help, version)
- [ ] Implementar suporte a flags globais em todos os comandos:
  - `--help` — ajuda do comando
  - `--json` — saída JSON estruturada (`ok`, `command`, `warnings`, `errors`, `data`)
  - `--verbose` — mais contexto técnico
  - `--quiet` — output mínimo
  - `--cwd <path>` — executa a partir de diretório específico
  - `--workflow <path>` — sobrescreve o caminho do workflow
  - `--no-color` — desabilita ANSI colors
  - `--dry-run` — simula sem alteração real
- [ ] Criar estrutura de saída JSON padronizada (`ok`, `command`, `warnings`, `errors`, `data`, `metadata`)
- [ ] Criar tratamento de erros com códigos padronizados:
  - `REPO_NOT_FOUND`, `WORKFLOW_NOT_FOUND`, `WORKFLOW_INVALID`, `WORKFLOW_CONFLICT`
  - `INVALID_BRANCH_NAME`, `UNKNOWN_BRANCH_TYPE`, `INVALID_BRANCH_BASE`
  - `INVALID_TRANSITION`, `TRANSITION_BLOCKED`, `TAG_REQUIRED`
  - `NO_STAGED_CHANGES`, `INVALID_COMMIT_TYPE`, `COMMIT_SCOPE_REQUIRED`, `COMMIT_SUBJECT_TOO_LONG`
  - `INVALID_RANGE`, `REF_NOT_FOUND`, `BRANCH_ALREADY_EXISTS`, `PR_ALREADY_EXISTS`
  - `SYNC_CONFLICT`, `CHERRY_PICK_CONFLICT`, `AI_PROVIDER_NOT_CONFIGURED`, `REVIEW_GUIDELINES_NOT_FOUND`, `CONFIG_NOT_FOUND`
- [ ] Criar Git Runtime Adapter (`src/infra/git/`) com métodos mínimos para Fase 0:
  - `getCurrentBranch()`, `getStatus()`, `getDiff(from, to)`, `getStagedDiff()`
  - `getCommits(from, to)`, `stash()`, `stashPop()`
  - > Os demais métodos (`getTags`, `getMergeBase`, `getAheadBehind`, `createBranch`, `checkout`, `pull`, `merge`, `rebase`) serão adicionados incrementalmente nas fases seguintes conforme os comandos precisarem.
- [ ] Criar parser de YAML (`src/infra/yaml/`)
- [ ] Criar loader de workflow (`src/infra/fs/` + `src/application/workflow/`)
- [ ] Criar Validation Engine (`src/application/validation/`) com tipos de resultado:
  - `success` — tudo ok
  - `warning` — problema não fatal, operação continua
  - `error` — falha do comando
  - `blocked` — ação impedida por regra do workflow
- [ ] Criar estrutura de config resolution em camadas:
  - `1. defaults internos` → `2. ~/.chrono/config.yaml` → `3. .chrono/config.yaml` → `4. git config branch.<n>.X`
- [ ] Criar os 4 arquivos-base de workflow em `src/workflows/`:
  - `gitflow.yaml`
  - `trunkbased.yaml`
  - `dev-prod.yaml`
  - `dev-hml-prod.yaml`
- [ ] Setup de testes com vitest

---

## Fase 1 — Workflow Core + Config (P0)

> Comandos que permitem carregar, validar, entender o workflow e gerenciar configuração.

### `chrono init`

- [ ] `chrono init --workflow <name>` — cria `.chrono/workflow.yaml` a partir de arquivo base
  - Flags:
    - `--workflow <name>` — obrigatório; nome do workflow base (`gitflow`, `trunkbased`, `dev-prod`, `dev-hml-prod`)
    - `--force` — sobrescreve arquivo existente
    - `--interactive` — modo interativo (simplificado na v0.1)
    - `--yes` — não pede confirmação
    - `--path <path>` — caminho alternativo para criação
    - `--json`

### `chrono config`

- [ ] `chrono config <subcomando>` — gerencia configurações em múltiplos níveis
  - Subcomandos:
    - `list` — exibe todas as configs resolvidas com suas fontes (`[global]`, `[local]`, `[branch]`)
    - `get <key>` — exibe valor efetivo de uma chave
    - `set <key> <value>` — define valor no nível especificado
    - `reset <key>` — remove override do nível especificado
    - `edit` — abre arquivo de config no editor configurado (`editor: nano`)
  - Flags:
    - `--global` — opera em `~/.chrono/config.yaml`
    - `--local` — opera em `.chrono/config.yaml` (padrão)
    - `--branch` — opera em `git config branch.<current>.X`
    - `--json`

### `chrono workflow list`

- [ ] `chrono workflow list` — lista workflows base disponíveis
  - Flags:
    - `--json`
    - `--verbose`

### `chrono workflow show`

- [ ] `chrono workflow show` — exibe workflow carregado no repositório
  - Flags:
    - `--json`
    - `--raw` — YAML original sem processamento
    - `--resolved` — estrutura parseada como JSON

### `chrono workflow validate`

- [ ] `chrono workflow validate` — valida schema YAML completo
  - [ ] valida YAML válido
  - [ ] valida campos obrigatórios (`version`, `name`, `branches`, `branchTypes`)
  - [ ] valida regex em `branchTypes.*.pattern`
  - [ ] valida referências em `from`/`to` (branches existem)
  - [ ] valida `transitions.strategy` (valores: `merge-commit`, `squash`, `rebase`, `fast-forward`, `manual`)
  - [ ] detecta chaves duplicadas e conflitos lógicos básicos
  - Flags:
    - `--json`
    - `--strict` — warnings viram errors
    - `--warnings-as-errors`
    - `--path <path>` — caminho alternativo do workflow

### `chrono workflow explain`

- [ ] `chrono workflow explain` — explica o fluxo em linguagem legível
  - [ ] branches permanentes com papéis
  - [ ] tipos de branch temporários com origem e destino
  - [ ] principais transições e restrições
  - Flags:
    - `--json`
    - `--short` — resumo compacto
    - `--verbose` — detalhado

### `chrono status`

- [ ] `chrono status` — estado do repo vs workflow
  - [ ] infere tipo da branch atual (match por pattern ou exact)
  - [ ] exibe base e destino esperados
  - [ ] exibe working tree status (limpa ou suja)
  - [ ] exibe existência e validade do workflow
  - [ ] sugere próximo passo
  - Flags:
    - `--json`
    - `--verbose`

### `chrono validate`

- [ ] `chrono validate` — valida branch/commits contra o workflow
  - [ ] valida branch atual ou a informada em `--branch`
  - [ ] valida nome e aderência à regex do tipo
  - [ ] valida transição `branch -> target` quando `--target` é passado
  - [ ] valida commits do range quando `--commits` é passado
  - Flags:
    - `--json`
    - `--strict`
    - `--branch <name>` — valida branch específica (não precisa ser a atual)
    - `--target <name>` — valida transição para este destino
    - `--commits <range>` — valida commits do range contra convenção
    - `--no-commit-check` — ignora validação de commits

---

## Fase 2 — Branch Operations (P1)

> Criar, sincronizar branches e aplicar commits seletivos.

### `chrono start`

- [ ] `chrono start <type> <name>` — cria branch conforme workflow
  - [ ] resolve branch base esperada pelo tipo
  - [ ] monta nome normalizado: `type/name` ou `type/TICKET-name`
  - [ ] valida nome contra regex do tipo
  - [ ] faz checkout por padrão
  - Flags:
    - `--from <branch>` — sobrescreve base (valida compatibilidade)
    - `--checkout` — faz checkout após criar (padrão: sim)
    - `--no-checkout` — não faz checkout
    - `--ticket <id>` — injeta ticket no nome: `type/TICKET-name`
    - `--json`
    - `--dry-run`

### `chrono sync`

- [ ] `chrono sync` — sincroniza branch com base esperada
  - [ ] stash automático por design (se working tree sujo)
  - [ ] faz checkout da base + `git pull`
  - [ ] volta para branch original
  - [ ] rebase ou merge conforme `sync.strategy`
  - [ ] stash pop automático (`stash.autoRecover`)
  - [ ] reporta conflito claramente e para a execução (não continua automaticamente)
  - Flags:
    - `--base <branch>` — sobrescreve a base inferida pelo workflow
    - `--strategy <strategy>` — `rebase` ou `merge` (padrão: `sync.strategy` da config)
    - `--stash` — força stash mesmo quando `stash.autoStash: false` na config global
    - `--no-stash` — desativa stash automático (falha se working tree sujo)
    - `--json`
    - `--dry-run`

### `chrono cherrypick`

- [ ] `chrono cherrypick` — seleciona e aplica commits específicos de outra branch
  - [ ] modo interativo: seleção de source branch + listagem paginada de commits (5/página)
  - [ ] multi-select de commits (toggle com espaço/número)
  - [ ] aplica commits na ordem cronológica correta (mais antigo primeiro)
  - [ ] reporta conflito claramente e para execução
  - [ ] suporte a `--continue` e `--abort` para fluxo de conflito
  - Flags:
    - `--source <branch>` — branch de origem (padrão: interativo)
    - `--commits <hash...>` — commits específicos (pula interativo)
    - `--no-verify` — pula hooks de commit
    - `--continue` — retoma após resolver conflitos
    - `--abort` — cancela cherry-pick em andamento
    - `--dry-run`
    - `--json`

---

## Fase 3 — Commit Assistant (P1)

> Criar commits no padrão conventional.

### `chrono commit`

- [ ] `chrono commit` — modo interativo puro
  - [ ] verifica staged changes (`NO_STAGED_CHANGES` se vazio)
  - [ ] menu interativo de tipo (lê `allowedTypes` do workflow)
  - [ ] prompt de escopo (obrigatório se `requireScope: true`)
  - [ ] prompt de subject com validação de `maxSubjectLength`
  - [ ] prompt de body (opcional)
  - [ ] suporte a breaking change (`BREAKING CHANGE:` no footer)
  - [ ] preview da mensagem final + confirmação
  - [ ] executa `git commit -m`
  - Flags:
    - `--ai` — usa IA para sugerir a mensagem completa (ver Fase 7); também ativado se `ai.auto: true`
    - `--no-ai` — desativa IA mesmo quando `ai.auto: true` na config global
    - `--type <type>` — define o tipo sem perguntar
    - `--scope <scope>` — define o escopo sem perguntar
    - `--message <msg>` — define o subject sem perguntar
    - `--body <body>` — adiciona body ao commit
    - `--breaking` — marca como breaking change
    - `--dry-run`
    - `--json`
    - `--yes` — não pede confirmação

---

## Fase 4 — Changelog (P1)

> Gerar changelog entre refs.

### `chrono changelog`

- [ ] `chrono changelog <range>` — gera changelog entre refs
  - [ ] aceita range `main..HEAD` e `--from`/`--to`
  - [ ] modo `conventional` — agrupa por tipo (feat, fix, etc.)
  - [ ] modo `diff-summary` — descreve mudanças por arquivo/área
  - [ ] modo `hybrid` — combinação dos dois
  - [ ] se `--write`, grava no arquivo de changelog
  - [ ] se `--ai`, envia para IA antes de gerar output final (ver Fase 7)
  - Flags:
    - `--from <ref>` — ref inicial
    - `--to <ref>` — ref final
    - `--write` — grava no arquivo de changelog
    - `--output <file>` — arquivo de saída (padrão: `CHANGELOG.md` ou do workflow)
    - `--mode <mode>` — `conventional` / `diff-summary` / `hybrid`
    - `--group-by <field>` — `type` / `scope` / `author`
    - `--include-authors` — inclui autores no output
    - `--title <title>` — título da seção no changelog
    - `--ai` — usa IA para melhorar o changelog gerado; também ativado se `ai.auto: true`
    - `--no-ai` — desativa IA mesmo quando `ai.auto: true` na config global
    - `--json`

---

## Fase 5 — PR + SSH + Workspace + Mergetool + Rollback (P1/P2)

> Abrir PRs, configurar SSH, gerenciar worktrees, mergetools e rollback (reutiliza PR Engine).

### `chrono pr`

- [ ] `chrono pr` — cria PR no GitHub via `gh` CLI (pré-requisito: `gh` instalado e autenticado)
  - [ ] valida que branch tem prefixo permitido pelo workflow
  - [ ] extrai ticket do nome da branch ou `git config branch.<name>.ticket`
  - [ ] resolve target via hierarquia: `--target` → branch git config → config local → config global → workflow → fallback `development`
  - [ ] verifica PR existente (evita duplicata → `PR_ALREADY_EXISTS`)
  - [ ] busca template em `pr.template` da config (se existir)
  - [ ] monta título com `[TICKET]` prefixado (se ticket encontrado)
  - [ ] cria PR via `gh pr create`
  - Flags:
    - `--target <branch>` — branch de destino (padrão: da config)
    - `--title <title>` — título do PR
    - `--body <body>` — corpo do PR
    - `--draft` — cria como draft
    - `--no-browser` — não abre browser após criar
    - `--no-template` — não usa template
    - `--no-ticket` — não injeta ticket no título
    - `--json`

### `chrono ssh-config`

- [ ] `chrono ssh-config <subcomando>` — configura SSH/identidade por repo ou globalmente
  - Subcomandos:
    - `show` — exibe config SSH atual (local e global)
    - `set-key <keypath>` — define `core.sshCommand` no escopo escolhido
    - `set-identity <name> <email>` — define `user.name` e `user.email`
    - `list-keys` — escaneia `~/.ssh/` e lista chaves com tipo e email
  - Flags:
    - `--global` — aplica globalmente
    - `--local` — aplica no repo atual (padrão)
    - `--json`

### `chrono workspace`

- [ ] `chrono workspace <subcomando>` — gerencia git worktrees
  - Subcomandos:
    - `list` — lista worktrees ativos
    - `add <branch> [path]` — cria worktree; path padrão automático se não fornecido
    - `remove <path>` — remove worktree
    - `clean` — remove worktrees de branches deletadas
  - [ ] valida nome da branch contra o workflow ao criar
  - [ ] path padrão gerado automaticamente
  - Flags:
    - `--json`

### `chrono rollback`

- [ ] `chrono rollback` — rollback seguro via `git revert` + branch de rollback (não reescreve história)
  - [ ] modo interativo: seletor paginado de commits recentes
  - [ ] exibe preview dos commits que serão revertidos
  - [ ] cria branch `rollback/<YYYY-MM-DD>-<short-hash>`
  - [ ] executa `git revert --no-commit` para o range selecionado
  - [ ] cria commit de revert com mensagem descritiva
  - [ ] faz push da branch por padrão
  - [ ] `--pr` reutiliza o PR Engine criado nesta fase (extensível para GitLab/Bitbucket no futuro)
  - [ ] suporte a `--continue` após resolução de conflitos
  - [ ] pede confirmação (exceto `--yes`)
  - Flags:
    - `--commits <n>` — número de commits a reverter (padrão: interativo)
    - `--target <hash>` — reverte até o commit especificado (inclusive)
    - `--pr` — abre PR automaticamente após push (via PR Engine)
    - `--no-push` — mantém branch localmente sem push
    - `--continue` — retoma após resolver conflitos
    - `--abort` — cancela rollback em andamento
    - `--dry-run`
    - `--json`
    - `--yes` — sem confirmação

### `chrono mergetool`

- [ ] `chrono mergetool [subcomando]` — configura e lança mergetool para resolver conflitos
  - Subcomandos:
    - `launch` (padrão) — lança ferramenta configurada ou a indicada em `--tool`
    - `config` — configura ferramenta padrão em `~/.chrono/config.yaml` interativamente
    - `list` — lista ferramentas detectadas no sistema
  - [ ] detecta ferramentas instaladas (vscode, intellij, p4merge, vimdiff, nvimdiff, meld, kdiff3)
  - [ ] resolve ferramenta: `--tool` → `mergetool.tool` global → `git config merge.tool`
  - [ ] `config` salva `mergetool.tool` na config **global** (`~/.chrono/config.yaml`)
  - Flags:
    - `--tool <name>` — usa ferramenta específica (sobrescreve config)
    - `--json`

---

## Fase 6 — Promotion + Diagnosis (P2)

> Diagnóstico aprofundado e promoção entre branches.

### `chrono doctor`

- [ ] `chrono doctor` — diagnóstico aprofundado do repo e fluxo
  - [ ] tudo do `validate` (branch, naming, transições, commits)
  - [ ] divergência de base (commits ahead/behind excessivos)
  - [ ] commits suspeitos (fora do padrão conventional)
  - [ ] tags relevantes ausentes
  - [ ] riscos operacionais e transições prováveis inválidas
  - Flags:
    - `--json`
    - `--verbose`
    - `--fix-suggestions` — exibe sugestões de correção
    - `--target <branch>` — foca na transição para esta branch

### `chrono plan`

- [ ] `chrono plan <from> <to>` — plano de comparação/promoção entre refs
  - [ ] resolve as duas refs
  - [ ] conta commits e arquivos alterados
  - [ ] avalia se transição existe no workflow
  - [ ] avalia requisitos da transição (tag obrigatória, PR, etc.)
  - [ ] lista possíveis bloqueios
  - Flags:
    - `--json`
    - `--summary` — resumo compacto
    - `--files` — lista arquivos alterados
    - `--commits` — lista commits incluídos
    - `--stat` — estatísticas de linhas (+/-)
    - `--ai` — gera resumo inteligente via IA (ver Fase 7)

### `chrono promote`

- [ ] `chrono promote <from> <to>` — apoia promoção entre branches
  - [ ] valida transição contra o workflow
  - [ ] checa requisitos (tag obrigatória, PR, estratégia)
  - [ ] modo simulação por padrão (sem `--execute` não executa)
  - [ ] executa merge apenas com `--execute` (opt-in obrigatório)
  - [ ] gera artefatos opcionais (changelog, release notes)
  - Flags:
    - `--dry-run` — valida e planeja sem executar
    - `--execute` — executa o merge (opt-in obrigatório)
    - `--strategy <strategy>` — sobrescreve estratégia do workflow
    - `--generate-changelog` — gera changelog antes de promover
    - `--generate-release-notes` — gera release notes antes de promover
    - `--tag <value>` — define a tag a ser criada
    - `--json`
    - `--yes` — não pede confirmação

---

## Fase 7 — IA Layer (P3)

> Comandos que precisam de provider de IA configurado (`ANTHROPIC_API_KEY`).

- [ ] Criar AI abstraction layer (`src/infra/ai/`)
  - [ ] interface única com métodos:
    - `generateCommitMessage(diff, context)`
    - `enhanceChangelog(raw, style)`
    - `generateReleaseNotes(commits, style, guidelines)`
    - `explainDiff(diff, style)`
    - `reviewDiff(diff, guidelines[])`
  - [ ] implementação Anthropic (`@anthropic-ai/sdk`) — model: `claude-sonnet-4-6`
  - [ ] tratamento de erro se provider não configurado (`AI_PROVIDER_NOT_CONFIGURED`)
  - [ ] API key nunca logada ou exposta em output
- [ ] Criar schema de review guidelines (`src/domain/review/`)
  - [ ] estrutura de `.chrono/review-guidelines.yaml` (quais linguagens e qual arquivo de guideline)
  - [ ] estrutura de `.chrono/guidelines/<language>.yaml` (rules com `id`, `description`, `severity`)
  - [ ] criar exemplos base: `guidelines/typescript.yaml`, `guidelines/react.yaml`

### `chrono commit --ai`

- [ ] `chrono commit --ai` — sugere mensagem de commit via IA
  - [ ] lê staged diff
  - [ ] envia para IA com contexto do workflow (tipos, escopo, convenção)
  - [ ] exibe sugestão para aceitar / editar / rejeitar
  - Flags (herda flags do `chrono commit` + `--ai`)

### `chrono changelog --ai`

- [ ] `chrono changelog --ai` — melhora changelog via IA
  - [ ] gera changelog base e envia para IA para melhoria
  - Flags (herda flags do `chrono changelog` + `--ai`)

### `chrono explain`

- [ ] `chrono explain` — explica mudanças em linguagem natural (IA-first)
  - [ ] modo `--staged`: explica mudanças staged
  - [ ] modo `--from`/`--to`: explica diff entre refs
  - [ ] padrão: usa staged se sem flags
  - Flags:
    - `--staged` — explica staged diff
    - `--from <ref>` — ref inicial
    - `--to <ref>` — ref final
    - `--style <style>` — `technical` / `plain` / `qa` / `summary`
    - `--json`

### `chrono review`

- [ ] `chrono review` — code review automatizado com guidelines (IA-first)
  - [ ] carrega `.chrono/review-guidelines.yaml`
  - [ ] carrega guidelines de cada linguagem referenciada
  - [ ] coleta staged diff ou diff entre refs
  - [ ] detecta linguagens no diff
  - [ ] monta prompt com regras para cada linguagem detectada
  - [ ] exibe findings ordenados por severidade (`error` → `warning` → `info`)
  - [ ] exibe sugestão por finding
  - Flags:
    - `--staged` — review do staged diff (padrão)
    - `--from <ref>` — ref inicial do diff
    - `--to <ref>` — ref final do diff
    - `--language <lang>` — limita review a uma linguagem específica
    - `--strict` — findings de `warning` viram `error`
    - `--json`
    - `--style <style>`

### `chrono release-notes`

- [ ] `chrono release-notes` — gera notas de release orientadas ao público (IA-first)
  - [ ] resolve refs (padrão: última tag → HEAD)
  - [ ] coleta commits do range
  - [ ] usa IA para melhorar redação quando `--ai` ou estilo `stakeholder`
  - [ ] exibe ou grava conforme flags
  - Flags:
    - `--from <ref>` — ref inicial
    - `--to <ref>` — ref final
    - `--style <style>` — `technical` / `stakeholder` / `compact` / `qa`
    - `--write` — grava em arquivo
    - `--output <file>` — arquivo de saída
    - `--ai` — força uso de IA para melhorar redação
    - `--json`

---

## Qualidade e entrega

- [ ] Testes unitários para validators e parsers:
  - [ ] parser YAML
  - [ ] validators (naming, transição, commit convention)
  - [ ] matching de branch type (regex)
  - [ ] resolução de transição
  - [ ] formatter de changelog
  - [ ] parser de commit conventional
- [ ] Testes de integração com repositórios fixture:
  - [ ] `test/fixtures/gitflow-fixture/` — repo com branches main/develop + commits
  - [ ] `test/fixtures/trunkbased-fixture/` — repo com branch main
  - [ ] `test/fixtures/dev-hml-prod-fixture/` — repo com branches dev/hml/prod
- [ ] Testes E2E para comandos principais:
  - `init`, `workflow validate`, `workflow explain`, `status`, `validate`, `start`, `sync`, `commit`, `changelog`
- [ ] README.md do projeto
- [ ] Documentação de instalação (`npm install -g chronogit`)
- [ ] Publicação no npm

---

## Workflows base a criar

- [ ] `src/workflows/gitflow.yaml`
- [ ] `src/workflows/trunkbased.yaml`
- [ ] `src/workflows/dev-prod.yaml`
- [ ] `src/workflows/dev-hml-prod.yaml`

---

## Referência rápida — Comandos por tier

| Tier | Comando | Alias | Flags principais |
|---|---|---|---|
| P0 | `chrono init` | `cg init` | `--workflow`, `--force`, `--interactive`, `--yes`, `--path` |
| P0 | `chrono config` | `cg config` | `--global`, `--local`, `--branch` |
| P0 | `chrono workflow list` | `cg workflow list` | `--verbose` |
| P0 | `chrono workflow show` | `cg workflow show` | `--raw`, `--resolved` |
| P0 | `chrono workflow validate` | `cg workflow validate` | `--strict`, `--warnings-as-errors`, `--path` |
| P0 | `chrono workflow explain` | `cg workflow explain` | `--short`, `--verbose` |
| P0 | `chrono status` | `cg status` | `--verbose` |
| P0 | `chrono validate` | `cg validate` | `--strict`, `--branch`, `--target`, `--commits`, `--no-commit-check` |
| P1 | `chrono start` | `cg start` | `--from`, `--ticket`, `--no-checkout`, `--dry-run` |
| P1 | `chrono commit` | `cg commit` | `--ai`, `--no-ai`, `--type`, `--scope`, `--message`, `--body`, `--breaking`, `--yes` |
| P1 | `chrono sync` | `cg sync` | `--base`, `--strategy`, `--stash`, `--no-stash`, `--dry-run` |
| P1 | `chrono pr` | `cg pr` | `--target`, `--title`, `--body`, `--draft`, `--no-browser`, `--no-ticket`, `--no-template` |
| P1 | `chrono changelog` | `cg changelog` | `--from`, `--to`, `--write`, `--output`, `--mode`, `--group-by`, `--ai`, `--no-ai` |
| P1 | `chrono rollback` | `cg rollback` | `--commits`, `--target`, `--pr`, `--no-push`, `--continue`, `--abort` |
| P1 | `chrono cherrypick` | `cg cherrypick` | `--source`, `--commits`, `--no-verify`, `--continue`, `--abort` |
| P2 | `chrono doctor` | `cg doctor` | `--verbose`, `--fix-suggestions`, `--target` |
| P2 | `chrono plan` | `cg plan` | `--files`, `--commits`, `--stat`, `--summary`, `--ai` |
| P2 | `chrono promote` | `cg promote` | `--execute`, `--strategy`, `--tag`, `--generate-changelog`, `--generate-release-notes` |
| P2 | `chrono workspace` | `cg workspace` | subcomandos: `list`, `add`, `remove`, `clean` |
| P2 | `chrono ssh-config` | `cg ssh-config` | subcomandos: `show`, `set-key`, `set-identity`, `list-keys` · `--global`, `--local` |
| P2 | `chrono mergetool` | `cg mergetool` | subcomandos: `launch`, `config`, `list` · `--tool` |
| P3 | `chrono commit --ai` | `cg commit --ai` | herda flags do `commit` |
| P3 | `chrono changelog --ai` | `cg changelog --ai` | herda flags do `changelog` |
| P3 | `chrono explain` | `cg explain` | `--staged`, `--from`, `--to`, `--style` |
| P3 | `chrono review` | `cg review` | `--staged`, `--from`, `--to`, `--language`, `--strict`, `--style` |
| P3 | `chrono release-notes` | `cg release-notes` | `--from`, `--to`, `--style`, `--write`, `--output`, `--ai` |

> Todos os comandos suportam também: `--help`, `--json`, `--no-color`, `--cwd <path>`, `--workflow <path>`
