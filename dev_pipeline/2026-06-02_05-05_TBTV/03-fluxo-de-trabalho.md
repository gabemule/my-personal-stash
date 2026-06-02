## Visão Geral

O board do squad reflete o ciclo de vida completo de uma demanda, da concepção à produção. Cada coluna representa uma etapa com critérios claros de entrada e saída.

> **⚠️ Nota para validação:** Os critérios de transição abaixo são uma proposta baseada em boas práticas. Ajuste conforme a realidade de cada squad.

---

## Colunas do Board

```
Backlog → Refinamento → Pronto para Dev → Em Dev → Pronto para Testes → Em Testes → Pronto para HML → Em HML → Pronto para Deploy → Em Prod
```

---

## Critérios de Transição

### Backlog
**O que está aqui:** Demandas identificadas mas ainda não detalhadas nem priorizadas para um sprint próximo.

| | |
|---|---|
| **Quem move para cá** | PM / EM |
| **Critério de entrada** | Demanda identificada com descrição mínima do problema/necessidade |

---

### Backlog → Refinamento
A demanda foi priorizada e precisa ser detalhada tecnicamente.

| | |
|---|---|
| **Quem move** | PM / EM |
| **Critério de entrada** | Demanda priorizada pelo PM com contexto de negócio definido |
| **O que acontece aqui** | Discussão técnica no refinamento semanal — abordagem, riscos, dependências, estimativa |

---

### Refinamento → Pronto para Dev
A demanda está tecnicamente detalhada e pronta para ser trabalhada.

|                                       |                                                          |
| ------------------------------------- | -------------------------------------------------------- |
| **Quem move**                         | EM / SE responsável pelo refinamento                     |
| **Critérios de saída do refinamento** |                                                          |
| ✅                                     | Abordagem técnica definida e documentada no card         |
| ✅                                     | Critérios de aceite claros (negócio + técnico)           |
| ✅                                     | Dependências identificadas e resolvidas (ou sinalizadas) |
| ✅                                     | Estimativa de esforço adequada                           |
| ✅                                     | Card quebrado em tasks/subtasks quando necessário        |

---

### Pronto para Dev → Em Dev
O SE assume a demanda e inicia o desenvolvimento.

| | |
|---|---|
| **Quem move** | SE que vai trabalhar na demanda |
| **Critério de entrada** | SE disponível e demanda priorizada no sprint |

**O que acontece aqui:**
- Criação de feature branch
- Implementação seguindo abordagem definida no refinamento
- Escrita de testes (unitários, integração) conforme padrão do projeto
- Commits atômicos e descritivos, semantic commit

---

### Em Dev → Pronto para Testes
O desenvolvimento foi concluído e está pronto para validação.

| | |
|---|---|
| **Quem move** | SE que desenvolveu |
| **Critérios de saída do dev** | |
| ✅ | Código implementado e funcionando localmente |
| ✅ | Testes automatizados escritos e passando |
| ✅ | Pull Request aberto com descrição clara |
| ✅ | Code review aprovado por pelo menos 1 membro do squad |
| ✅ | Pipeline de CI passando (lint, testes, SonarQube) |
| ✅ | Self-review realizado pelo próprio SE |

---

### Pronto para Testes → Em Testes
A demanda está sendo validada pelo SE responsável (especialista em qualidade ou outro SE em teste cruzado).

| | |
|---|---|
| **Quem move** | SE responsável pelo teste |
| **Critério de entrada** | PR aprovado, CI verde, ambiente de dev funcional |

**O que acontece aqui:**
- Validação dos critérios de aceite
- Testes manuais e/ou automatizados (e2e)
- Teste cruzado quando não há SE especialista em qualidade dedicado (ver [04 - Desenvolvimento e Qualidade](./04-desenvolvimento-e-qualidade.md))
- Registro de bugs encontrados

**Se bugs forem encontrados:**
- Card volta para **Em Dev** com bugs documentados
- O SE corrige e reenvia para **Pronto para Testes**

---

### Em Testes → Pronto para HML
Os testes foram aprovados e a demanda está pronta para o ambiente de homologação.

| | |
|---|---|
| **Quem move** | SE que testou |
| **Critérios de saída dos testes** | |
| ✅ | Todos os critérios de aceite validados |
| ✅ | Sem bugs abertos bloqueantes |
| ✅ | Evidências de teste registradas (quando aplicável) |

---

### Pronto para HML → Em HML
A demanda está em ambiente de homologação para validação final.

| | |
|---|---|
| **Quem move** | SE responsável pelo deploy em HML |
| **Critério de entrada** | Branch mergeada ou deploy realizado em ambiente de HML |

**O que acontece aqui:**
- Validação em ambiente próximo ao de produção
- Testes de integração com outros serviços/sistemas
- Validação de PM/stakeholders quando necessário

---

### Em HML → Pronto para Deploy
A validação em HML foi concluída com sucesso.

| | |
|---|---|
| **Quem move** | Quem validou em HML (SE ou PM) |
| **Critérios de saída de HML** | |
| ✅ | Funcionalidade validada em ambiente de homologação |
| ✅ | Sem regressões identificadas |
| ✅ | Aprovação de PM/stakeholder (quando aplicável) |

---

### Pronto para Deploy → Em Prod
A demanda está em produção.

| | |
|---|---|
| **Quem move** | SE responsável pelo deploy |
| **Critério de entrada** | Aprovação para deploy e janela disponível |

**Após o deploy:**
- Monitoramento pós-deploy (logs, métricas, alertas)
- Validação rápida em produção (smoke test)
- Card finalizado

---

## Responsabilidade de Movimentação

O princípio geral é: **quem está responsável pela etapa atual move o card para a próxima.**

| Transição | Responsável |
|---|---|
| Backlog → Refinamento | PM / EM |
| Refinamento → Pronto para Dev | EM / SE |
| Pronto para Dev → Em Dev | SE que assumiu |
| Em Dev → Pronto para Testes | SE que desenvolveu |
| Pronto para Testes → Em Testes | SE que vai testar |
| Em Testes → Pronto para HML | SE que testou |
| Pronto para HML → Em HML | SE responsável pelo deploy |
| Em HML → Pronto para Deploy | Quem validou em HML |
| Pronto para Deploy → Em Prod | SE responsável pelo deploy |

---

## Fluxo Visual

```
┌──────────┐    ┌─────────────┐    ┌───────────────┐    ┌────────┐
│ Backlog  │───▶│ Refinamento │───▶│ Pronto p/ Dev │───▶│ Em Dev │
└──────────┘    └─────────────┘    └───────────────┘    └───┬────┘
                                                            │
                    ┌───────────────────────────────────────┘
                    ▼
            ┌─────────────────┐    ┌───────────┐
            │ Pronto p/ Teste │───▶│ Em Testes │───┐
            └─────────────────┘    └───────────┘   │
                    ▲                              │
                    │  (bugs encontrados)          │ (aprovado)
                    └──────────────────────────────┤
                                                   ▼
            ┌───────────────┐    ┌────────┐    ┌──────────────────┐
            │ Pronto p/ HML │───▶│ Em HML │───▶│ Pronto p/ Deploy │
            └───────────────┘    └────────┘    └────────┬─────────┘
                                                        │
                                                        ▼
                                                  ┌──────────┐
                                                  │ Em Prod  │
                                                  └──────────┘
```
