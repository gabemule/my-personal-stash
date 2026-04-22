# ChronoGit — Backlog de Futuro

Este documento registra funcionalidades, integrações e melhorias que estão fora do escopo da v0.1, mas que são candidatas naturais para versões futuras.

---

## 1. Integrações com providers Git remotos

### 1.1 GitLab

* `chrono pr` com suporte ao GitLab via API ou `glab` CLI
* criação de Merge Requests no padrão do workflow
* detecção automática de provider pelo remote URL

### 1.2 Bitbucket

* `chrono pr` com suporte ao Bitbucket via API
* criação de Pull Requests padronizados

### 1.3 Detecção automática de provider

```txt
remote url → detect provider (github | gitlab | bitbucket | other)
→ use appropriate CLI/API
```

---

## 2. Providers de IA adicionais

### 2.1 OpenAI

```yaml
ai:
  provider: openai
  model: gpt-4o
  apiKey: ${OPENAI_API_KEY}
```

### 2.2 OpenRouter

Permite usar múltiplos modelos via uma única API.

```yaml
ai:
  provider: openrouter
  model: anthropic/claude-3-5-sonnet
  apiKey: ${OPENROUTER_API_KEY}
```

### 2.3 Provider local (Ollama)

```yaml
ai:
  provider: ollama
  model: llama3
  baseUrl: http://localhost:11434
```

### 2.4 Provider agnóstico desde o início

A interface de AI abstraction layer já é agnóstica por design na v0.1 (Anthropic). Novos providers como OpenAI, OpenRouter e Ollama podem ser adicionados como implementações da mesma interface sem breaking changes.

---

## 3. Guideline packs oficiais

### 3.1 Conceito

Pacotes npm com guidelines de review por linguagem/framework, mantidos oficialmente pela equipe do ChronoGit.

### 3.2 Pacotes planejados

```txt
@chronogit/guidelines-typescript
@chronogit/guidelines-react
@chronogit/guidelines-react-native
@chronogit/guidelines-python
@chronogit/guidelines-node
@chronogit/guidelines-go
@chronogit/guidelines-security     # regras de segurança cross-language
@chronogit/guidelines-accessibility # acessibilidade para projetos web
```

### 3.3 Uso

```yaml
review:
  enabled: true
  languages:
    typescript: "@chronogit/guidelines-typescript"
    react: "@chronogit/guidelines-react"
```

### 3.4 Extensão de guideline packs

```yaml
review:
  enabled: true
  languages:
    typescript:
      extends: "@chronogit/guidelines-typescript"
      rules:
        - id: custom-logger
          description: "Use the app logger, not console"
          severity: error
```

---

## 4. Branch protection automática

* aplicar regras de `protected: true` diretamente no provider remoto
* configurar branch protection rules no GitHub/GitLab via API
* exibir status de proteção no `chrono status`

---

## 5. Integração com ticket systems

### 5.1 Jira

* buscar informações do ticket pelo ID encontrado na branch
* preencher PR body automaticamente com dados do ticket
* atualizar status do ticket ao criar PR (em revisão, etc.)

### 5.2 Linear

* integração similar ao Jira via API Linear

### 5.3 GitHub Issues

* referenciar issue automaticamente no PR

---

## 6. `chrono standup`

Comando para gerar resumo das atividades recentes, útil para standup meetings.

```bash
chrono standup
chrono standup --since yesterday
chrono standup --since "2 days ago"
chrono standup --ai --style plain
```

**Output:**

```txt
Atividades recentes (últimas 24h)

Commits realizados:
- feat(auth): adiciona login social
- fix(session): corrige expiração de token

Branches ativas:
- feature/nova-home (4 commits, base: dev)

PRs abertos:
- #42 feat: nova home (aguardando review)
```

---

## 7. `chrono review` com integração em CI

* executar `chrono review` em pipeline CI
* falhar pipeline se findings de `error` forem encontrados
* integração com GitHub Actions, GitLab CI, etc.
* saída JSON para parsing automatizado

---

## 8. Schema v2 do workflow

Possíveis evoluções do schema:

* `branches.*.autoSync`: sincronização automática com remoto
* `transitions.*.requiredChecks`: lista de checks CI necessários
* `transitions.*.approvalCount`: número de approvals necessários
* `branchTypes.*.maxAge`: alerta se branch exceder X dias
* `commits.*.scopes`: lista de escopos permitidos/sugeridos

---

## 9. `chrono workflow init --interactive`

Modo interativo completo para criação de workflow customizado:

* perguntas guiadas sobre o fluxo do time
* sugestão de workflows base com diffs
* customização de regras por branch
* geração do YAML final

---

## 10. `chrono metrics`

Relatório de métricas do fluxo Git:

* frequência de commits por tipo
* tempo médio de vida de feature branches
* hotfixes por período
* aderência ao conventional commit
* commits fora do padrão por dev

---

## 11. `chrono export`

Exportar estado, workflow e métricas:

* `chrono export --format markdown`
* `chrono export --format json`
* `chrono export --format html`

---

## 12. Suporte a múltiplos workflows por repositório

Configuração de workflow diferente por sub-diretório (monorepos):

```txt
.chrono/
  workflow.yaml            # workflow padrão
  apps/
    frontend/
      workflow.yaml        # workflow do frontend
    backend/
      workflow.yaml        # workflow do backend
```

---

## 13. Plugin system

Interface para plugins externos que estendem o ChronoGit:

```yaml
plugins:
  - name: "@myteam/chrono-jira"
  - name: "@myteam/chrono-slack"
```

---

## 14. Notificações e hooks

* hooks de pré/pós operação (pré-commit, pós-sync, etc.)
* notificação via Slack ao criar PR
* webhook ao promover para produção

---

## 15. GUI companion (longo prazo)

Uma interface web ou desktop para visualizar o workflow, histórico e métricas, usando a CLI como backend.
