# Runtime Refactor — Progress

> Dashboard unificado das duas frentes de refatoração.
> **Parte 1 (Runtime lib)** → detalhe em [`RUNTIME_REFACTOR_PLAN.md`](./RUNTIME_REFACTOR_PLAN.md).
> **Parte 2 (App Next.js)** → detalhe em [`RUNTIME_REFACTOR_APP.md`](./RUNTIME_REFACTOR_APP.md).
>
> Cada parte tem contadores, tabelas por camada/fase, e histórico próprios, seguindo o mesmo formato.
> **Como usar:** marcar `- [x]` conforme concluir cada item; atualizar contadores no topo da parte correspondente; registrar resultados de benchmark quando disponíveis (na Parte 1).

---

# 🔧 PARTE 1 — Runtime (lib/runtime/)

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

**Critério de saída:** cada item ativado + medido; se benchmark não melhorar, item é revertido com nota no Changelog do `RUNTIME_REFACTOR_PLAN.md`.

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

## Notas rápidas (Runtime)

- Commits seguem o padrão `runtime: X.Y <descrição curta>` (ex.: `runtime: 1.2 separar compile de run`).
- Itens breaking ganham entrada no **Changelog** do `RUNTIME_REFACTOR_PLAN.md` e, se aplicável, seção de migração no `README.md` da lib.
- Qualquer desvio do plano (escopo, decisão técnica) → atualizar primeiro `RUNTIME_REFACTOR_PLAN.md` e só então executar.

---
---

# 🖥️ PARTE 2 — App (Next.js)

## Overview

- **Última atualização:** 2026-04-19
- **Total de itens:** 25
- **Concluídos:** 0
- **Em andamento:** 0
- **Pendentes:** 25

### Progresso por camada

| Camada | Escopo | Total | Feitos | % |
|---|---|---|---|---|
| A — API server-side | `/api/calc/...` | 5 | 0 | 0% |
| B — Cliente builder | `EngineBuilder`, `StepCard`, `TestPanel` | 5 | 0 | 0% |
| C — Cliente calc | `Calculator` | 2 | 0 | 0% |
| D — Tipos & shared state | `lib/types.ts`, hooks | 4 | 0 | 0% |
| E — Schemas & contratos API | `lib/schemas/*` | 3 | 0 | 0% |
| F — Stores & client state | `stores/*`, `exportState` | 3 | 0 | 0% |
| G — Data migration & compat | Supabase, import JSON | 3 | 0 | 0% |
| **Total** | — | **25** | **0** | **0%** |

### Progresso por fase (App)

| Fase | Total | Feitos | % | Status | Acompanha |
|---|---|---|---|---|---|
| A1 — Pré-produção | 5 | 0 | 0% | 🔴 Não iniciada | Fase 1 Runtime |
| A2 — Pré-extração lib | 5 | 0 | 0% | 🔴 Não iniciada | Fase 2 Runtime |
| A3 — Otimização guiada | 5 | 0 | 0% | 🔴 Não iniciada | Fase 3 Runtime |
| A4 — Branching | 6 | 0 | 0% | 🔴 Não iniciada | Fase 4 Runtime |

> Legenda: 🔴 não iniciada · 🟡 em andamento · 🟢 concluída · ⚪ bloqueada

---

## Camada A — API server-side [0/5]

Endpoint principal: `app/api/calc/[...segments]/route.ts`.

- [ ] **A.1** Migrar handler para `compile()+run()` com cache `Map<engineId, CompiledEngine>` *(depende de runtime 1.2)*
- [ ] **A.2** Invalidação do cache no save/activate do engine (hook nos endpoints de persistência) *(depende de A.1)*
- [ ] **A.3** Handler estruturado de `CalcError` → HTTP status + código *(depende de runtime 1.4)*
- [ ] **A.4** Pré-aquecimento opcional no boot (compilar engines ativos)
- [ ] **A.5** Expor `outputs` no response JSON do endpoint `/api/calc/:id` *(depende de runtime 4.3)*

---

## Camada B — Cliente builder [0/5]

Afeta `app/builder/components/EngineBuilder/index.tsx`, `StepCard/index.tsx`, `TestPanel`.

- [ ] **B.1** Migrar test runner local do EngineBuilder para `compile()+run()` *(depende de runtime 1.2)*
- [ ] **B.2** Reapontar imports de `validateParens` (se refatoração mover arquivo)
- [ ] **B.3** UI de `paramRef` com tipo explícito (`number` | `text`) *(depende de runtime 3.7)*
- [ ] **B.4** UI para configurar `Step.when` (form + preview) *(depende de runtime 4.1)*
- [ ] **B.5** Render de `STEP_SKIPPED` / skip reason no trace do TestPanel *(depende de runtime 4.1–4.2)*

---

## Camada C — Cliente calc [0/2]

Afeta `app/calc/components/Calculator/index.tsx`.

- [ ] **C.1** Consumir `outputs: Record<stepId, string | null>` do response *(depende de A.5 e runtime 4.3)*
- [ ] **C.2** Exibir steps pulados (skip) no debug JSON quando `debug: true`

---

## Camada D — Tipos & shared state [0/4]

