# Especificação da CLI — ChronoGit v0.1

## 1. Objetivo desta especificação

Esta especificação define o comportamento esperado da CLI **ChronoGit** na versão v0.1, incluindo:

* comandos disponíveis
* assinatura dos comandos
* flags
* comportamento funcional
* entradas e saídas
* regras de validação
* exemplos de uso
* erros esperados
* contrato de UX da CLI
* prioridades de implementação

Ela deve servir como base para:

* validação do produto
* implementação técnica
* documentação oficial
* definição do MVP
* testes automatizados

---

# 2. Escopo da v0.1

A v0.1 do ChronoGit terá como foco principal:

* leitura e validação do workflow YAML
* explicação do workflow
* validação do estado do repositório
* criação guiada de branches
* sincronização de branches com base
* validação e assistência de commits
* abertura de pull requests no GitHub
* geração de changelog
* rollback seguro via revert branch (sem reescrever história)
* cherry-pick interativo de commits entre branches
* configuração e uso de mergetool para resolver conflitos
* gerenciamento de configuração
* gerenciamento de SSH e identidade
* gerenciamento de worktrees
* camada de IA (commit, changelog, explain, review, release-notes)

A v0.1 **não precisa** automatizar merges complexos de forma agressiva.
Quando houver risco operacional, a ferramenta deve priorizar:

* validar
* explicar
* planejar
* sugerir
* executar apenas com opt-in claro

---

# 3. Convenções gerais da CLI

## 3.1 Nome do binário

Comando principal:

```bash
chrono
```

Alias curto opcional:

```bash
cg
```

Ambos devem executar o mesmo binário.

---

## 3.2 Formato geral dos comandos

```bash
chrono <grupo|comando> [subcomando] [argumentos] [flags]
```

Exemplos:

```bash
chrono workflow validate
chrono start feature nova-home
chrono changelog main..HEAD
chrono commit --ai
chrono review --from dev --to hml
```

---

## 3.3 Princípios de UX

* saída legível por humanos por padrão
* saída JSON opcional para automação
* erros curtos e acionáveis
* comportamento previsível
* evitar ações destrutivas implícitas
* explicar claramente quando algo foi bloqueado por regra
* ter `--help` em todos os comandos

---

## 3.4 Flags globais

As seguintes flags globais devem existir sempre que fizer sentido:

* `--help`
* `--json`
* `--verbose`
* `--quiet`
* `--cwd <path>`
* `--workflow <path>`
* `--no-color`
* `--dry-run`

### Comportamento esperado

#### `--json`

Retorna estrutura JSON estável.

#### `--verbose`

Mostra mais contexto técnico.

#### `--quiet`

Reduz output ao mínimo.

#### `--cwd <path>`

Executa a partir de um diretório específico.

#### `--workflow <path>`

Sobrescreve o caminho padrão do workflow.

#### `--no-color`

Desabilita ANSI colors.

#### `--dry-run`

Simula a operação sem alteração real.

---

# 4. Descoberta de contexto

## 4.1 Detecção do repositório Git

Antes de executar comandos operacionais, a CLI deve verificar se o diretório atual ou o `--cwd` está dentro de um repositório Git válido.

### Erro esperado

```txt
Erro: repositório Git não encontrado
Sugestão: execute o comando dentro de um repositório Git ou use --cwd
```

---

## 4.2 Caminho padrão do workflow

```txt
.chrono/workflow.yaml
```

A CLI deve procurar esse arquivo no diretório raiz do repositório.

Se `--workflow <path>` for fornecido, ele deve prevalecer.

---

## 4.3 Resolução do workflow

O workflow deve ser resolvido nesta ordem:

1. `--workflow`
2. `.chrono/workflow.yaml`

Se não encontrar workflow e o comando precisar dele, deve falhar com erro claro.

---

## 4.4 Resolução de configuração

A configuração é resolvida em camadas, da menos para a mais específica:

1. Defaults internos (hardcoded)
2. `~/.chrono/config.yaml` (preferências globais do dev)
3. `.chrono/config.yaml` (config do repo — versionável)
4. `git config branch.<name>.X` (override por branch — runtime, por dev)

Chave mais específica sempre vence.

---

# 5. Estrutura de saída

## 5.1 Saída textual padrão

A saída padrão deve ser:

* objetiva
* com seções curtas
* usando ícones opcionais
* mostrando sucesso, aviso e erro de forma clara

Exemplo:

```txt
Workflow válido

Branches permanentes:
- dev
- hml
- prod

Transições principais:
- dev -> hml
- hml -> prod
```

---

## 5.2 Saída JSON

Estrutura base sugerida:

```json
{
  "ok": true,
  "command": "workflow validate",
  "warnings": [],
  "errors": [],
  "data": {},
  "metadata": {}
}
```

### Campos obrigatórios

* `ok`
* `command`
* `warnings`
* `errors`
* `data`

### Campos opcionais

* `metadata`
* `timing`
* `version`

---

## 5.3 Estrutura de erro

Formato textual mínimo:

```txt
Erro: <título>
Detalhe: <explicação curta>
Sugestão: <ação recomendada>
```

Formato JSON:

```json
{
  "ok": false,
  "command": "validate",
  "warnings": [],
  "errors": [
    {
      "code": "INVALID_BRANCH_BASE",
      "message": "Branch atual criada a partir de base incompatível",
      "details": {
        "currentBranch": "feature/login",
        "expectedBase": "dev",
        "detectedBase": "prod"
      },
      "suggestion": "Crie a branch a partir de dev"
    }
  ],
  "data": {}
}
```

---

# 6. Comandos da CLI

---

# 6.1 `chrono init`

## Objetivo

Inicializar o ChronoGit no repositório, criando a pasta `.chrono/` e o arquivo de workflow local.

## Assinatura

```bash
chrono init --workflow <name> [flags]
```

## Exemplos

```bash
chrono init --workflow gitflow
chrono init --workflow trunkbased
chrono init --workflow dev-hml-prod
```

## Flags

* `--workflow <name>` obrigatório na v0.1
* `--force`
* `--interactive`
* `--yes`
* `--path <path>`
* `--json`

