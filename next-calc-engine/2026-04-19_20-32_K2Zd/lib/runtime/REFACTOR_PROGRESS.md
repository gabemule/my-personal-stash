# Runtime Refactor Progress

> Dashboard macro de andamento da refatoração da `lib/runtime/`.
> Para detalhes, racional e critérios de cada item, ver [`REFACTOR_PLAN.md`](./REFACTOR_PLAN.md).
>
> **Como usar:** marcar `- [x]` conforme concluir cada item; atualizar contadores no topo; registrar resultados de benchmark quando disponíveis.

---

## Overview

- **Última atualização:** 2026-04-19
- **Total de itens:** 31
- **Concluídos:** 0
- **Em andamento:** 0
- **Pendentes:** 31

### Progresso por camada

| Camada | Total | Feitos | % |
|---|---|---|---|
| 1 — Arquitetura & desenho da lib | 5 | 0 | 0% |
| 2 — Performance & escalabilidade | 7 | 0 | 0% |
| 3 — Robustez, tipos, documentação | 14 | 0 | 0% |
| 4 — Branching & features | 5 | 0 | 0% |
| **Total** | **31** | **0** | **0%** |

### Progresso por fase

| Fase | Total | Feitos | % | Status |
|---|---|---|---|---|
| 1 — Pré-produção | 9 | 0 | 0% | 🔴 Não iniciada |
| 2 — Pré-extração como lib | 12 | 0 | 0% | 🔴 Não iniciada |
| 3 — Otimização guiada por benchmark | 5 | 0 | 0% | 🔴 Não iniciada |
| 4 — Branching & features | 5 | 0 | 0% | 🔴 Não iniciada |

> Legenda: 🔴 não iniciada · 🟡 em andamento · 🟢 concluída · ⚪ bloqueada

---

## Camada 1 — Arquitetura & desenho da lib [0/5]

- [ ] **1.1** Remover tipos de UI de `types.ts`
- [ ] **1.2** Separar `compile()` de `run()` *(marco central)*
- [ ] **1.3** Documentar API pública com JSDoc
- [ ] **1.4** Introduzir `CalcError` com `code` + `context`
- [ ] **1.5** Guards de recursos (`maxTokens`, `maxRows`, `maxSteps`, `maxTables`)

---

## Camada 2 — Performance & escalabilidade [0/7]

- [ ] **2.1** Cache de parse Zod por engine (facade `execute()`)
- [ ] **2.2** Cache de `Decimal.clone` por `(precision, rounding)`
- [ ] **2.3** Pré-computar `Decimal` de literais no compile
- [ ] **2.4** Indexar tabelas de faixas numéricas (busca binária)
- [ ] **2.5** Fundir `resolve + shunting-yard` em uma passada
- [ ] **2.6** Converter `tablesMap` para `Map` cacheado
- [ ] **2.7** Suíte de benchmark (tinybench, 3 cenários, metas p99)

---

## Camada 3 — Robustez, tipos, documentação [0/14]

- [ ] **3.1** Eliminar fallback silencioso em input inválido
- [ ] **3.2** Detecção de ciclo entre steps *(considera `when` — ver 4.1)*
- [ ] **3.3** Validar ordem de declaração (forward refs) *(aplica também a `when`)*
- [ ] **3.4** Validar `conditional` com ≥1 branch
- [ ] **3.5** Documentar semântica de rounding (por step vs intermediário)
- [ ] **3.6** Revisar semântica de `clamp` (display-only vs stored)
- [ ] **3.7** Tipagem explícita para `paramRef` (`number` | `text`)
- [ ] **3.8** Extrair `TableRefToken` compartilhado
- [ ] **3.9** Unificar tipos via `z.infer` (fonte única de verdade)
- [ ] **3.10** Defaults explícitos no schema (`kind`, `valueType`, `clamp`)
- [ ] **3.11** Type guards em `ResolvedItem` (remover cast)
- [ ] **3.12** JSDoc em toda export pública + `@example`
- [ ] **3.13** `README.md` em `lib/runtime/`
- [ ] **3.14** Documentar semântica de `finalValue` e `kind: "output"` *(complementa 4.3)*

---

## Camada 4 — Branching & features [0/5]

> Habilita fluxos condicionais entre steps via campo `Step.when?: TableCondition`.
> Decisões-chave: filter-based · fail-loud em `STEP_SKIPPED` · expõe `outputs` em `ExecuteResult`.

- [ ] **4.1** Estender `Step` com `when?: TableCondition`
- [ ] **4.2** Política de `stepRef` para step skipped (`STEP_SKIPPED` + `conditional` lazy)
- [ ] **4.3** Expor `outputs: Record<stepId, string | null>` em `ExecuteResult`
- [ ] **4.4** Documentar branching no `README.md`
- [ ] **4.5** Cenário de benchmark com branching

