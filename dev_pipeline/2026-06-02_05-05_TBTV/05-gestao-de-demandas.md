# 05 - Gestão de Demandas

## Tipos de Card

O board utiliza três tipos principais de card para organizar o trabalho:

| Tipo | Descrição | Exemplo |
|---|---|---|
| **História (Story)** | Demanda de produto com valor para o usuário final | "Como usuário, quero filtrar pedidos por data" |
| **Task** | Trabalho técnico que não é diretamente uma funcionalidade de usuário | Configuração de infraestrutura, migração de dados, documentação |
| **Subtask** | Quebra de uma história ou task em partes menores e executáveis | "Criar endpoint de filtro", "Implementar componente de datepicker" |

### Quando usar cada tipo

- **História** → demandas de produto que passam por todo o fluxo do board
- **Task** → trabalho técnico independente (não faz parte de uma história)
- **Subtask** → quando uma história ou task é grande demais para ser trabalhada de uma vez. Permite que múltiplos SEs trabalhem em paralelo

### Boas Práticas

- Toda história deve ter **critérios de aceite** claros antes de entrar em dev
- Subtasks devem ser granulares o suficiente para serem concluídas em **1–2 dias**
- Tasks técnicas devem ter **definição de pronto** clara (o que significa "done"?)

---

## Incidentes

Incidentes são **problemas encontrados em produção** que impactam usuários ou o funcionamento do sistema.

### Características

- Entram no fluxo com **prioridade sobre demandas regulares**
- São tratados dentro do squad no dia a dia
- Devem ser resolvidos o mais rápido possível, de acordo com a severidade

### Fluxo de Incidentes

```
Incidente identificado → Triagem (EM/SE) → Em Dev → Testes → Deploy
```

1. **Identificação:** Alerta de monitoramento, report de usuário, ou detecção interna
2. **Triagem:** EM ou SE sênior avalia severidade e impacto
3. **Atribuição:** SE disponível (ou mais adequado tecnicamente) assume
4. **Resolução:** Fix desenvolvido, testado e deployado com urgência proporcional à severidade
5. **Post-mortem (quando aplicável):** Para incidentes críticos, documentar causa raiz e ações preventivas

### Severidade

| Nível | Descrição | Tempo de Resposta Esperado |
|---|---|---|
| **Crítico** | Sistema fora do ar ou funcionalidade core quebrada | Imediato — interrompe sprint corrente |
| **Alto** | Funcionalidade importante degradada, workaround possível | Mesmo dia — prioriza sobre demandas atuais |
| **Médio** | Problema pontual com impacto limitado | Sprint corrente — entra como prioridade |
| **Baixo** | Problema cosmético ou de baixo impacto | Próximo sprint — entra como bug no backlog |

### Boas Práticas

- Comunicar o time na daily (ou antes, se urgente) sobre incidentes em andamento
- Documentar a solução no card para referência futura
- Se o incidente revela um problema sistêmico, criar card de débito técnico

---

## Bugs

Bugs são **problemas encontrados internamente** durante o processo de desenvolvimento, testes ou homologação — ou seja, antes de chegar ao usuário final em produção.

### Diferença entre Bug e Incidente

| | Bug | Incidente |
|---|---|---|
| **Onde foi encontrado** | Internamente (dev, testes, HML) | Em produção |
| **Impacto no usuário** | Nenhum (ainda não foi deployado) | Direto |
| **Urgência** | Depende do contexto | Alta por padrão |
| **Fluxo** | Volta para Em Dev | Entra como prioridade |

### Fluxo de Bugs

- **Bug em testes:** Card volta para **Em Dev** com bug documentado. SE corrige e reenvia para testes.
- **Bug em HML:** Mesmo fluxo — volta para dev, corrige, retesta.
- **Bug conhecido (backlog):** Entra como card tipo bug no backlog, priorizado pelo PM conforme impacto.

### Boas Práticas

- Documentar o bug com: **passos para reproduzir**, **comportamento esperado** vs. **comportamento atual**, e **evidências** (screenshots, logs)
- Bugs encontrados em testes cruzados são especialmente valiosos — o testador traz uma perspectiva diferente do autor

---

## Débito Técnico

Débito técnico é o custo acumulado de decisões técnicas que precisam ser revisadas — código que funciona mas precisa ser melhorado, refatorações pendentes, atualizações de dependências, etc.

### Filosofia

O squad trata débito técnico de forma **estruturada e negociada**, não ad-hoc:

1. **Identificação:** Qualquer membro do time pode identificar e registrar débito técnico
2. **Mapeamento:** Cards de tech debt são criados no backlog com descrição do problema, impacto e proposta de solução
3. **Estimativa:** Débitos são estimados como qualquer outra demanda
4. **Negociação:** EM negocia com PM a entrada de uma sprint (ou parte de sprint) dedicada a débito técnico
5. **Execução:** Sprint de tech debt é tratada como sprint regular — com planning, board e review

### Cadência

O objetivo é ter **sprints recorrentes para débito técnico**, com frequência negociada entre EM e PM. A cadência exata depende do acúmulo de débito e das prioridades de produto.

### O que entra como Débito Técnico

- Refatoração de código com alta complexidade ou baixa manutenibilidade
- Atualização de dependências e frameworks
- Melhoria de performance identificada
- Aumento de cobertura de testes
- Melhorias de infraestrutura e observabilidade
- Documentação técnica pendente

### Boas Práticas

- Registrar débito técnico **quando identificado** — não deixar na cabeça de alguém
- Priorizar por **impacto no time** (o que mais atrasa o dia a dia?) e **risco** (o que pode quebrar?)
- Celebrar sprints de tech debt — são investimento na saúde do produto a longo prazo