Afeta `lib/types.ts`, `hooks/useEngineState.ts`, `lib/runtime/types.ts`.

- [ ] **D.1** Limpar `lib/types.ts` (remover re-exports órfãos após 1.1)
- [ ] **D.2** Remover tipos UI de `lib/runtime/types.ts` *(faz par com runtime 1.1)*
- [ ] **D.3** Propagar mudança de `z.infer` chain nos consumidores *(depende de runtime 3.9)*
- [ ] **D.4** Acomodar `Step.when` no `AppState`/`UIState` do app *(depende de runtime 4.1)*

---

## Camada E — Schemas & contratos API [0/3]

Afeta `lib/schemas/api.ts`, `lib/schemas/endpoints.ts`.

- [ ] **E.1** Revisar imports/forma de `EngineSchema` (possível mudança após runtime 3.9/3.10)
- [ ] **E.2** Adicionar schema de response com campo `outputs` *(depende de runtime 4.3)*
- [ ] **E.3** Padronizar shape de erro no contrato API (aproveitando `CalcError.code`) *(depende de runtime 1.4)*

---

## Camada F — Stores & client state [0/3]

Afeta `stores/engineStore.ts`, `stores/requestStore.ts`, `lib/exportState.ts`.

- [ ] **F.1** `engineStore` aceita campo `when` em steps *(depende de runtime 4.1)*
- [ ] **F.2** `requestStore` consome novo response shape com `outputs` *(depende de runtime 4.3)*
- [ ] **F.3** `exportState` usa `compile()` para validação forte na importação *(depende de runtime 1.2)*

---

## Camada G — Data migration & compat [0/3]

- [ ] **G.1** Compatibilidade Supabase: engines salvos sem `when` continuam válidos (default `null`/`undefined`) *(depende de runtime 4.1)*
- [ ] **G.2** Script de migração caso runtime 3.7 (`paramRef` tipado) ou 3.10 (defaults explícitos) quebrem engines existentes
- [ ] **G.3** Validação forte no JSON import/export com `compile()` — reportar erros amigáveis ao usuário

---

## Fases (App)

### Fase A1 — Pré-produção [0/5]

Acompanha Fase 1 do Runtime. Foco: deixar o app compilando e rodando sobre o novo compile/run sem regressão.

- [ ] D.1 Limpar `lib/types.ts`
- [ ] D.2 Remover UI types de `lib/runtime/types.ts`
- [ ] A.1 compile+run + cache na API
- [ ] A.2 Invalidação do cache
- [ ] A.3 Handler de `CalcError` no endpoint

**Critério de saída:** API `/api/calc/:id` respondendo no mesmo shape atual; cache validado com testes manuais (cache hit/miss logs); app Next rodando normalmente.

---

### Fase A2 — Pré-extração lib [0/5]

Acompanha Fase 2 do Runtime. Foco: eliminar qualquer uso que impediria a extração.

- [ ] D.3 Propagar `z.infer` chain
- [ ] B.1 Migrar test runner do builder para compile+run
- [ ] B.2 Reapontar imports de `validateParens` (se necessário)
- [ ] E.1 Revisar `EngineSchema` / api.ts
- [ ] F.3 `exportState` usa `compile()`

**Critério de saída:** nenhum arquivo de `lib/runtime/` é importado para fins de UI; builder/test runner usam mesma API canônica; contratos de API atualizados.

---

### Fase A3 — Otimização guiada [0/5]

Acompanha Fase 3 do Runtime. Foco: observabilidade + UX refinada.

- [ ] B.3 UI de `paramRef` tipado
- [ ] B.5 Render de skip/STEP_SKIPPED no trace
- [ ] A.5 Expor `outputs` no response (se ainda não feito)
- [ ] C.1 Consumir `outputs` no Calculator
- [ ] C.2 Exibir skips no debug JSON

**Critério de saída:** debug mode mostra trace completo incluindo skips; consumidor do `/api/calc` pode escolher output por ID.

---

### Fase A4 — Branching [0/6]

Acompanha Fase 4 do Runtime. **Pré-requisito:** Fase A1 concluída (depende de compile/run + CalcError).

- [ ] B.4 UI para configurar `Step.when`
- [ ] D.4 Acomodar `when` no AppState
- [ ] E.2 Schema de response com `outputs`
- [ ] F.1 engineStore aceita `when`
- [ ] F.2 requestStore novo response shape
- [ ] G.1 Compat Supabase para engines sem `when`

**Critério de saída:** engine de exemplo com 3 regimes rodando end-to-end no app (builder → API → calculator); migração transparente para engines antigos.

---

## Notas rápidas (App)

- Commits seguem o padrão `app: X.Y <descrição curta>` (ex.: `app: A.1 migrar /api/calc para compile+run`).
- Todo item da Parte 2 aponta para o(s) item(ns) dependente(s) da Parte 1 (Runtime). Respeitar a ordem.
- Mudanças de contrato API (camada E) exigem atualização coordenada dos consumidores em C e F.
- Desvios de plano no app → atualizar `RUNTIME_REFACTOR_APP.md` (Changelog) antes de executar.