---

## Fases

### Fase 1 — Pré-produção [0/9]

**Objetivo:** tornar o runtime apto para carga moderada no Next sem regressão.

- [ ] 1.1 Remover tipos de UI
- [ ] 1.2 Separar `compile()` de `run()`
- [ ] 1.5 Guards de recursos
- [ ] 2.2 Cache de `Decimal.clone`
- [ ] 2.6 `tablesMap` como `Map`
- [ ] 2.7 Suíte de benchmark (baseline registrado)
- [ ] 3.2 Detecção de ciclo
- [ ] 3.3 Validação de forward refs
- [ ] 3.11 Type guards em `ResolvedItem`

**Critério de saída:** cenário médio < 1ms p99, grande < 5ms p99; testes verdes; app Next rodando normalmente.

---

### Fase 2 — Pré-extração como lib [0/12]

**Objetivo:** permitir extração limpa como pacote independente consumível por serviço HTTP.

- [ ] 1.3 JSDoc em API pública
- [ ] 1.4 `CalcError` com `code` + `context`
- [ ] 3.1 Eliminar fallback silencioso em input inválido
- [ ] 3.4 Validar `conditional` com ≥1 branch
- [ ] 3.5 Documentar semântica de rounding
- [ ] 3.6 Revisar semântica de `clamp`
- [ ] 3.8 Extrair `TableRefToken`
- [ ] 3.9 Unificar tipos via `z.infer`
- [ ] 3.10 Defaults explícitos no schema
- [ ] 3.12 JSDoc completo nos tipos de domínio
- [ ] 3.13 `README.md` em `lib/runtime/`
- [ ] 3.14 Documentar `finalValue`

**Critério de saída:** consumidor externo (script isolado) importa de `lib/runtime/` sem arrastar código do Next; docs completas; `CalcError` exposto e testado.

---

### Fase 3 — Otimização guiada por benchmark [0/5]

**Objetivo:** ganhos incrementais baseados em medição, não em chute.

- [ ] 2.1 Cache de parse Zod por engine
- [ ] 2.3 Pré-computar Decimal de literais no compile
- [ ] 2.4 Indexar tabelas de faixas numéricas
- [ ] 2.5 Fundir resolve + shunting-yard em uma passada
- [ ] 3.7 Tipagem explícita para `paramRef`

**Critério de saída:** cada item ativado + medido; se benchmark não melhorar, item é revertido com nota no Changelog do `REFACTOR_PLAN.md`.

---

### Fase 4 — Branching & features [0/5]

**Objetivo:** habilitar fluxos condicionais entre steps.

**Pré-requisitos:** Fase 1 concluída (precisa de `compile()` — item 1.2 — e `CalcError` — item 1.4).

- [ ] 4.1 Estender `Step` com `when?: TableCondition`
- [ ] 4.2 Política de `stepRef` para step skipped
- [ ] 4.3 Expor `outputs` em `ExecuteResult`
- [ ] 4.4 Documentar branching no `README.md`
- [ ] 4.5 Cenário de benchmark com branching

**Critério de saída:** engine de exemplo com 3 regimes de cálculo executando corretamente cada caminho; testes cobrindo edge-cases de `stepRef` para skipped; benchmark mostra overhead de `when` dentro do orçamento.

---

## Benchmark — baseline e evolução

> Preencher conforme item 2.7 for implementado e cada otimização rodar.

### Metas de p99 (referência)

| Cenário | Target |
|---|---|
| Pequeno (5 steps, 0 tabelas) | < 0.2 ms |
| Médio (20 steps, 3 tabelas × 30 linhas) | < 1 ms |
| Grande (50 steps, 10 tabelas, algumas 500+ linhas) | < 5 ms |

### Histórico de medições

| Data | Commit/ref | Cenário | `execute()` p99 | `compile()` p99 | `run()` p99 | Notas |
|---|---|---|---|---|---|---|
| — | — | Pequeno | — | — | — | baseline pendente |
| — | — | Médio | — | — | — | baseline pendente |
| — | — | Grande | — | — | — | baseline pendente |

---

## Notas rápidas

- Commits seguem o padrão `runtime: X.Y <descrição curta>` (ex.: `runtime: 1.2 separar compile de run`).
- Itens breaking ganham entrada no **Changelog** do `REFACTOR_PLAN.md` e, se aplicável, seção de migração no `README.md` da lib.
- Qualquer desvio do plano (escopo, decisão técnica) → atualizar primeiro `REFACTOR_PLAN.md` e só então executar.