## Comportamento

1. valida se está em repo Git
2. resolve o arquivo-base oficial pelo nome
3. cria `.chrono/` se necessário
4. copia workflow base para `.chrono/workflow.yaml`
5. se já existir arquivo:
   * falha por padrão
   * sobrescreve se `--force`

## Regras

* não sobrescrever sem `--force`
* `--workflow` deve existir entre os workflows oficiais
* em `--interactive`, pode pedir pequenas customizações futuras, mas na v0.1 pode ser simples

## Erros esperados

* `REPO_NOT_FOUND`
* workflow base desconhecido
* arquivo já existente sem `--force`

## Saída esperada

```txt
ChronoGit inicializado com sucesso
Workflow criado em .chrono/workflow.yaml
Modelo utilizado: gitflow
```

---

# 6.2 `chrono config`

## Objetivo

Gerenciar configurações do ChronoGit em múltiplos níveis (global, local, branch).

## Assinatura

```bash
chrono config <subcomando> [key] [value] [flags]
```

## Subcomandos

* `list` — mostra todas as configurações resolvidas com suas fontes
* `get <key>` — mostra o valor efetivo de uma chave
* `set <key> <value>` — define valor em nível especificado
* `reset <key>` — remove override de nível especificado
* `edit` — abre arquivo de config no editor

## Exemplos

```bash
chrono config list
chrono config get pr.defaultTarget
chrono config set pr.defaultTarget main --local
chrono config set ai.provider anthropic --global
chrono config reset pr.defaultTarget --local
chrono config edit --local
chrono config edit --global
```

## Flags

* `--global` — opera no `~/.chrono/config.yaml`
* `--local` — opera no `.chrono/config.yaml` (padrão)
* `--branch` — opera no `git config branch.<current>.X`
* `--json`

## Configurações disponíveis

### Nível repo (`.chrono/config.yaml`)

```yaml
pr:
  defaultTarget: development
  template: .github/PULL_REQUEST_TEMPLATE.md
  provider: github

sync:
  strategy: rebase        # ou merge

commit:
  requireTicket: false
  ticketPattern: "^[A-Z]+-\\d+$"
```

### Nível global (`~/.chrono/config.yaml`)

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

## Saída textual esperada — `list`

```txt
Configuração efetiva

pr.defaultTarget      development        [local]
pr.provider           github             [local]
sync.strategy         rebase             [local]
stash.autoStash       true               [global]
stash.autoRecover     true               [global]
mergetool.tool        vscode             [global]
ai.provider           anthropic          [global]
ai.model              claude-sonnet-4-6  [global]
ai.auto               false              [global]
editor                nano               [global]
```

## Erros esperados

* `CONFIG_NOT_FOUND`
* chave inválida
* valor incompatível com o tipo esperado

---

# 6.3 `chrono workflow list`

## Objetivo

Listar workflows base oficiais disponíveis no pacote.

## Assinatura

```bash
chrono workflow list [flags]
```

## Flags

* `--json`
* `--verbose`

## Saída textual esperada

```txt
Workflows disponíveis:
- gitflow
- trunkbased
- dev-prod
- dev-hml-prod
```

## Saída JSON esperada

```json
{
  "ok": true,
  "command": "workflow list",
  "warnings": [],
  "errors": [],
  "data": {
    "workflows": ["gitflow", "trunkbased", "dev-prod", "dev-hml-prod"]
  }
}
```

---

# 6.4 `chrono workflow show`

## Objetivo

Exibir o conteúdo do workflow carregado no repositório atual.

## Assinatura

```bash
chrono workflow show [flags]
```

## Flags

* `--json`
* `--raw`
* `--resolved`

## Comportamento

* `--raw`: mostra o YAML original sem processamento
* `--resolved`: mostra a estrutura já parseada e validada como JSON
* padrão textual: resumo amigável

## Erros esperados

* `WORKFLOW_NOT_FOUND`
* `WORKFLOW_INVALID`

---

# 6.5 `chrono workflow validate`

## Objetivo

Validar estrutura, sintaxe e coerência do workflow YAML.

## Assinatura

```bash
chrono workflow validate [flags]
```

## Flags

* `--json`
* `--strict`
* `--warnings-as-errors`
* `--path <path>`

## O que valida

* YAML válido
* campos obrigatórios presentes
* tipos corretos
* regex válidas em `branchTypes.*.pattern`
* referências coerentes (branches usadas em `from`/`to` existem)
* branches permanentes bem definidas
* `branchTypes` com `pattern`, `from`, `to`
* transições com `from`, `to`, `strategy` válidos
* chaves duplicadas
* conflito lógico básico

## Campos obrigatórios

* `version`
* `name`
* `branches`
* `branchTypes`

## Estratégias válidas

* `merge-commit`
* `squash`
* `rebase`
* `fast-forward`
* `manual`

## Saída textual — sucesso

```txt
Workflow válido
Sem erros de schema encontrados
```

## Saída textual — com warnings

```txt
Workflow válido com avisos

Avisos:
- branch "hml" não possui regras específicas
- release.tagging.enabled está true, mas nenhum pattern foi definido
```

## Saída textual — com erros

```txt
Workflow inválido

Erros:
- branchType "feature" referencia base "dev" que não está em branches
- pattern "^[feature.*" é uma regex inválida

Avisos:
- campo "description" ausente
```

---

# 6.6 `chrono workflow explain`

## Objetivo

Explicar semanticamente o fluxo definido no repositório em linguagem legível.

## Assinatura

```bash
chrono workflow explain [flags]
```

## Flags

* `--json`
* `--short`
* `--verbose`

## Comportamento

A CLI deve explicar:

* branches permanentes com seus papéis
* tipos de branch temporários com origem e destino
* principais transições
* regras relevantes
* restrições críticas

## Exemplo de saída

```txt
Este repositório usa um fluxo com três branches permanentes:
- dev (integração): recebe features e bugfixes
- hml (staging): homologação e QA
- prod (produção): código em produção

Branches temporárias:
- feature/* nasce de dev e volta para dev
- bugfix/* nasce de dev e volta para dev
- hotfix/* nasce de prod e pode retornar para prod, hml e dev
- release/* nasce de dev e vai para hml e prod

Promoções principais:
- dev -> hml (merge-commit)
- hml -> prod (merge-commit, requer tag)

Restrições:
- promoção para prod exige tag semver
- hotfix deve ser replicado para dev e hml após merge em prod
```

---

# 6.7 `chrono status`

## Objetivo

Mostrar o estado atual do repositório do ponto de vista do workflow.

## Assinatura

```bash
chrono status [flags]
```

## Flags

* `--json`
* `--verbose`

## O que exibe

* branch atual
* tipo inferido
* working tree limpa ou suja
* existência de workflow
* se a branch casa com alguma regra
* base esperada
* destino esperado
* possíveis próximos passos

## Exemplo de saída

```txt
Status do repositório

Branch atual:    feature/nova-home
Tipo inferido:   feature
Working tree:    limpa
Workflow:        carregado com sucesso
Base esperada:   dev
Destino esperado: dev

Próximo passo sugerido: abra um PR para dev quando pronto
```

## Possíveis bloqueios

* branch atual desconhecida
* sem workflow
* working tree suja quando relevante

---

# 6.8 `chrono validate`

## Objetivo

Validar o estado atual do repositório contra o workflow.

## Assinatura

```bash
chrono validate [flags]
```

## Flags

* `--json`
* `--strict`
* `--branch <name>`
* `--target <name>`
* `--commits <range>`
* `--no-commit-check`

## O que valida

* branch atual ou branch informada via `--branch`
* tipo inferido
* nome da branch e aderência à regex do tipo
* base esperada
* destino esperado
* convenção de commits no range informado
* working tree quando bloqueante

## Regras

### Se `--branch` for passado

Valida a branch informada, mesmo que não seja a atual.

### Se `--target` for passado

Valida se a transição `branch -> target` existe e é coerente.

### Se `--commits` for passado

Valida commits dentro do range informado contra a convenção do workflow.

## Erros típicos

* `UNKNOWN_BRANCH_TYPE`
* `INVALID_BRANCH_NAME`
* `INVALID_TRANSITION`
* `INVALID_COMMIT_TYPE`
* `COMMIT_SCOPE_REQUIRED`

## Exemplo

```bash
chrono validate --target hml
```

---

# 6.9 `chrono doctor`

## Objetivo

Executar diagnóstico aprofundado do repositório e do fluxo atual.

## Assinatura

```bash
chrono doctor [flags]
```

## Flags

* `--json`
* `--verbose`
* `--fix-suggestions`
* `--target <branch>`

## Diferença para `validate`

`validate` faz checagem operacional direta.
`doctor` faz diagnóstico ampliado, detectando problemas potenciais mesmo que não sejam erros imediatos.

## O que avalia

* tudo do `validate`
* divergência da base (commits ahead/behind excessivos)
* possíveis inconsistências do workflow com o estado atual
* transições prováveis inválidas
* commits suspeitos (fora do padrão)
* tags relevantes ausentes
* riscos operacionais

## Exemplo de saída

```txt
Diagnóstico concluído

Problemas encontrados:
- branch feature/login parece ter sido criada a partir de prod
- target prod exige tag, mas nenhuma foi informada
- 3 commits recentes fora do padrão conventional

Sugestões:
- recriar branch a partir de dev
- definir tag ao promover para prod
- ajustar mensagens de commit com: chrono commit --amend
```

---

# 6.10 `chrono start`

## Objetivo

Criar uma nova branch conforme as regras do workflow.

## Assinatura

```bash
chrono start <type> <name> [flags]
```

## Exemplos

```bash
chrono start feature nova-home
chrono start bugfix corrige-cache
chrono start hotfix erro-auth
chrono start feature ABC-123 nova-home    # com ticket inline
```

## Flags

* `--from <branch>` — sobrescreve a base (valida compatibilidade)
* `--checkout` — faz checkout após criar (padrão: sim)
* `--no-checkout`
* `--ticket <id>` — associa ticket à branch
* `--json`
* `--dry-run`

## Comportamento

1. valida workflow carregado
2. valida se o `type` existe em `branchTypes`
3. resolve branch base esperada pelo workflow
4. permite sobrescrever base com `--from`, mas valida compatibilidade
5. monta nome final da branch
6. valida nome contra regex do tipo
7. cria a branch
8. faz checkout por padrão (exceto se `--no-checkout`)

## Convenção de nome final

Padrão:

```txt
<type>/<name-normalizado>
```

Com `--ticket`:

```txt
<type>/<TICKET>-<name-normalizado>
```

Exemplos:

```txt
feature/nova-home
feature/ABC-123-nova-home
hotfix/erro-autenticacao
```

O nome normalizado converte espaços em hífens e letras para minúsculas.

## Erros esperados

* `UNKNOWN_BRANCH_TYPE`
* `INVALID_BRANCH_BASE`
* `INVALID_BRANCH_NAME` (não casa com regex do tipo)
* `BRANCH_ALREADY_EXISTS`

---

# 6.11 `chrono sync`

## Objetivo

Sincronizar a branch atual com a sua base esperada conforme o workflow.

## Assinatura

```bash
chrono sync [flags]
```

## Exemplos

```bash
chrono sync
chrono sync --strategy rebase
chrono sync --base dev
```

## Flags

* `--base <branch>` — sobrescreve a base (padrão: base do tipo inferido)
* `--strategy <strategy>` — `rebase` ou `merge` (padrão: config do repo)
* `--stash` — força stash mesmo quando `stash.autoStash` é `false` na config global
* `--no-stash` — desativa stash automático mesmo quando `stash.autoStash` é `true`
* `--json`
* `--dry-run`

## Comportamento

1. detecta branch atual e infere tipo
2. resolve base esperada pelo workflow (ou `--base`)
3. faz stash automático se working tree sujo (`stash.autoStash` global — por design no sync)
4. faz checkout da base
5. faz `git pull` na base
6. volta para a branch original
7. aplica `merge` ou `rebase` da base (conforme `sync.strategy`)
8. faz `stash pop` automático se stash foi feito (`stash.autoRecover`)
9. reporta resultado — sucesso ou conflito

## Regras

* stash e recover são automáticos por design no `sync`
* se houver conflito após merge/rebase, para e instrui o usuário
* não continua automaticamente em caso de conflito
* `--stash` força stash mesmo quando `stash.autoStash: false` na config global
* `--no-stash` desativa o stash automático (cuidado: falha se working tree sujo)

## Exemplo de saída

```txt
Sincronizando feature/nova-home com dev

- stash aplicado
- dev atualizada
- rebase concluído
- stash restaurado

Branch sincronizada com sucesso
```

## Saída com conflito

```txt
Conflito detectado durante rebase

Arquivos com conflito:
- src/auth/login.ts
- src/components/Header.tsx

Resolva os conflitos e execute:
  git rebase --continue

Ou para cancelar:
  git rebase --abort
```

## Erros esperados

* `UNKNOWN_BRANCH_TYPE` (não sabe a base)
* `SYNC_CONFLICT`

---

# 6.12 `chrono rollback`

## Objetivo

Fazer rollback seguro de commits via `git revert`, criando uma branch de rollback e abrindo PR para revisão. **Não reescreve história** — seguro para branches compartilhadas e ambientes de produção.

## Assinatura

```bash
chrono rollback [flags]
```

## Exemplos

```bash
chrono rollback                         # interativo: seletor paginado de commits
chrono rollback --commits 3             # reverte os últimos 3 commits
chrono rollback --target abc1234        # reverte até o commit especificado
chrono rollback --commits 1 --pr        # reverte e abre PR automaticamente
chrono rollback --no-push               # cria a branch localmente, sem push
chrono rollback --continue              # resume após resolver conflitos
chrono rollback --abort                 # cancela rollback em andamento
```

## Flags

* `--commits <n>` — número de commits a reverter (padrão: interativo)
* `--target <hash>` — reverte até o commit especificado (inclusive)
* `--pr` — abre PR automaticamente após push
* `--no-push` — cria a branch de rollback localmente sem fazer push
* `--continue` — retoma rollback após resolver conflitos
* `--abort` — cancela rollback em andamento (`git revert --abort`)
* `--dry-run` — simula sem executar
* `--json`
* `--yes` — sem confirmação

## Comportamento

1. se `--commits` ou `--target` não fornecidos, exibe seletor paginado dos commits recentes
2. mostra preview dos commits que serão revertidos
3. pede confirmação (exceto com `--yes`)
4. cria branch `rollback/<YYYY-MM-DD>-<short-hash>`
5. executa `git revert --no-commit` para o range selecionado
6. cria commit do revert com mensagem descritiva
7. faz push da branch (exceto com `--no-push`)
8. se `--pr`, abre PR automaticamente via `gh pr create`

## Regras

* rollback usa `git revert`, nunca `git reset` — não reescreve história
* em caso de conflito, para e instrui o usuário a resolver e usar `--continue`
* branch de rollback segue o padrão: `rollback/<YYYY-MM-DD>-<short-hash>`
* `--no-push` é útil para revisar o revert localmente antes de subir

## Saída esperada

```txt
Rollback de 2 commits

Commits que serão revertidos:
  abc1234 feat(auth): adiciona login social
  def5678 feat(ui): nova tela de perfil

Branch de rollback: rollback/2026-04-11-abc1234

Confirmar? [s/N]:

Branch criada e push realizado.
Abra o PR para revisão:
  https://github.com/org/repo/compare/rollback/2026-04-11-abc1234
```

## Saída com conflito

```txt
Conflito detectado durante revert

Arquivos com conflito:
- src/auth/login.ts

Resolva os conflitos e execute:
  chrono rollback --continue

Ou para cancelar:
  chrono rollback --abort
```

## Erros esperados

* repositório sem commits suficientes
* hash `--target` não encontrado (`REF_NOT_FOUND`)

---

# 6.13 `chrono pr`

## Objetivo

Criar um Pull Request no GitHub com padronização automática de título, body e ticket.

## Assinatura

```bash
chrono pr [flags]
```

## Exemplos

```bash
chrono pr
chrono pr --target main
chrono pr --title "feat: nova autenticação" --draft
chrono pr --no-template
chrono pr --no-ticket
```

## Flags

* `--target <branch>` — branch de destino (padrão: da config)
* `--title <title>` — título do PR
* `--body <body>` — corpo do PR
* `--draft` — cria como draft
* `--no-browser` — não abre o browser após criar
* `--no-template` — não usa template
* `--no-ticket` — não injeta ticket no título
* `--json`

## Pré-requisito

`gh` CLI deve estar instalado e autenticado.

## Comportamento

1. valida se branch atual tem prefixo permitido pelo workflow
2. extrai ticket do nome da branch ou `git config branch.<name>.ticket`
3. resolve target via hierarquia de config
4. verifica se já existe PR aberto para essa branch → target (evita duplicata)
5. busca template em `pr.template` da config (se existir)
6. monta título com `[TICKET]` prefixado (se ticket encontrado)
7. cria PR via `gh pr create`
8. abre browser por padrão (exceto `--no-browser`)

## Resolução do target

Hierarquia de resolução da branch de destino:

1. flag `--target`
2. `git config branch.<current>.chronogit.defaultTarget`
3. `.chrono/config.yaml` → `pr.defaultTarget`
4. `~/.chrono/config.yaml` → `pr.defaultTarget`
5. primeiro destino permitido pelo workflow para o tipo atual
6. fallback hardcoded: `development`

## Exemplo de saída

```txt
Criando Pull Request

Branch:  feature/ABC-123-nova-home
Target:  development
Título:  [ABC-123] feat: nova home
Draft:   não

PR criado com sucesso!
URL: https://github.com/org/repo/pull/42
```

## Erros esperados

* `gh` CLI não encontrado ou não autenticado
* `UNKNOWN_BRANCH_TYPE` (prefixo inválido)
* `PR_ALREADY_EXISTS`

---

# 6.14 `chrono commit`

## Objetivo

Assistir na criação de commit seguindo as regras do workflow.

## Assinatura

```bash
chrono commit [flags]
```

## Flags

* `--ai` — usa IA para sugerir a mensagem (ou ativado automaticamente se `ai.auto: true`)
* `--no-ai` — desativa IA mesmo quando `ai.auto: true` na config global
* `--type <type>` — define o tipo sem perguntar
* `--scope <scope>` — define o escopo sem perguntar
* `--message <msg>` — define a mensagem do subject sem perguntar
* `--body <body>` — adiciona body ao commit
* `--breaking` — marca como breaking change
* `--dry-run`
* `--json`
* `--yes` — não pede confirmação

## Comportamento (modo interativo puro)

1. verifica se há arquivos staged
2. lê `commits` do workflow
3. exibe menu interativo para escolha do tipo
4. pergunta escopo (se `requireScope: true`, obrigatório)
5. pergunta mensagem do subject
6. valida `maxSubjectLength`
7. pergunta body (opcional)
8. monta mensagem final e exibe preview
9. pede confirmação
10. executa `git commit -m`

## Comportamento com `--ai` (ou `ai.auto: true`)

Ativado por `--ai` explícito **ou** quando `ai.auto: true` na config global (`~/.chrono/config.yaml`).
Use `--no-ai` para desativar quando `ai.auto` estiver ativo.

1. verifica staged changes
2. lê staged diff
3. envia para a IA com contexto do workflow
4. IA sugere tipo, escopo e mensagem
5. exibe sugestão para aprovação
6. usuário pode aceitar, editar ou rejeitar

## Formato da mensagem

```txt
<type>(<scope>): <subject>

<body opcional>
```

Com breaking change:

```txt
feat(api)!: altera contrato de autenticação

BREAKING CHANGE: o campo "token" foi renomeado para "accessToken"
```

## Regras mínimas

* se não houver arquivos staged, falha com `NO_STAGED_CHANGES`
* tipo deve estar em `allowedTypes`
* subject não pode exceder `maxSubjectLength`
* se `requireScope: true`, escopo é obrigatório
* breaking change exige body quando `bodyRequiredForBreakingChange: true`

## Erros esperados

* `NO_STAGED_CHANGES`
* `INVALID_COMMIT_TYPE`
* `COMMIT_SCOPE_REQUIRED`
* `COMMIT_SUBJECT_TOO_LONG`

---

# 6.15 `chrono changelog`

## Objetivo

Gerar changelog entre refs com base nos commits do range.

## Assinatura

```bash
chrono changelog <range> [flags]
chrono changelog --from <ref> --to <ref> [flags]
```

## Exemplos

```bash
chrono changelog main..HEAD
chrono changelog --from v1.2.0 --to HEAD
chrono changelog hml..prod --write
chrono changelog main..HEAD --ai --mode conventional
```

## Flags

* `--from <ref>`
* `--to <ref>`
* `--write` — grava no arquivo de changelog
* `--output <file>` — arquivo de saída (padrão: do workflow ou `CHANGELOG.md`)
* `--mode <mode>` — `conventional`, `diff-summary`, `hybrid`
* `--group-by <field>` — `type`, `scope`, `author`
* `--include-authors` — inclui autores no output
* `--title <title>` — título da seção no changelog
* `--ai` — usa IA para melhorar o changelog gerado (ou ativado automaticamente se `ai.auto: true`)
* `--no-ai` — desativa IA mesmo quando `ai.auto: true` na config global
* `--json`

## Modos

* `conventional`: agrupa por tipo de commit (feat, fix, etc.)
* `diff-summary`: descreve mudanças por arquivo/área
* `hybrid`: combinação dos dois

## Comportamento

1. resolve range
2. busca commits no range via git
3. agrupa conforme modo
4. produz markdown
5. se `--write`, grava no arquivo
6. se `--ai` ou `ai.auto: true` (e sem `--no-ai`), envia para IA para melhoria antes de gerar output final

## Exemplo de saída

```md
## Changelog — v1.3.0

### Features
- adiciona login social (auth)
- cria tela de recuperação de senha (account)

### Fixes
- corrige validação de token
- ajusta cache da sessão

### Breaking Changes
- altera contrato de autenticação: campo "token" renomeado para "accessToken"
```

## Erros esperados

* `INVALID_RANGE`
* `REF_NOT_FOUND`
* sem commits no range (warning, não erro)

---

# 6.16 `chrono plan`

## Objetivo

Mostrar o plano de comparação ou promoção entre duas refs, incluindo commits, arquivos e impacto.

## Assinatura

```bash
chrono plan <from> <to> [flags]
```

## Exemplos

```bash
chrono plan dev hml
chrono plan hml prod
chrono plan main HEAD
chrono plan v1.2.0 HEAD --stat
```

## Flags

* `--json`
* `--summary`
* `--files` — lista arquivos alterados
* `--commits` — lista commits incluídos
* `--stat` — mostra estatísticas de linhas
* `--ai` — gera resumo inteligente

## O que faz

* resolve as duas refs
* calcula commits do range
* lista arquivos alterados
* mostra resumo de impacto
* avalia se a transição existe no workflow
* avalia requisitos da transição (tag, PR, etc.)
* lista possíveis bloqueios

## Exemplo de saída

```txt
Plano de promoção: dev -> hml

Commits incluídos: 12
Arquivos alterados: 38
Transição permitida: sim
Estratégia esperada: merge-commit
PR obrigatório: sim

Impactos por tipo:
- 4 features
- 6 fixes
- 2 refactors

Requisitos não atendidos:
- nenhum
```

## Erros esperados

* `REF_NOT_FOUND`
* `INVALID_TRANSITION` (transição não definida no workflow)

---

# 6.17 `chrono promote`

## Objetivo

Apoiar a promoção entre branches conforme as regras do workflow.

## Assinatura

```bash
chrono promote <from> <to> [flags]
```

## Exemplos

```bash
chrono promote dev hml
chrono promote hml prod --tag v1.3.0
chrono promote hml prod --execute --generate-changelog
```

## Flags

* `--dry-run` — valida e planeja sem executar
* `--execute` — executa o merge (opt-in obrigatório)
* `--strategy <strategy>` — sobrescreve a estratégia do workflow
* `--generate-changelog` — gera changelog antes de promover
* `--generate-release-notes` — gera release notes antes de promover
* `--tag <value>` — define a tag a ser criada
* `--json`
* `--yes`

## Comportamento v0.1

O foco principal na v0.1 deve ser:

1. validar a transição contra o workflow
2. checar requisitos (tag obrigatória, PR, etc.)
3. gerar artefatos opcionais (changelog, release notes)
4. executar **apenas** quando `--execute` for passado

Sem `--execute`, o comando opera como validação e planejamento.

## Regras

* se transição não existir no workflow → `INVALID_TRANSITION`
* se target exige tag e `--tag` não foi fornecida → `TAG_REQUIRED`
* se strategy diverge da esperada → warning (ou error em `--strict`)
* se `--execute` não passado → modo simulação

## Saída no modo simulação

```txt
Promoção validada: hml -> prod

Requisitos:
✓ transição permitida pelo workflow
✓ tag informada: v1.3.0
✓ strategy: merge-commit

Artefatos:
- changelog: será gerado
- release notes: será gerado

Modo atual: simulação
Use --execute para aplicar a promoção
```

---

# 6.18 `chrono explain`

## Objetivo

Explicar mudanças em linguagem natural. Comando IA-first.

## Assinatura

```bash
chrono explain [flags]
```

## Flags

* `--staged` — explica staged diff
* `--from <ref>` — ref inicial
* `--to <ref>` — ref final
* `--json`
* `--style <style>`

## Estilos

* `technical` — explicação para devs
* `plain` — linguagem simples, sem jargão
* `qa` — foco em o que foi testado/alterado
* `summary` — resumo compacto em 2-3 linhas

## Modos

* `--staged`: explica as mudanças atualmente staged
* `--from`/`--to`: explica diff entre duas refs
* sem flags: usa staged por padrão

## Pré-requisito

Provider de IA configurado em `~/.chrono/config.yaml`.

## Exemplo

```bash
chrono explain --staged --style plain
```

## Exemplo de saída

```txt
As alterações staged introduzem login social no fluxo de autenticação,
adicionando suporte a provedores externos e ajustando o tratamento
da sessão do usuário. A tela de login foi atualizada para exibir
os botões de autenticação via Google e GitHub.
```

## Erros esperados

* `AI_PROVIDER_NOT_CONFIGURED`
* nada staged (quando em modo `--staged`)

---

# 6.19 `chrono review`

## Objetivo

Executar code review automatizado das mudanças usando guidelines por linguagem definidas no repositório. Comando IA-first.

## Assinatura

```bash
chrono review [flags]
```

## Flags

* `--staged` — review do staged diff (padrão)
* `--from <ref>` — ref inicial do diff
* `--to <ref>` — ref final do diff
* `--language <lang>` — limita review a uma linguagem específica
* `--strict` — findings de `warning` passam a ser tratados como `error`
* `--json`
* `--style <style>`

## Comportamento

1. carrega `.chrono/review-guidelines.yaml`
2. carrega guidelines de cada linguagem referenciada
3. coleta staged diff ou diff entre refs
4. para cada linguagem detectada no diff, monta prompt com as regras
5. envia para a IA
6. recebe lista de findings categorizados
7. exibe report ordenado por severidade

## Saída esperada

```txt
Code Review — staged changes

TypeScript (7 findings)

[error] no-any — src/auth/login.ts:34
  Uso de 'any' detectado em parâmetro 'response'.
  Sugestão: use 'unknown' e faça narrowing explícito.

[error] no-empty-catch — src/api/client.ts:89
  Catch vazio encontrado. O erro está sendo silenciado.
  Sugestão: adicione tratamento ou logging.

[warning] explicit-return-types — src/hooks/useAuth.ts:12
  Função pública sem tipo de retorno explícito.
  Sugestão: adicione ': AuthState' como tipo de retorno.

[warning] descriptive-names — src/utils/helpers.ts:7
  Variável 'data' com nome genérico.
  Sugestão: renomeie para algo que descreva o conteúdo.

Resumo: 2 errors, 2 warnings (exibindo 4 de 7)
```

## Pré-requisito

* Provider de IA configurado
* `.chrono/review-guidelines.yaml` existindo no repositório

## Erros esperados

* `AI_PROVIDER_NOT_CONFIGURED`
* `REVIEW_GUIDELINES_NOT_FOUND`
* nada staged (quando sem `--from`/`--to`)

---

# 6.20 `chrono release-notes`

## Objetivo

Gerar notas de release mais legíveis e orientadas ao público. Comando IA-first.

## Assinatura

```bash
chrono release-notes [flags]
```

## Flags

* `--from <ref>`
* `--to <ref>`
* `--write`
* `--output <file>`
* `--style <style>`
* `--ai`
* `--json`

## Estilos

* `technical` — detalhado, para devs e QA
* `stakeholder` — alto nível, para produto e negócio
* `compact` — resumo curto
* `qa` — focado em o que foi alterado e como testar

## Comportamento

1. resolve refs (padrão: última tag → HEAD)
2. coleta commits do range
3. monta notas conforme estilo
4. usa IA para melhorar a redação quando `--ai` ou quando estilo é `stakeholder`
5. exibe ou grava conforme flags

## Exemplo de saída — stakeholder

```txt
Release — v1.3.0

Novidades desta versão:
- Novo fluxo de login social com suporte a Google e GitHub
- Melhoria no processo de recuperação de senha

Correções:
- Ajuste no comportamento da sessão em sessões longas
- Correção na validação de tokens expirados

Próximos passos:
- deploy em produção após aprovação em QA
```

## Erros esperados

* `AI_PROVIDER_NOT_CONFIGURED` (para estilos que dependem de IA)
* `REF_NOT_FOUND`

---

# 6.21 `chrono cherrypick`

## Objetivo

Selecionar e aplicar commits específicos de outra branch de forma interativa.

## Assinatura

```bash
chrono cherrypick [flags]
```

## Exemplos

```bash
chrono cherrypick                           # interativo: escolhe source branch e commits
chrono cherrypick --source feature/login    # seleciona source branch diretamente
chrono cherrypick --commits abc123 def456   # aplica commits específicos sem interativo
chrono cherrypick --source main --dry-run
chrono cherrypick --continue                # resume após resolver conflitos
chrono cherrypick --abort                   # cancela cherry-pick em andamento
```

## Flags

* `--source <branch>` — branch de origem dos commits (padrão: interativo)
* `--commits <hash...>` — commits específicos a aplicar (pula modo interativo)
* `--no-verify` — pula hooks de commit
* `--continue` — retoma cherry-pick após resolver conflitos
* `--abort` — cancela cherry-pick em andamento
* `--dry-run` — simula sem executar
* `--json`

## Comportamento (modo interativo)

1. se `--source` não fornecido, exibe lista de branches para seleção
2. lista commits da source branch de forma paginada (5 por página)
3. usuário seleciona commits com toggle (espaço/número) — multi-select
4. exibe preview dos commits selecionados
5. pede confirmação
6. aplica cherry-pick na ordem cronológica correta (mais antigo primeiro)
7. em caso de conflito, para e instrui o usuário

## Comportamento com `--commits`

Aplica diretamente os hashes informados, na ordem fornecida, sem interatividade.

## Regras

* commits são aplicados na ordem cronológica (mais antigo primeiro), independente da ordem de seleção
* em caso de conflito, para e instrui o usuário a resolver e usar `--continue`
* `--no-verify` pula pre-commit e commit-msg hooks

## Saída esperada

```txt
Cherry-pick interativo

Source branch: feature/login

Commits disponíveis (página 1/3):

  [1] abc1234  feat(auth): adiciona login social         (2h atrás)
  [2] def5678  fix(auth): corrige validação de token     (3h atrás)
  [3] ghi9012  refactor(ui): extrai componente de form   (5h atrás)
  [4] jkl3456  test(auth): adiciona testes de integração (6h atrás)
  [5] mno7890  chore: atualiza dependências              (8h atrás)

Selecione (espaço=toggle, n=próxima, p=anterior, Enter=confirmar):
> [✓] abc1234  feat(auth): adiciona login social
  [ ] def5678  fix(auth): corrige validação de token
  [✓] ghi9012  refactor(ui): extrai componente de form

Aplicando 2 commits em ordem cronológica...
✓ ghi9012 aplicado
✓ abc1234 aplicado

Cherry-pick concluído com sucesso
```

## Saída com conflito

```txt
Conflito detectado ao aplicar abc1234

Arquivos com conflito:
- src/auth/login.ts

Resolva os conflitos e execute:
  chrono cherrypick --continue

Ou para cancelar:
  chrono cherrypick --abort
```

## Erros esperados

* `REF_NOT_FOUND` (source branch não existe)
* `CHERRY_PICK_CONFLICT` (conflito durante aplicação)

---

# 6.22 `chrono mergetool`

## Objetivo

Configurar e lançar uma ferramenta de merge para resolver conflitos de forma simplificada.

## Assinatura

```bash
chrono mergetool [subcomando] [flags]
```

## Subcomandos

* `launch` (padrão) — lança mergetool para resolver conflitos atuais
* `config` — configura ferramenta padrão na config global
* `list` — lista ferramentas detectadas no sistema

## Exemplos

```bash
chrono mergetool                        # lança ferramenta configurada
chrono mergetool launch                 # equivalente ao anterior
chrono mergetool launch --tool p4merge  # usa ferramenta específica
chrono mergetool config                 # configura ferramenta padrão interativamente
chrono mergetool list                   # lista ferramentas disponíveis
```

## Flags

* `--tool <name>` — usa ferramenta específica (sobrescreve config)
* `--json`

## Comportamento

### `launch` (padrão)

1. verifica se há conflitos no repositório (working tree com conflitos)
2. resolve ferramenta a usar: `--tool` → `mergetool.tool` global → `git config merge.tool`
3. lança `git mergetool --tool=<name>` (ou `git mergetool` se a ferramenta já está no git config)
4. reporta arquivos resolvidos

### `config`

1. lista ferramentas detectadas no sistema
2. usuário seleciona a ferramenta desejada
3. define `mergetool.tool` em `~/.chrono/config.yaml`

### `list`

Escaneia o sistema em busca de ferramentas comuns e exibe as disponíveis.

## Ferramentas suportadas para detecção

* `vscode` — Visual Studio Code
* `intellij` — IntelliJ IDEA / WebStorm / etc.
* `p4merge` — Perforce P4Merge
* `vimdiff` — Vim diff
* `nvimdiff` — Neovim diff
* `meld` — Meld
* `kdiff3` — KDiff3

## Saída esperada — `list`

```txt
Ferramentas de merge detectadas no sistema:

✓ vscode      — Visual Studio Code
✓ vimdiff     — Vim
✗ p4merge     — não encontrado
✗ intellij    — não encontrado
✗ meld        — não encontrado

Ferramenta configurada: vscode [global]
```

## Saída esperada — `launch`

```txt
Lançando mergetool: vscode

Arquivos com conflito:
- src/auth/login.ts
- src/components/Header.tsx

Abrindo vscode para resolução...
```

## Erros esperados

* nenhum conflito detectado (warning — não erro)
* ferramenta especificada não encontrada no sistema

---

# 6.23 `chrono workspace`

## Objetivo

Gerenciar git worktrees de forma simplificada.

## Assinatura

```bash
chrono workspace <subcomando> [args] [flags]
```

## Subcomandos

* `list` — lista worktrees ativos
* `add <branch> [path]` — cria novo worktree
* `remove <path>` — remove worktree
* `clean` — remove worktrees de branches deletadas

## Exemplos

```bash
chrono workspace list
chrono workspace add feature/nova-home
chrono workspace add feature/nova-home ./worktrees/nova-home
chrono workspace remove ./worktrees/nova-home
chrono workspace clean
```

## Flags

* `--json`

## Comportamento

Wrapper simplificado sobre `git worktree` com:

* validação do nome da branch contra o workflow
* path padrão gerado automaticamente se não fornecido
* listagem com status visual

## Exemplo de saída — list

```txt
Worktrees ativos

- [main]             /Users/dev/projeto
- feature/nova-home  /Users/dev/projeto-worktrees/nova-home
- hotfix/erro-auth   /Users/dev/projeto-worktrees/erro-auth
```

---

# 6.24 `chrono ssh-config`

## Objetivo

Configurar chaves SSH e identidade Git por repositório ou globalmente.

## Assinatura

```bash
chrono ssh-config [flags]
```

## Subcomandos / modos

* `show` — mostra config SSH atual
* `set-key <keypath>` — define a chave SSH para o escopo
* `set-identity <name> <email>` — define nome e email para o escopo
* `list-keys` — lista chaves disponíveis em `~/.ssh`

## Exemplos

```bash
chrono ssh-config show
chrono ssh-config list-keys
chrono ssh-config set-key ~/.ssh/id_rsa_work --local
chrono ssh-config set-identity "Barney Dev" "barney@empresa.com" --local
chrono ssh-config set-key ~/.ssh/id_rsa_personal --global
```

## Flags

* `--global` — aplica globalmente
* `--local` — aplica no repo atual (padrão)
* `--json`

## Comportamento

* `set-key`: define `core.sshCommand` no escopo escolhido
* `set-identity`: define `user.name` e `user.email` no escopo
* `list-keys`: escaneia `~/.ssh/` e exibe chaves com tipo e email (quando possível)

## Saída — show

```txt
Configuração SSH atual

Nível local (repositório):
  Chave SSH:  ~/.ssh/id_rsa_work
  Identidade: Barney Dev <barney@empresa.com>

Nível global:
  Chave SSH:  ~/.ssh/id_rsa_personal
  Identidade: Barney <barney@gmail.com>
```

---

# 7. Regras de parsing e comportamento

## 7.1 Resolução de branch type

A CLI deve conseguir inferir o tipo da branch atual comparando o nome com:

1. branches permanentes (match exato)
2. regex de `branchTypes` (match por pattern)

Se nada casar, a branch é considerada `unknown`.

---

## 7.2 Resolução de range

A CLI deve aceitar:

* `main..HEAD`
* `main...HEAD`
* `v1.2.0..HEAD`
* `--from <ref> --to <ref>`

`..` significa comparação direta entre refs (commits acessíveis em `to` mas não em `from`).
`...` aceito se suportado pelo adapter, rejeitado de forma clara caso contrário.

---

## 7.3 Estratégia de validação

As validações devem produzir:

* `success`: tudo ok
* `warning`: problema não fatal, operação continua
* `error`: falha do comando
* `blocked`: ação impedida por regra do workflow

---

## 7.4 Modo estrito (`--strict`)

Quando `--strict` for usado:

* warnings críticos viram errors
* divergências de strategy falham
* ausência de regras explícitas pode gerar erro

---

# 8. Códigos de erro

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

# 9. Priorização para implementação

## P0 — Core (Tier 1)

* `init`
* `config`
* `workflow list`
* `workflow show`
* `workflow validate`
* `workflow explain`
* `status`
* `validate`

## P1 — Operações Git (Tier 2)

* `start`
* `commit` (modo puro)
* `sync`
* `pr`
* `changelog`
* `rollback`
* `cherrypick`

## P2 — Análise e Promoção (Tier 3)

* `doctor`
* `plan`
* `promote`
* `workspace`
* `ssh-config`
* `mergetool`

## P3 — IA (Tier 4)

* `commit --ai`
* `changelog --ai`
* `explain`
* `review`
* `release-notes`

---

# 10. Critérios de aceite por comando

## `workflow validate`

* detecta YAML inválido
* detecta campos obrigatórios ausentes
* detecta regex inválida
* valida referências básicas

## `status`

* mostra branch atual
* infere tipo corretamente
* informa estado do working tree

## `validate`

* detecta branch desconhecida
* detecta nome inválido
* valida target incompatível

## `start`

* cria branch válida com nome correto
* bloqueia branch inválida (tipo, base, regex)
* respeita regex do tipo

## `sync`

* sincroniza com base correta
* faz stash/pop automaticamente
* reporta conflito de forma clara

## `commit`

* falha sem staged changes
* respeita conventional commit
* aplica limite de subject
* funciona interativamente

## `pr`

* detecta ticket do nome da branch
* usa template se configurado
* resolve target via config hierárquica
* bloqueia PR duplicado

## `changelog`

* gera markdown entre refs válidas
* falha com range inválido
* suporta `--write`
* agrupa por tipo

## `review`

* carrega guidelines corretamente
* categoriza findings por severidade
* exibe suggestion por finding

---

# 11. Dependências técnicas

## CLI

* `commander` ou `yargs`

## YAML

* `yaml`

## Terminal output

* `chalk`
* `ora` (spinner, opcional)
* `cli-table3` (tabelas, opcional)

## Git

* adapter próprio chamando o binário `git` diretamente

## GitHub PR

* `gh` CLI (pré-requisito externo para `chrono pr`)

## Testes

* `vitest`

## IA

* SDK do provider (ex: `@anthropic-ai/sdk`)
* interface própria de abstração

---

# 12. Definição final da v0.1

A v0.1 do ChronoGit estará pronta quando for possível:

* inicializar um repo com workflow base
* validar e explicar o workflow
* inspecionar estado atual do repo
* validar branch e target
* criar branch padronizada
* sincronizar branch com base
* gerar commit no padrão conventional
* abrir PR no GitHub com ticket e template
* gerar changelog entre refs
* fazer rollback seguro via revert branch (sem reescrever história)
* selecionar e aplicar commits de outra branch (`cherrypick`)
* configurar e lançar mergetool para resolver conflitos (`mergetool`)
* gerenciar configuração (global e local)
* configurar SSH/identidade por repo
* gerenciar worktrees
* explicar mudanças com IA (`explain`)
* fazer code review com guidelines (`review`)
* gerar release notes com IA (`release-notes`)
