# Runtime Performance Refactor — Plano completo

> Plano **self-contained** para endurecer o runtime (`lib/runtime/`) sob carga alta e/ou extraí-lo como pacote independente consumido por serviço HTTP dedicado (Express/Fastify/Hono).
>
> **Este documento não está no escopo ativo.** Ele existe para ser executado **quando um dos gatilhos abaixo for atingido**. Enquanto os engines reais de produção couberem no orçamento de latência do runtime atual, este plano fica em espera.
>
> **Pressuposto de leitura:** quem executar este plano pode não ter contexto da história anterior do projeto. Tudo que importa — decisões, racional, números de referência, itens de execução, ordem recomendada e progresso — vive neste arquivo. Não há dependência cruzada com outros documentos para **executar**.

---

## Sumário

- [Quando executar este plano](#quando-executar-este-plano)
- [Contexto atual (baseline de referência)](#contexto-atual-baseline-de-referência)
- [Pré-flight obrigatório ao reativar](#pré-flight-obrigatório-ao-reativar)
- [Diagnóstico e dívidas endereçadas](#diagnóstico-e-dívidas-endereçadas)
- [Escopo de execução](#escopo-de-execução)
  - [Runtime — Camada R1: Arquitetura & split](#runtime--camada-r1-arquitetura--split)
  - [Runtime — Camada R2: Performance & escalabilidade](#runtime--camada-r2-performance--escalabilidade)
  - [Runtime — Camada R3: Robustez, tipos, documentação](#runtime--camada-r3-robustez-tipos-documentação)
  - [App — Camada A: API server-side](#app--camada-a-api-server-side)
  - [App — Camada B: Cliente builder](#app--camada-b-cliente-builder)
  - [App — Camada D: Tipos & shared state](#app--camada-d-tipos--shared-state)
  - [App — Camada E: Schemas & contratos API](#app--camada-e-schemas--contratos-api)
  - [App — Camada F: Stores & client state](#app--camada-f-stores--client-state)
  - [App — Camada G: Data migration & compat](#app--camada-g-data-migration--compat)
- [Fases de execução (ordem recomendada)](#fases-de-execução-ordem-recomendada)
- [Convenções gerais](#convenções-gerais)
- [Progresso](#progresso)
- [Changelog](#changelog)

---

## Quando executar este plano

O plano só deve ser reaberto se **um dos dois gatilhos objetivos** for atingido. Caso contrário, a otimização é prematura e a dívida introduzida (cache invalidation, thread-safety, serverless cold start, etc.) supera o ganho.

### Gatilho 1 — Latência real em produção excede orçamento

Critério:
- `/api/calc/:id` (endpoint de cálculo) mostra **p99 > 5 ms sustentado** em produção (não spike isolado).
- Profiling real confirma que a origem está dentro do runtime — não em I/O Supabase, network, middleware Next.
- Reproduzível em bench contra fixtures **derivadas de engines reais problemáticos** (não as fixtures genéricas atuais).

### Gatilho 2 — Extração da `lib/runtime/` como pacote

Critério:
- Decisão de arquitetura para mover o runtime para um serviço/processo separado (Express, Fastify, Hono, container próprio, lambda dedicada).
- Nesse cenário, JSDoc da API pública + `CalcError` tipado + `compile()+run()` com cache + `z.infer` unificado deixam de ser "nice-to-have" e viram pré-requisitos de consumo externo.

### O que **não** é gatilho

- Fixtures sintéticas do bench estressadas acima da meta (ex.: cenário "grande" com 80 steps × 10 tabelas × 500 linhas). Fixtures artificiais existem para medir regressão, não para justificar trabalho.
- Desconforto estético com o código atual. Runtime hoje é legível, testado (via bruno), e funcional.
- Pedido de melhoria sem métrica por trás.

---

## Contexto atual (baseline de referência)

### O que o runtime faz hoje

`lib/runtime/` expõe `execute(engine: unknown, inputs, options) → ExecuteResult`. Internamente:

1. **Valida o engine** com Zod (`EngineSchema.parse`) — discriminated union recursiva via `z.lazy`.
2. **Constrói contexto** por request: `tablesMap` (via `Object.fromEntries`), decimal factory (`Decimal.clone({ precision, rounding })`), resolução de `inputs` → `Decimal`.
3. **Itera sobre `engine.steps`** na ordem do array. Cada step:
   - Avalia `step.when` se existir (item da Fase 4 de branching, já entregue).
   - Avalia `step.expression` via shunting-yard + RPN (`evaluator.ts`).
   - Aplica `precision` (arredondamento), `clamp` (display-only), popula `stepResults[id]`.
4. **Monta `ExecuteResult`** com `success`, `steps[]`, `finalValue`, `outputs` (último output + record por id).

Erros hoje: `throw new Error("[CODE] mensagem ...")` — prefix de código no `message` como contrato temporário (`CYCLE_DETECTED`, `STEP_SKIPPED`, etc.). Handler HTTP em `lib/server/handleCalcError.ts` faz parse do prefix e devolve HTTP status apropriado.

### Baseline medido (2026-04-20, commit `b677d20`)

Fixtures determinísticas geradas em `lib/runtime/__bench__/generate-fixtures.ts` (seed mulberry32 → 3 JSONs gitignored em `lib/runtime/__bench__/fixtures/`). Runner: `vitest bench` (por baixo usa `tinybench`).

| Cenário | Steps | Tabelas × linhas | Linhas JSON | `execute()` hz | p99 atual | Meta de referência |
|---|---|---|---|---|---|---|
| Pequeno | 10 | 2 × 500 | ~18k | 1.891 | **0.896 ms** | < 0.2 ms |
| Médio | 30 | 5 × 500 | ~46k | 817 | **1.792 ms** | < 1 ms |
| Grande | 80 | 10 × 500 | ~93k | 333 | **13.952 ms** | < 5 ms |

### Como ler o baseline

- **Engines reais de produção** hoje caem entre o cenário pequeno e o médio (20–40 steps, 1–3 tabelas com dezenas a baixas centenas de linhas). Estão dentro ou marginais ao orçamento informal de < 1 ms p99.
- **Cenário grande é extremo e sintético.** 80 steps + 5.000 linhas totais de tabela é ~2× qualquer engine real existente. Usar esse número para justificar trabalho é otimização prematura.
- **A entrega deste plano precisa bater números melhores que os acima em fixtures representativas do problema real.** Antes de começar qualquer item, re-medir contra fixtures realistas (ver pré-flight).

### Fixtures & scripts

- `yarn bench:fixtures` → regenera os 3 JSONs em `lib/runtime/__bench__/fixtures/` (via `tsx generate-fixtures.ts`).
- `yarn bench` → roda `vitest bench --run` contra os 3 cenários.
- Baseline arquivado: `lib/runtime/__bench__/baseline/2026-04-20-pre-compile-run.md`.

---

## Pré-flight obrigatório ao reativar

Antes de escrever **qualquer** linha de código deste plano:

1. **Re-ler este documento inteiro** (ele é self-contained — não existe contexto oculto em docs irmãs).
2. **Gerar fixtures representativas do cenário real.** Se o gatilho 1 foi acionado, substituir/complementar `generate-fixtures.ts` para produzir engines com shape do engine problemático de produção. Fixtures genéricas não servem.
3. **Re-rodar baseline.** `yarn bench:fixtures && yarn bench`. Arquivar snapshot novo em `lib/runtime/__bench__/baseline/<YYYY-MM-DD>-<motivo-curto>.md` com: números brutos, hardware/Node version, commit hash de referência, descrição do fixture.
4. **Definir meta de entrega concreta.** Ex.: "pequeno < 0.1 ms / médio < 0.5 ms / grande < 3 ms" ou "reduzir p99 de engine X (real, em produção) de 8 ms para < 2 ms". Meta sem métrica = item aberto para sempre.
5. **Validar o gatilho.** Garantir por profiling que a otimização projetada resolve a dor real. Ex.: se 70% do tempo é `Decimal.clone`, priorizar R2.2 (cache de factory). Se 50% é `Zod.parse`, priorizar R1.2 (split compile/run). Chutar ordem sem profiling = risco de reverter itens no fim.

**Sem esses 5 passos cumpridos, o plano está sendo executado no escuro.**

---

## Diagnóstico e dívidas endereçadas

O plano endereça **7 dívidas estruturais** e **~35 itens** (runtime + app). As dívidas:

1. **`execute()` faz trabalho repetido por request.** Validação Zod, `Decimal.clone`, `Object.fromEntries`, resolução de defaults — todo request reexecuta, mesmo com engine imutável. Padrão faltando: `compile()` uma vez / `run()` muitas. Endereçado em R1.2 + R2.1 + R2.6.
2. **Sem guards de recurso** (tamanho de expressão, linhas, ciclos). Não é defensivo para rodar como serviço público. Endereçado em R1.5 + R3.2 (este último já foi implementado como parte da branching).
3. **Sem JSDoc nas exports públicas.** UX ruim para consumidor de lib. Endereçado em R1.3 + R3.12.
4. **Erros como strings PT-BR soltas** (hoje com prefix `[CODE]` temporário). Impede i18n, monitoramento por categoria, roteamento pelo consumidor. Endereçado em R1.4 + E.3 + A.3.
5. **Duplicação tipo/schema** mantida à mão (`z.ZodType<T>`). Pode divergir silenciosamente. Endereçado em R3.9 (`z.infer` como fonte única).
6. **Fallback silencioso** (input inválido vira `0`). Perigoso em motor fiscal. Endereçado em R3.1 + A.6.
7. **Pequenas dívidas semânticas** não documentadas: rounding por step, clamp display-only, paramRef magic-typing, duplicação de `TableRefToken`, conditional sem `.min(1)`, defaults implícitos. Endereçadas em R3.4–R3.10 + R3.13–R3.14.

---

## Escopo de execução

Cada item carrega: **por quê**, **escopo**, **arquivos afetados**, **risco**, **critério de pronto**. Itens usam prefixos **R1/R2/R3** (runtime) e **A/B/D/E/F/G** (app) para manter correspondência com a nomenclatura histórica do projeto.

---

### Runtime — Camada R1: Arquitetura & split

#### R1.2 Separar `compile()` de `run()`

**Por quê:** maior ROI de performance se as medições apontarem que Zod + construções auxiliares dominam o tempo por request. Engine imutável entre requests = trabalho desperdiçado sob padrão atual. `compile()` faz tudo uma vez; `run()` executa o hot-path.

**Escopo:**
- Criar `lib/runtime/compile.ts` exportando `compile(engine: unknown): CompiledEngine`.
- Criar `lib/runtime/run.ts` exportando `run(compiled: CompiledEngine, inputs, options?): ExecuteResult`.
- Transformar `execute()` em facade: `execute(e, i, o) = run(compile(e), i, o)` — API pública retrocompatível 100%.
- `CompiledEngine` é objeto **imutável** carregando: engine validado (Zod parseado), `tablesMap: ReadonlyMap`, `variablesMap: ReadonlyMap`, `stepsMap: ReadonlyMap`, `D` (decimal factory já cacheado — R2.2), `executionOrder: readonly string[]` (topsort estável — já entregue na Fase 4 de branching, mas hoje é local a `execute()`; mover para o compile), `outputStepIds: readonly string[]`, `meta: { warnings }`.
- `run()` não muta `CompiledEngine` — imutabilidade garante thread-safety e reuso entre requests paralelos.
- Exportar `compile`, `run`, `CompiledEngine` em `index.ts`.
- JSDoc completo nos três, explicando quando usar cada um (ver R1.3).

**Anatomia do `CompiledEngine` (versão inicial):**

```ts
interface CompiledEngine {
  readonly engine: EngineState
  readonly config: EngineConfig
  readonly tablesMap: ReadonlyMap<string, CompiledTable>
  readonly variablesMap: ReadonlyMap<string, CompiledVariable>
  readonly stepsMap: ReadonlyMap<string, CompiledStep>
  readonly D: DecimalFactory
  readonly executionOrder: readonly string[]
  readonly outputStepIds: readonly string[]
  readonly meta: { readonly warnings: readonly string[] }
}
```

Sub-estruturas iniciais:
- `CompiledStep`: `id`, `name`, `enabled`, `kind` (default `"output"`), `clamp` (default `false`), `when` (raw), `expression: readonly ExpressionToken[]`, `dependencies: ReadonlySet<string>`.
- `CompiledVariable`: `{ id, defaultValue, valueType, kind }` (defaults resolvidos via R3.10).
- `CompiledTable`: `columns`, `rows` com valores brutos.

**Versão avançada (após R2.3 + R2.4):**
- `CompiledStep.expression: readonly CompiledToken[]` — tokens com `decimal: Decimal` pré-parseado.
- `CompiledConditionSide`: literais com `decimal` já instanciado.
- `CompiledTable.rowIndex: RowIndex | null` — estrutura de busca binária para tabelas de faixas.
- `meta.indexedTables: ReadonlySet<string>` — IDs das tabelas indexadas.

**Workflow do `compile()`:**
```
compile(engine) →
  [A] EngineSchema.safeParse            (Zod; vira CalcError("INVALID_ENGINE") via R1.4)
  [B] Construir tablesMap + variablesMap + stepsMap   (R2.6)
  [C] Obter D via createDecimalFactory com cache       (R2.2)
  [D] Análise estática:
        - grafo de dependências (expression + when + conditional)
        - topsort estável (tie-break pela ordem do array)
        - ciclo → CalcError("CYCLE_DETECTED") via R1.4
        - warnings (unreachable steps)
  [E] Guards estruturais maxSteps/maxTables/maxRowsPerTable  (R1.5)
  [F] (após R2.3) pré-computar Decimais de literais
  [G] (após R2.4) indexação de tabelas de faixas
  → retorna CompiledEngine imutável
```

**Workflow do `run()`:**
```
run(compiled, inputs, options) →
  [1] Resolver inputs → Decimals (respeita onInvalidInput — R3.1)
  [2] Inicializar stepResults: Map<stepId, { value, reason }>
  [3] Para cada step em compiled.executionOrder:
        - if !enabled → "disabled"
        - if when && !evaluateCondition(when, ctx) → "skipped"
        - try evaluate → "ok" / "error"
        - if kind === "output": formata, popula outputs, atualiza finalValue
  [4] Montar ExecuteResult
```

**Estratégia de cache em memória:**
- `CompiledEngine` vive em memória do processo Node. **Não é serializável** (tem Decimais, Maps, closures) — consumidores que quiserem persistir devem guardar só o JSON cru e recompilar local.
- Padrão canônico: `Map<engineId, CompiledEngine>` module-scope no lado consumidor (ex.: `lib/server/compiledCache.ts` — ver A.1).
- Primeira request de um engine compila (5–15 ms); demais servem em < 1 ms.
- **Invalidação:** explícita via `invalidateCompiled(engineId)` nos endpoints que mutam o engine (ver A.2). Estratégias alternativas: versão por chave (`${id}:${version}`), hash do JSON. **Não recomendar TTL** — invalidação silenciosa = bug fiscal.
- **Múltiplos processos (cluster/serverless):** cada processo tem cache próprio. Aceitável — compile é cheap. Cross-process via Redis não recomendado (CompiledEngine não é serializável).
- **Eviction:** engine pequeno ~50 KB em memória, médio ~500 KB, grande ~2 MB. Para 100–1k engines ativos, `Map` simples basta. Para 10k+, usar LRU com `maxSize`/TTL.
- **Pré-aquecimento opcional:** no boot, `await Promise.all(activeEngineIds.map(id => getCompiled(id, ...)))` — elimina "primeira request cara" (item A.4).

**Arquivos afetados:** novos `compile.ts`, `run.ts`; reescrita de `execute.ts` (facade); `index.ts`; tipos em `types.ts`.

**Risco:** médio. API pública não muda, mas estrutura interna é substancialmente refatorada. Cobertura via bruno antes/depois + snapshots de `ExecuteResult` obrigatórios.

**Critério de pronto:**
- `execute()` continua retornando `ExecuteResult` idêntico para mesmos inputs (snapshot).
- `compile()` × 1 + `run()` × N produz resultado idêntico a N `execute()`.
- Bench: `compile + run×1000` significativamente mais rápido que `execute×1000` (alvo: 5–20× em throughput no cenário médio).

---

#### R1.3 Documentar API pública com JSDoc

**Por quê:** sem JSDoc, autocompletion do consumidor é cego. Bloqueia extração como pacote — é critério mínimo de "lib séria".

**Escopo:**
- `index.ts`: JSDoc com `@param`, `@returns`, `@throws`, `@example` em cada export público.
- `execute()`: documentar formato de `engine`, contrato de `inputs` (strings, por quê), semântica de `finalValue` (último output), efeito de `options.debug`.
- `compile()` / `run()`: documentar imutabilidade do `CompiledEngine`, thread-safety (OK porque Decimal é imutável), quando cada um é preferível.
- `createDecimalFactory()` / `DecimalFactory`: semântica de cada método (`add`/`sub`/`mul`/`div`/`mod`/`round`/`clamp`/`format`), inclusive `precision + 10` interno.
- `evaluateExpression()` / `EvalContext`: documentar como API de baixo nível (uso avançado), recomendar `execute()` como ponto de entrada.
- `EngineSchema`: `@example` com engine mínimo válido.
- Tipos de domínio (`EngineState`, `EngineConfig`, `Variable`, `LookupTable`, `Step`, `ExpressionToken`, `ScalarToken`, `TableCondition`, `TableConditionSide`, `CompareOp`, `RoundingMode`): JSDoc em cada campo.

**Arquivos afetados:** `index.ts`, `types.ts`, `execute.ts`, `compile.ts`, `run.ts`, `decimalFactory.ts`, `evaluator.ts`, `schema.ts`.

**Risco:** nenhum (só doc).

**Critério de pronto:** hover em VS Code mostra JSDoc em cada export; `typedoc` (opcional) gera sem warnings.

---

#### R1.4 Introduzir `CalcError` com `code` + `context`

**Por quê:** string humana em PT-BR impede i18n, monitoramento por categoria, diferenciação programática no consumidor. Lib séria expõe códigos.

**Escopo:**
- Criar `lib/runtime/errors.ts` com classe `CalcError extends Error`:
  ```ts
  export class CalcError extends Error {
    code: CalcErrorCode
    context?: Record<string, unknown>
    constructor(code: CalcErrorCode, message: string, context?: Record<string, unknown>) {
      super(message)
      this.name = "CalcError"
      this.code = code
      this.context = context
    }
  }
  ```
- Enum `CalcErrorCode`:
  - `INVALID_ENGINE`, `VAR_NOT_FOUND`, `STEP_NOT_FOUND`, `STEP_DISABLED`, `STEP_SKIPPED`
  - `TABLE_NOT_FOUND`, `TABLE_NO_ROW_MATCH`, `TABLE_NO_COL_MATCH`, `TABLE_ROW_NOT_FOUND`, `TABLE_COL_NOT_FOUND`, `TABLE_CELL_MISSING`, `TABLE_PARAM_REQUIRED`, `TABLE_PARAM_UNKNOWN`, `TABLE_PARAM_OUT_OF_CONTEXT`
  - `DIV_BY_ZERO`, `MOD_BY_ZERO`, `UNBALANCED_PARENS`, `INVALID_EXPRESSION`, `NON_FINITE_RESULT`, `UNKNOWN_OPERATOR`, `EMPTY_EXPRESSION`
  - `CYCLE_DETECTED` (já emitido via prefix hoje)
  - `INVALID_INPUT` (R3.1)
  - `RESOURCE_LIMIT_EXCEEDED` (R1.5)
- Substituir todos os `throw new Error(...)` em `evaluator.ts`, `execute.ts`, `decimalFactory.ts`, `compile.ts`, `run.ts` por `throw new CalcError(CODE, msg, context)`.
- **Ponte drop-in:** hoje alguns erros já saem com prefix `"[CODE] ..."` no `message` (ver pré-existente em `handleCalcError.ts`). Substituir in-place por `CalcError` preserva o handler — handler detecta `instanceof CalcError` com prioridade e o parse de prefix vira fallback. Zero regressão no contrato HTTP até os consumidores migrarem.
- Em `execute()`/`run()`, serializar `CalcError` em `StepResult.error`: preservar `code` (ex.: `StepResult.errorCode?: CalcErrorCode`).
- Exportar `CalcError` e `CalcErrorCode` em `index.ts`.
- JSDoc em `CalcError` com exemplo de tratamento no consumidor.

**Arquivos afetados:** novo `errors.ts`, todos os arquivos com `throw`, `execute.ts`/`run.ts` (serialização), `index.ts`.

**Risco:** baixo-médio. Mensagens PT-BR atuais precisam ser preservadas para não regredir UX humana.

**Critério de pronto:** teste de erro preserva mensagem; consumidor consegue `instanceof CalcError` + `.code`; nenhum `throw new Error` sobra em `lib/runtime/` (busca regex).

---

#### R1.5 Guards de recursos

**Por quê:** runtime como serviço público precisa rejeitar engines maliciosos/acidentalmente gigantes. Guards explícitos > timeouts implícitos. Distinção estrutural vs per-expression preserva UX atual: um step "gordo" isolado não derruba os demais; engine inteiro mal-dimensionado falha cedo.

**Escopo:**
- Adicionar em `EngineConfig` (ou novo `RunOptions`) limites opcionais:
  - `maxTokensPerExpression` (default `1000`) — **per-expression**, checado em `run()`.
  - `maxRowsPerTable` (default `10_000`) — **estrutural**, checado em `compile()`.
  - `maxSteps` (default `500`) — **estrutural**, checado em `compile()`.
  - `maxTables` (default `100`) — **estrutural**, checado em `compile()`.
- **Estruturais** lançam `CalcError("RESOURCE_LIMIT_EXCEEDED", ..., { limit, actual })` em `compile()` — abortam o engine inteiro. Handler HTTP mapeia para 413.
- **Per-expression** lança no step específico, populando `steps[i].error`; outros steps seguem (preserva "erro-por-step").
- JSDoc explicando motivação, defaults, distinção.

**Arquivos afetados:** `types.ts`, `schema.ts`, `compile.ts`, `run.ts`.

**Risco:** baixo, desde que defaults sejam generosos para não quebrar engines legítimos.

**Critério de pronto:** teste com engines sintéticos acima do limite falham com `RESOURCE_LIMIT_EXCEEDED`; engines reais continuam passando sem mudança.

---

### Runtime — Camada R2: Performance & escalabilidade

#### R2.1 Cache de parse Zod por engine

**Por quê:** `execute(engine, ...)` (facade) pode ser chamado com o mesmo objeto JS N vezes — cada chamada re-executa Zod parse. `compile()` cacheado elimina o recorrente.

**Escopo:**
- `WeakMap<object, CompiledEngine>` em `execute.ts`: se mesma referência é passada, devolve compilado.
- Alternativa (se engine vem como JSON novo por request): hash estável (`fast-json-stable-stringify`) + `LRU<hash, CompiledEngine>` com `maxSize` configurável (ex.: 32).
- Documentar no JSDoc que para serviço HTTP, `compile()` explícito é preferível a confiar no cache do facade.

**Arquivos afetados:** `execute.ts`.

**Risco:** baixo; fallback trivial.

**Critério de pronto:** bench mostra `execute(sameRef)` × N ≈ `run()` × N (overhead do cache hit desprezível).

---

#### R2.2 Cache de `Decimal.clone` por `(precision, rounding)`

**Por quê:** `createDecimalFactory({precision, rounding})` hoje faz `Decimal.clone(...)` a cada chamada. Combinações finitas no mundo real (ex.: `2/ROUND_HALF_UP`, `4/ROUND_HALF_EVEN`). Cache é trivial.

**Escopo:**
- `Map<string, DecimalConstructor>` com chave `` `${precision}|${rounding}` ``.
- `createDecimalFactory()` consulta antes de clonar.
- JSDoc: construtor cacheado globalmente, thread-safe (Decimal é imutável).

**Arquivos afetados:** `decimalFactory.ts`.

**Risco:** mínimo.

**Critério de pronto:** bench mostra `createDecimalFactory` O(1) após primeira chamada.

---

#### R2.3 Pré-computar `Decimal` de literais no compile

**Por quê:** `new Decimal("1000.00")` acontece centenas a milhares de vezes por request em engines reais. Parse + alocação desnecessários. No compile, cada literal vira `Decimal` uma vez só.

**Escopo:**
- Durante `compile()`, percorrer expressões, condições e tabelas:
  - Tokens `{ type: "number", value: "1.5" }` → adicionar `decimal: D.from("1.5")`.
  - `TableConditionSide { kind: "number", value }` idem.
  - `Variable.defaultValue` pré-parseado (reutilizado se input ausente).
  - `EngineConfig.min`/`max` (usados em clamp).
  - `TableRow.values` literais por coluna.
- Criar tipos internos `CompiledExpressionToken`, `CompiledConditionSide` (não exportados).
- `evaluator.ts` adaptado para consumir forma compilada — elimina `ctx.D.from(token.value)` no hot-path.

**Arquivos afetados:** `compile.ts`, `evaluator.ts`, tipos internos.

**Risco:** médio. Mexe no shape consumido pelo evaluator — cobertura via bruno + snapshot obrigatória.

**Critério de pronto:** bench mostra redução em `run()`; snapshot de resultados idêntico.

---

#### R2.4 Indexar tabelas de faixas numéricas

**Por quê:** tabelas CNAE, INSS, IR podem ter dezenas a centenas de faixas. Em loop (tabela parametrizada chamada várias vezes por step/request), diferença O(log n) vs O(n) é real.

**Escopo:**
- Durante `compile()`, detectar tabelas "de faixas" — heurística:
  - Linhas têm `condition` com padrão estável: mesmo `left` (`varRef`/`stepRef`), ops em `<`/`<=`/`>=`/`>`, `right` do tipo `number`.
- Pré-ordenar linhas pelo valor numérico e construir busca binária.
- `evaluateTableRef` usa índice se disponível; fallback para busca linear sempre garantido.
- Marcar no `CompiledEngine.meta.indexedTables` quais tabelas foram indexadas (debug).

**Arquivos afetados:** `compile.ts`, `evaluator.ts`.

**Risco:** médio. Heurística pode ser frágil — garantir fallback.

**Critério de pronto:** teste cobrindo tabelas de faixas (resultado idêntico); bench com 500 linhas mostra ganho.

---

#### R2.5 Fundir `resolve + shunting-yard` em uma passada

**Por quê:** hoje `evaluateExpression` faz 3 passadas (`map(resolveToken)` → shunting-yard → RPN evaluate). Uma passada reduz alocações intermediárias. Ganho marginal em expressões curtas, relevante em longas ou em loops.

**Escopo:**
- Reescrever para uma passada: resolver token, empurrar direto no stack/RPN conforme tipo.
- Manter legibilidade — pode continuar em funções nomeadas internamente.
- **Precondição:** bench rodando, para medir se vale a densidade adicional.

**Arquivos afetados:** `evaluator.ts`.

**Risco:** baixo-médio. Código fica mais denso — só vale se bench mostrar.

**Critério de pronto:** resultado idêntico; bench de expressões grandes melhora.

---

#### R2.6 Converter `tablesMap` para `Map` cacheado

**Por quê:** `Map.get` tem lookup marginalmente melhor que `object[key]` para chaves dinâmicas e evita `Object.fromEntries` a cada request.

**Escopo:**
- Substituir `Object.fromEntries(...)` em `execute.ts` por `new Map<string, LookupTable>(...)` no `compile()`.
- `evaluator.ts` consome via `.get()`.
- Trivial, cai dentro de R1.2.

**Arquivos afetados:** `compile.ts`, `evaluator.ts`.

**Risco:** nenhum.

---

### Runtime — Camada R3: Robustez, tipos, documentação

#### R3.1 Eliminar fallback silencioso em input inválido

**Por quê:** em motor fiscal, `NaN → 0` silencioso é vetor de bug crítico invisível. Default deve ser fail-loud.

**Escopo:**
- Hoje (`execute.ts`): `try { D.from(inputs[v.id] ?? v.defaultValue ?? "0") } catch { variables[v.id] = D.from("0") }`.
- Introduzir `RunOptions.onInvalidInput: "throw" | "zero" | "default"` (default: `"throw"`).
- `"throw"` → `CalcError("INVALID_INPUT", msg, { varId, rawValue })`.
- `"zero"` → comportamento atual (silencioso → 0), com warning no trace se `debug`.
- `"default"` → tenta `defaultValue`, falha → lança.
- JSDoc com exemplo.
- **Breaking change visível ao app.** Coordenar com A.6.

**Arquivos afetados:** `execute.ts`/`run.ts`, `types.ts` (RunOptions), `errors.ts`.

**Risco:** breaking se consumidores confiam no fallback. Mitigação: `"zero"` disponível como opt-in; documentar migração.

**Critério de pronto:** teste com input `"abc"` lança por padrão; com `onInvalidInput: "zero"` retorna 0.

---

#### R3.4 Validar `conditional` com ≥ 1 branch

**Por quê:** `conditional` sem branches é equivalente a `elseToken` isolado — indica provável erro do autor. Falhar explicitamente.

**Escopo:** `.min(1)` em `branches` no `ExpressionTokenSchema` (conditional). Atualizar mensagem.

**Arquivos afetados:** `schema.ts`.

**Risco:** mínimo.

---

#### R3.5 Documentar semântica de rounding

**Por quê:** decisão forte em cálculo fiscal. Sem doc, consumidor interpreta errado e culpa a lib.

**Escopo:**
- JSDoc em `Step`, `EngineConfig.precision`, `evaluateExpression`:
  - Operações intermediárias usam `precision + 10` (do `Decimal.clone`).
  - Resultado **final de cada step** é arredondado para `config.precision` (via `D.round`).
  - Steps downstream consomem valor **já arredondado** (`stepResults[id]`).
- Exemplo mostrando acumulação intencional.
- Referenciar no `README.md` (R3.13).

**Arquivos afetados:** docstrings em `types.ts`, `evaluator.ts`, `decimalFactory.ts`.

**Risco:** nenhum.

---

#### R3.6 Revisar semântica de `clamp` (display-only vs stored)

**Por quê:** hoje `execute.ts` aplica clamp apenas em `displayVal` (formatted), mas `stepResults[step.id] = val` armazena **não-clampado**. Inconsistência silenciosa entre "o que vejo" e "o que uso downstream".

**Escopo:**
- Decidir com explicitação:
  - **Opção A (atual):** clamp display-only. Steps downstream veem valor real.
  - **Opção B:** clamp afeta valor armazenado. Downstream vê clampado.
- Documentar decisão no JSDoc de `Step.clamp`.
- Se B: `stepResults[step.id] = displayVal`.

**Arquivos afetados:** `execute.ts`/`run.ts`, JSDoc em `types.ts`.

**Risco:** **depende da decisão** — Opção B muda comportamento.

---

#### R3.7 Tipagem explícita para `paramRef`

**Por quê:** hoje `resolveConditionSide` em `paramRef` tenta `D.from(value)` e cai pra string no catch — "magia". Evita bugs sutis (string numérica virar Decimal quando deveria ser texto).

**Escopo:**
- Estender `LookupTable.parameters` de `string[]` → `Array<{ name: string; type: "number" | "text" }>`.
- Ajustar `schema.ts` e consumidores.
- `resolveConditionSide` usa tipo declarado em vez de inferir por try/catch.
- **Camada de compat:** aceitar forma antiga (`string[]`) por um período, convertendo implicitamente para `{ name, type: "number" }` com warning.
- **Breaking** sem compat. Coordenar com G.2 (migração).

**Arquivos afetados:** `types.ts`, `schema.ts`, `evaluator.ts`.

**Risco:** médio — breaking se engines salvos tem forma antiga.

---

#### R3.8 Extrair `TableRefToken` compartilhado

**Por quê:** shape `{ type: "tableRef"; tableId; columnId; rowId?; arguments? }` aparece duplicada em `ScalarToken` e `ExpressionToken` (TS + Zod). DRY.

**Escopo:**
```ts
export interface TableRefToken {
  type: "tableRef"
  tableId: string
  columnId: string | null
  rowId?: string | null
  arguments?: Record<string, TableConditionSide>
}
```
Reutilizar em ambos os unions. Mesma extração no Zod schema.

**Arquivos afetados:** `types.ts`, `schema.ts`.

**Risco:** nenhum.

---

#### R3.9 Unificar tipos via `z.infer`

**Por quê:** hoje um campo adicionado só no schema ou só no tipo TS compila sem erro até explodir em runtime. Fonte única elimina classe inteira de bugs.

**Escopo:**
- Decidir fonte canônica:
  - **Opção A (recomendada):** `z.infer<typeof XxxSchema>` — Zod como fonte; `types.ts` exporta apenas derivados.
  - **Opção B:** manter interfaces e usar `satisfies` no schema (stricter que `z.ZodType<T>`).
- Migrar tipos de domínio (`EngineState`, `EngineConfig`, `Variable`, `LookupTable`, `Step`, `TableCondition`, etc.).
- Tipos de runtime (`ExpressionToken`, `ScalarToken`) idem, se viável.
- Confirmar consumidores externos continuam compilando (D.3).

**Arquivos afetados:** `types.ts`, `schema.ts`, consumidores (D.3).

**Risco:** médio — mudança estrutural. `z.infer` pode produzir tipos sutilmente diferentes (opcional virar `| undefined`).

**Critério de pronto:** `tsc --noEmit` verde; bruno passa; diff dos tipos inferidos vs interfaces revisado manualmente.

---

#### R3.10 Defaults explícitos no schema

**Por quê:** defaults implícitos obrigam consumidor a conhecer a regra. `.default()` do Zod garante `parsed.data` normalizado.

**Escopo:**
- `Variable.kind` default `"input"`: `z.enum(["input", "constant"]).default("input")`.
- `Variable.valueType` default `"number"`: `z.enum(["number", "text"]).default("number")`.
- `Step.kind` default `"output"`: `z.enum(["internal", "output"]).default("output")`.
- `Step.clamp` default `false`: `z.boolean().default(false)`.
- Após parse, consumidores recebem valores concretos.
- Ajustar `evaluator.ts` e `execute.ts` removendo `?? "default"` redundantes.

**Nota importante:** comentário atual em `types.ts` diz *"output if omitted"*, mas `execute.ts` faz `if (step.kind === "output")` — ou seja, step sem `kind` hoje **não** vira output (bug silencioso, código e comentário se contradizem). Aplicar `.default("output")` alinha comportamento à intenção documentada. **Isso é fix**, registrar no Changelog como correção.

**Arquivos afetados:** `schema.ts`, `types.ts`, `evaluator.ts`, `execute.ts`.

**Risco:** baixo. Transformação no parse do Zod, sem migração de dados.

**Critério de pronto:** teste de parse normaliza; engine com step sem `kind` produz `finalValue` correto.

---

#### R3.12 JSDoc em toda export pública + `@example`

**Por quê:** complementa R1.3 focando tipos de domínio; garante que nada sobre sem doc.

**Escopo:**
- `types.ts`: JSDoc em cada interface e campo.
- `schema.ts`: JSDoc de topo explicando filosofia (Zod como fonte única se R3.9 aplicado).
- Campos com semântica sutil (`kind: "output"` define finalValue; `columnId: null` ativa 2D; `rowId: null` ativa row-by-condition; `clamp` é display-only): comentário explícito.
- Rodar `typedoc` local e verificar sem warnings.

**Arquivos afetados:** todos de `lib/runtime/`.

**Risco:** nenhum.

---

#### R3.13 `README.md` dentro de `lib/runtime/`

**Por quê:** ponto de entrada para qualquer consumidor futuro (humano ou LLM). Sem ele, a lib é caixa preta.

**Escopo — seções:**
- **Visão geral:** o que o runtime faz.
- **Conceitos:** Engine, Steps, Variables, Tables, Tokens, Conditions.
- **API pública:** `execute`, `compile`, `run`, `EngineSchema`, `CalcError`.
- **Semântica importante:** rounding, clamp, order-of-execution (topsort), output step, text vs number variables.
- **Exemplos:**
  1. Cálculo simples (2–3 steps, sem tabela).
  2. Com tabela 1D.
  3. Com tabela 2D (row + col por condition).
  4. Com tabela parametrizada.
  5. `debug: true` e interpretação do trace.
  6. Branching com `when` + `conditional` (documentar padrão recomendado).
- **Tratamento de erro:** `CalcError.code` e como rotear.
- **Performance:** quando preferir `compile()+run()` vs `execute()`; cache pattern; pré-aquecimento.

**Arquivos afetados:** novo `README.md`.

**Risco:** nenhum.

---

#### R3.14 Documentar semântica de `finalValue` e `kind: "output"`

**Por quê:** nome `finalValue` sugere "resultado final" (singular), mas engine permite múltiplos outputs. Ambíguo, precisa de doc.

**Escopo:**
- JSDoc em `ExecuteResult.finalValue`: "valor do **último** step com `kind: 'output'` que executou com sucesso (não skipped por `when`). Steps `kind: 'internal'` são ignorados. Se nenhum output executou, é `null`."
- JSDoc em `Step.kind`: mesma explicação do lado oposto.
- Exemplo explícito: engine com múltiplos outputs.
- Nota: `outputs: Record<stepId, string | null>` (já exposto na branching) oferece granularidade — documentar relação.
- Branching: em engine com `when`, apenas outputs no caminho executado têm valor; skipped aparecem como `null` em `outputs`.

**Arquivos afetados:** `execute.ts`/`run.ts` (JSDoc), `types.ts` (JSDoc).

**Risco:** nenhum.

---

### App — Camada A: API server-side

Escopo: `app/api/calc/[...segments]/route.ts`. Maior ganho de latência do app.

#### A.1 Migrar handler para `compile()+run()` com cache

> Depende de: **R1.2**.

**Escopo:**
- Declarar `export const runtime = "nodejs"` explicitamente em `app/api/calc/[...segments]/route.ts`. Cache `Map` module-scope **não funciona em edge** (cada invocação é um isolate novo).
- Criar `lib/server/compiledCache.ts` — casa canônica:
  ```ts
  import { compile, type CompiledEngine } from "@/libs/runtime"

  const compiledCache = new Map<string, CompiledEngine>()

  export function getCompiled(engineId: string, loader: () => unknown): CompiledEngine {
    let compiled = compiledCache.get(engineId)
    if (!compiled) {
      compiled = compile(loader())
      compiledCache.set(engineId, compiled)
    }
    return compiled
  }

  export function invalidateCompiled(engineId: string): void {
    compiledCache.delete(engineId)
  }
  ```
- Handler passa a: `getCompiled(id, () => loadEngine(id))` → `run(compiled, inputs, opts)` → serializar `ExecuteResult`.
- Log de cache hit/miss em dev (condicionado a `NODE_ENV === "development"`).
- Manter cache em `lib/server/` (não em `lib/runtime/`) preserva fronteira da lib: quando o runtime virar pacote, cache fica no serviço consumidor.

**Arquivos afetados:** `app/api/calc/[...segments]/route.ts`, novo `lib/server/compiledCache.ts`.

**Risco:** médio. Invalidação correta (A.2) é crítica — cache stale em motor fiscal = bug crítico silencioso. Serverless reseta em cold start (aceitável).

**Critério de pronto:** duas requests seguidas para mesmo engineId → logs mostram miss + hit; response JSON idêntico; p99 da segunda em diante cai dramaticamente.

---

#### A.2 Invalidação do cache no save/activate do engine

> Depende de: **A.1**.

**Política — tabela é contrato:**

| Endpoint | Invalida? | Racional |
|---|---|---|
| `PATCH /api/engines/:id` | **Sim** (se succeede) | Cobre mudança de `engine`, `name`, `project_id`. Barato. |
| `DELETE /api/engines/:id` | **Sim** | Entrada no cache fica órfã. |
| `POST /api/engines/:id/activate` | **NÃO** | Só muta `is_active`; JSON de `engine` não muda; `/api/calc/:id` não filtra por `is_active`. Invalidar seria desperdício + miss extra. |
| `POST /api/engines` (create) | **NÃO** | Engine novo nunca esteve no cache. |

**Escopo:**
- Importar `invalidateCompiled` de `lib/server/compiledCache.ts` nos handlers `PATCH` e `DELETE` de `app/api/engines/[id]/route.ts`.
- Chamar `invalidateCompiled(engineId)` **após** `.update()` / `.delete()` retornar sucesso.
- Não tocar em `POST /api/engines` nem `POST /api/engines/:id/activate`.
- Documentar no topo de `compiledCache.ts`: invalidação explícita (sem TTL, sem versionamento); tabela acima é o contrato — novos endpoints que mutem o JSON devem adicionar à tabela + invalidar.

**Arquivos afetados:** `app/api/engines/[id]/route.ts` (PATCH + DELETE), comentário em `lib/server/compiledCache.ts`.

**Risco:** médio. Esquecer = bug silencioso.

**Critério de pronto:**
- `PATCH /api/engines/:id` com mudança visível → próximo `POST /api/calc/:id` reflete.
- `POST /api/engines/:id/activate` → próximo `POST /api/calc/:id` usa compile anterior (log de cache hit).

---

#### A.3 Handler estruturado de `CalcError` → HTTP + código

> Depende de: **R1.4** (classe `CalcError` formal).

**Escopo:** `lib/server/handleCalcError.ts` consumido por `app/api/calc/[...segments]/route.ts`.

```ts
export function handleCalcError(err: unknown): NextResponse {
  if (err instanceof CalcError) {
    const status = statusFromCode(err.code)
    return NextResponse.json(
      { error: { code: err.code, message: err.message, context: err.context } },
      { status },
    )
  }
  console.error("[handleCalcError] unexpected error", err)
  const message = err instanceof Error ? err.message : String(err)
  return NextResponse.json({ error: { code: "UNKNOWN", message } }, { status: 500 })
}

function statusFromCode(code: CalcErrorCode): number {
  switch (code) {
    case "RESOURCE_LIMIT_EXCEEDED": return 413
    case "INVALID_INPUT": return 400
    case "INVALID_ENGINE":
    case "CYCLE_DETECTED":
    default: return 422
  }
}
```

- Se R1.4 ainda não estiver pronta, versão ponte: ramo 1 captura `ZodError` e devolve `{ error: "Invalid engine config", validationErrors: [...] }` (shape legado), ramo 2 faz parse de prefix `"[CODE] ..."` em `err.message`, ramo 3 fallback `UNKNOWN`. Depois colapsa em `instanceof CalcError`.
- Consumir no `/api/calc/[...segments]/route.ts` via `try/catch` delegando pro handler.
- **Breaking visível:** shape do response de erro muda — coordenar com E.3 + bruno + consumidores.

**Arquivos afetados:** novo `lib/server/handleCalcError.ts`, `app/api/calc/[...segments]/route.ts`, `bruno/calc/*.bru`, schemas (E.3).

**Risco:** médio na versão final (breaking shape); baixo na ponte.

**Critério de pronto:** bruno cobre cenários `INVALID_ENGINE` → 422, `CYCLE_DETECTED` → 422, `RESOURCE_LIMIT_EXCEEDED` → 413, `INVALID_INPUT` → 400.

---

#### A.4 Pré-aquecimento opcional no boot

> Depende de: **A.1**.

**Escopo:**
- Função `warmupCache(engineIds: string[])` que roda `getCompiled` em paralelo.
- Invocar no boot (`instrumentation.ts` do Next, ou na primeira request).
- Critério: `is_active = true` + uso recente (log/tracking).
- Feature flag: `WARMUP_ENABLED=true`.

**Arquivos afetados:** `instrumentation.ts` (ou equivalente), `lib/server/compiledCache.ts`.

**Risco:** baixo (opcional).

**Critério de pronto:** com warmup ligado, primeira request ao engine pré-aquecido tem latência igual ao cache hit.

---

#### A.5 Expor `outputs` no response JSON

> Depende de: contrato com `outputs` (já entregue via branching).

**Escopo:**
- Formalizar contrato no schema de response (E.2): `outputs: Record<stepId, string | null>`.
- Hoje `ExecuteResult` inteiro já é serializado — `outputs` já propaga. Item existe para fechar o schema.

**Arquivos afetados:** `app/api/calc/[...segments]/route.ts` (se tiver filtragem custom), `schemas/endpoints.ts`.

**Risco:** mínimo (aditivo).

---

#### A.6 Política de `onInvalidInput` no endpoint + consumidores

> Depende de: **R3.1**.

**Escopo:**
- Default do endpoint: propagar throw do runtime (fail-loud). Aceitar override no body: `{ inputs, debug, onInvalidInput?: "throw" | "zero" | "default" }`.
- Passar `onInvalidInput` para `run()` via `RunOptions`.
- `CalcError("INVALID_INPUT")` mapeado em A.3 para 400 com body `{ error: { code: "INVALID_INPUT", message, context: { varId, rawValue } } }`.
- Builder (test runner): exibir erro inline no campo do TestPanel em vez de explodir UI.
- Calculator: consumir HTTP 400 estruturado e exibir mensagem apontando qual variável está inválida.

**Arquivos afetados:** `app/api/calc/[...segments]/route.ts`, TestPanel (builder), `app/calc/components/Calculator/index.tsx`, `schemas/endpoints.ts`.

**Risco:** médio — breaking de comportamento (cliente que enviava input inválido e recebia 0 passa a receber 400).

**Critério de pronto:**
- `POST { inputs: { x: "abc" } }` → 400 com `error.code === "INVALID_INPUT"`.
- Mesmo com `onInvalidInput: "zero"` → 200 com x tratado como 0.
- TestPanel: campo destacado, sem crash.
- Calculator: toast apontando variável, sem tela branca.

---

### App — Camada B: Cliente builder

#### B.1 Migrar test runner do `EngineBuilder` para `compile()+run()`

> Depende de: **R1.2**.

**Escopo:**
- Hoje usa `createDecimalFactory + evaluateExpression` direto (API de baixo nível).
- Migrar para `compile(currentEngine)` memorizado (`useMemo` dependente da identidade do engine) + `run(compiled, inputs)` a cada mudança de input.
- Benefício: builder valida estrutura enquanto usuário edita (forward refs, ciclos, guards).
- Se `compile()` falha (ex.: ciclo), renderizar erro amigável inline apontando steps envolvidos (usa `CalcError.context`).
- **Precaução:** `compile()` pode ser "caro" por keystroke — memoização + debounce obrigatórios.

**Arquivos afetados:** `app/builder/components/EngineBuilder/index.tsx`, possível hook `useCompiledEngine`.

**Risco:** médio.

**Critério de pronto:** editar no builder → trace idêntico ao que `/api/calc/:id` retorna para mesmo input.

---

#### B.2 Reapontar imports de `validateParens`

**Escopo:** auditar se `validateParens` continua exportado em `lib/runtime/index.ts` após refactor. Se mudar de caminho, atualizar `StepCard/index.tsx`.

**Arquivos afetados:** `app/builder/components/StepCard/index.tsx`.

**Risco:** nenhum.

---

#### B.3 UI de `paramRef` com tipo explícito

> Depende de: **R3.7**.

**Escopo:**
- Editor de tabela: seletor de tipo (`number` | `text`) por parâmetro.
- Default `number` (compat com forma antiga).
- Aviso quando tabela antiga (`string[]`) é carregada — sugerir conversão.

**Arquivos afetados:** componentes de edição de tabela no builder.

**Risco:** baixo (UI apenas).

---

### App — Camada D: Tipos & shared state

#### D.3 Propagar mudança de `z.infer` chain

> Depende de: **R3.9**.

**Escopo:**
- `z.infer` como fonte única pode produzir tipos sutilmente diferentes (opcional vs `| undefined`).
- Rodar `tsc --noEmit` após R3.9 — corrigir imports/usos quebrados.
- Documentar diferenças no `CHANGELOG.md` do projeto.

**Arquivos afetados:** amplo — qualquer arquivo que importa `EngineState`, `Step`, `Variable`, etc.

**Risco:** médio — mudanças podem ser muitas, mas TS acusa todas.

---

### App — Camada E: Schemas & contratos API

#### E.1 Revisar `EngineSchema` / `schemas/api.ts`

> Depende de: **R3.9** + **R3.10**.

**Escopo:**
- `api.ts` e `endpoints.ts` continuam importando `EngineSchema` corretamente após migração para `z.infer`.
- Derivações via `.pick()`/`.omit()`/`.extend()` seguem válidas.

**Arquivos afetados:** `schemas/api.ts`, `schemas/endpoints.ts`.

**Risco:** baixo.

---

#### E.3 Padronizar shape de erro no contrato API

> Depende de: **R1.4** + **A.3**.

**Escopo:**
- Schema único: `{ error: { code: z.string(), message: z.string(), context: z.record(z.unknown()).optional() } }`.
- Reutilizar em todas as rotas.

**Arquivos afetados:** `schemas/api.ts` (ou novo `schemas/errors.ts`).

**Risco:** baixo.

---

### App — Camada F: Stores & client state

#### F.3 `exportState` usa `compile()` para validação forte

> Depende de: **R1.2**.

**Escopo:**
- Na importação JSON (`core/export.importXxx`), rodar `compile()` em vez de só `EngineSchema.parse`.
- `compile()` captura ciclos, recursos, forward refs inválidos — imports que passariam no Zod mas quebrariam em runtime falham cedo.
- Mensagens amigáveis baseadas em `CalcError.code`/`context`.
- Considerar flag "importar mesmo assim" se rejeição for muito agressiva.

**Arquivos afetados:** `core/export.ts`.

**Risco:** médio — pode rejeitar imports que antes "passavam" mas não rodavam.

---

### App — Camada G: Data migration & compat

#### G.2 Script de migração para quebras potenciais

> Depende de: **R3.7** e/ou **R3.10** se forem breaking.

**Escopo:**
- Auditar se engines salvos precisam de migração ao aplicar 3.7 (paramRef tipado) / 3.10 (defaults explícitos).
- Script standalone (ex.: `scripts/migrate-engines.ts`) itera pelo Supabase, aplica transformação, persiste.
- Dry-run mode obrigatório. Executar em staging primeiro.

**Arquivos afetados:** novo script em `scripts/`.

**Risco:** alto (operação sobre dados de produção). Dry-run + backup antes.

**Critério de pronto:** dry-run reporta N engines afetados; execução real em staging + smoke test confirma.

---

#### G.3 Validação forte no JSON import

> Depende de: **F.3**.

**Escopo:**
- UI de import (se houver upload de JSON) usa `compile()` além do schema parse.
- Exibe lista estruturada de erros (`CalcError[]`) para usuário corrigir.

**Arquivos afetados:** componente de import no builder/admin.

**Risco:** baixo.

---

## Fases de execução (ordem recomendada)

Cada fase tem **critério de entrada** (pré-requisito) e **critério de saída** (comprovação). A cada fase, atualizar o bloco de [Progresso](#progresso) no fim deste doc.

### Fase P1 — Split + caches base (ponto de inflexão)

**Objetivo:** entregar `compile()+run()` funcionais com os caches triviais; migrar endpoint principal do app para consumir.

**Ordem:**

1. **R1.4** — `CalcError` (substitui prefix `[CODE]` atual; drop-in via handler existente).
2. **R1.5** — Guards de recurso (estruturais em compile, per-expression em run).
3. **R1.2** — Split `compile()` + `run()`. **Marco central.** Inclui R2.6 (`tablesMap` como `Map`) de graça.
4. **R2.2** — Cache de `Decimal.clone` por `(precision, rounding)`.
5. **R2.1** — Cache de parse Zod no facade `execute()`.
6. **A.1** — Migrar `/api/calc/[...segments]/route.ts` para `compile()+run()` + `lib/server/compiledCache.ts` + `runtime = "nodejs"`.
7. **A.2** — Invalidação do cache nos endpoints de persistência (`PATCH`/`DELETE`).
8. **A.3** — Handler de `CalcError` → HTTP (ponte ou final).

**Critério de saída:** bench cenário médio < 0.5 ms p99 (ou meta definida no pré-flight); bruno `bruno/calc/*` verde; app Next rodando sem regressão; cache validado com logs hit/miss.

---

### Fase P2 — Extração como lib (se Gatilho 2 ativo)

**Objetivo:** runtime consumível como pacote externo. Só executar se Gatilho 2 (extração) foi o motivador.

**Ordem:**

1. **R1.3** — JSDoc em API pública.
2. **R3.9** — Unificar tipos via `z.infer`.
3. **R3.10** — Defaults explícitos no schema.
4. **R3.1** — Eliminar fallback silencioso (`onInvalidInput`).
5. **A.6** — Política de `onInvalidInput` no endpoint + consumidores (par com R3.1).
6. **R3.4** — `conditional` com `.min(1)`.
7. **R3.5** — Documentar rounding.
8. **R3.6** — Revisar clamp.
9. **R3.7** — `paramRef` tipado (coordenar com G.2).
10. **R3.8** — Extrair `TableRefToken`.
11. **D.3** — Propagar `z.infer` chain no app.
12. **E.1** — Revisar `EngineSchema` no app após R3.9.
13. **E.3** — Shape de erro padronizado (par com A.3 final + R1.4).
14. **R3.12** — JSDoc em tipos de domínio.
15. **R3.13** — `README.md` em `lib/runtime/`.
16. **R3.14** — Documentar `finalValue` e `outputs`.
17. **A.3 (final)** — Refatorar handler em `instanceof CalcError` + `statusFromCode`.

**Critério de saída:** consumidor externo (script isolado) importa `lib/runtime/` sem arrastar código do Next; docs completas; `CalcError` exposto e testado.

---

### Fase P3 — Otimizações profundas (guiadas por bench)

**Objetivo:** ganhos incrementais baseados em medição. Se bench não confirmar ganho, item é revertido.

**Ordem:**

1. **R2.3** — Pré-computar `Decimal` de literais no compile.
2. **R2.4** — Indexar tabelas de faixas (busca binária).
3. **R2.5** — Fundir `resolve + shunting-yard` em uma passada.
4. **A.4** — Pré-aquecimento do cache no boot.

**Critério de saída:** cada item ativado + medido em bench; sem ganho → reverter com nota no Changelog. Meta: cenário grande < 3 ms p99.

---

### Fase P4 — Builder + refinamentos finais

**Objetivo:** UX do builder alinhada com API canônica; fechar itens de UI pendentes.

**Ordem:**

1. **B.1** — Migrar test runner do builder para `compile()+run()`.
2. **B.2** — Reapontar imports de `validateParens`.
3. **B.3** — UI de `paramRef` tipado.
4. **F.3** — `exportState` usa `compile()`.
5. **G.3** — Validação forte no JSON import.
6. **G.2** — Script de migração (se R3.7/R3.10 precisarem de backfill).

**Critério de saída:** builder mostra no TestPanel exatamente o que `/api/calc` retorna; import JSON rejeita engines estruturalmente inválidos com mensagens claras; dados migrados quando necessário.

---

## Convenções gerais

- Commits: `runtime: R<X.Y> <descrição>` ou `app: <X.Y> <descrição>`.
- Breaking changes → entrada no Changelog + seção de migração no `README.md` da lib (R3.13).
- Nenhum `throw new Error` remanescente em `lib/runtime/` após R1.4.
- Zod schema é contrato público após R3.9.
- Verificação padrão = **smoke test via bruno** (`bruno/calc/*` e `bruno/flows/calc/*`) + **bench** (`yarn bench`) + snapshots manuais de `ExecuteResult` quando aplicável. Projeto não tem suite de unit tests.
- Antes de começar qualquer item, revisitar racional + re-medir baseline — se cenário mudou, atualizar este doc primeiro.
- Cada item deve apontar para arquivos afetados, risco, e critério de pronto no corpo. Mudanças de escopo no Changelog **antes** de executar.

---

## Progresso

> Atualizar esta seção conforme executar. **Contadores e histórico ficam neste arquivo** para manter a doc self-contained.

### Overview

- **Última atualização:** 2026-04-20 (doc criado)
- **Status global:** ⚪ **não iniciado** (gatilho não acionado)
- **Total de itens:** 36 (35 distintos; A.3 aparece em P1 e P2)
  - Runtime (R1+R2+R3): 21
  - App (A+B+D+E+F+G): 15
- **Concluídos:** 0
- **Em andamento:** 0

### Progresso por camada

| Camada | Escopo | Total | Feitos | % |
|---|---|---|---|---|
| R1 — Arquitetura & split | `compile.ts`, `run.ts`, `errors.ts`, guards | 4 | 0 | 0% |
| R2 — Performance & escalabilidade | caches, pré-compute, indexação | 6 | 0 | 0% |
| R3 — Robustez, tipos, docs | schema, JSDoc, README, tipos | 11 | 0 | 0% |
| A — API server-side | `/api/calc/*` + handler | 6 | 0 | 0% |
| B — Cliente builder | EngineBuilder, StepCard | 3 | 0 | 0% |
| D — Tipos & shared state | `z.infer` chain | 1 | 0 | 0% |
| E — Schemas & contratos API | schemas/* | 2 | 0 | 0% |
| F — Stores & client state | exportState | 1 | 0 | 0% |
| G — Data migration & compat | scripts, import/export | 2 | 0 | 0% |
| **Total** | — | **36** | **0** | **0%** |

> Contagem R3: 3.1, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.12, 3.13, 3.14 → **11 itens**. Itens pré-entregues no commit `b677d20` (2026-04-20, fora do escopo deste plano): R1.1 (remover UI types de `lib/runtime/types.ts`), R2.7 (suíte de benchmark + baseline), R3.2/R3.3 (agora cobertos pelo BRANCHING), R3.11 (type guards em `ResolvedItem`), D.1/D.2 no app (no-ops).

### Progresso por fase

| Fase | Escopo principal | Total | Feitos | % | Status |
|---|---|---|---|---|---|
| P1 — Split + caches | R1.2, R1.4, R1.5, R2.1, R2.2, R2.6, A.1, A.2, A.3 | 9 | 0 | 0% | ⚪ Aguardando gatilho |
| P2 — Extração lib | R1.3, R3.1, R3.4–R3.10, R3.12–R3.14, D.3, E.1, E.3, A.6, A.3 (final) | 17 | 0 | 0% | ⚪ Aguardando gatilho |
| P3 — Otimizações profundas | R2.3, R2.4, R2.5, A.4 | 4 | 0 | 0% | ⚪ Aguardando gatilho |
| P4 — Builder + refinamentos | B.1, B.2, B.3, F.3, G.2, G.3 | 6 | 0 | 0% | ⚪ Aguardando gatilho |

> Legenda: ⚪ aguardando gatilho · 🔴 não iniciada · 🟡 em andamento · 🟢 concluída

### Checklist por item

#### Runtime — R1 [0/4]

- [ ] **R1.2** Separar `compile()` de `run()` (+ R2.6 embutido)
- [ ] **R1.3** JSDoc em API pública
- [ ] **R1.4** `CalcError` com `code` + `context`
- [ ] **R1.5** Guards de recurso (`maxTokens`, `maxRows`, `maxSteps`, `maxTables`)

#### Runtime — R2 [0/6]

- [ ] **R2.1** Cache de parse Zod no facade
- [ ] **R2.2** Cache de `Decimal.clone` por `(precision, rounding)`
- [ ] **R2.3** Pré-computar `Decimal` de literais no compile
- [ ] **R2.4** Indexar tabelas de faixas numéricas
- [ ] **R2.5** Fundir `resolve + shunting-yard` em uma passada
- [ ] **R2.6** `tablesMap` como `Map` cacheado (cai dentro de R1.2)

#### Runtime — R3 [0/11]

- [ ] **R3.1** Eliminar fallback silencioso (`onInvalidInput`)
- [ ] **R3.4** Validar `conditional` com ≥ 1 branch
- [ ] **R3.5** Documentar semântica de rounding
- [ ] **R3.6** Revisar semântica de `clamp`
- [ ] **R3.7** Tipagem explícita para `paramRef`
- [ ] **R3.8** Extrair `TableRefToken` compartilhado
- [ ] **R3.9** Unificar tipos via `z.infer`
- [ ] **R3.10** Defaults explícitos no schema
- [ ] **R3.12** JSDoc em tipos de domínio + `@example`
- [ ] **R3.13** `README.md` em `lib/runtime/`
- [ ] **R3.14** Documentar `finalValue` e `kind: "output"`

#### App — Camadas A–G [0/15]

- [ ] **A.1** Migrar handler para `compile()+run()` + cache + `runtime = "nodejs"`
- [ ] **A.2** Invalidação do cache (`PATCH`/`DELETE`)
- [ ] **A.3** Handler estruturado de `CalcError` (versão final ou ponte)
- [ ] **A.4** Pré-aquecimento opcional no boot
- [ ] **A.5** Formalizar `outputs` no contrato de response
- [ ] **A.6** Política de `onInvalidInput` no endpoint + consumidores
- [ ] **B.1** Migrar test runner do builder para `compile()+run()`
- [ ] **B.2** Reapontar imports de `validateParens` se necessário
- [ ] **B.3** UI de `paramRef` tipado (`number` | `text`)
- [ ] **D.3** Propagar mudança de `z.infer` chain
- [ ] **E.1** Revisar `EngineSchema` / `schemas/api.ts`
- [ ] **E.3** Padronizar shape de erro no contrato API
- [ ] **F.3** `exportState` usa `compile()` para validação forte
- [ ] **G.2** Script de migração (`scripts/migrate-engines.ts`) se R3.7/R3.10 quebrar engines
- [ ] **G.3** Validação forte no JSON import/export com `compile()`

### Histórico de medições

| Data | Commit/ref | Cenário | `execute()` p99 | `compile()` p99 | `run()` p99 | Notas |
|---|---|---|---|---|---|---|
| 2026-04-20 | `b677d20` (baseline) | Pequeno | 0.896 ms | — | — | baseline, vitest bench 4.1.4 |
| 2026-04-20 | `b677d20` (baseline) | Médio | 1.792 ms | — | — | marginal à meta <1ms |
| 2026-04-20 | `b677d20` (baseline) | Grande | 13.952 ms | — | — | fixture sintético; não representativo |

> Após reativar este plano, preencher linhas adicionais com `compile()` e `run()` p99 isolados, e com cada otimização aplicada.

---

## Changelog

- **2026-04-20** — Documento criado como `RUNTIME_REFACTOR_PERFORMANCE.md`. Consolida todo o escopo de performance do runtime + app em um único doc self-contained, com gatilhos de reativação, baseline de referência, fases de execução, e bloco de progresso embutido. Substitui planos antigos que eram distribuídos entre PLAN/APP/PROGRESS (mantidos agora enxutos apenas com o escopo ativo de branching + features que já foram entregues).
- **2026-04-20** — Validação cruzada PERFORMANCE vs PLAN/APP/PROGRESS/BRANCHING. Escopo 100% coerente — nenhum item órfão. Corrigidos 5 contadores do bloco Progresso: total 35→36, Runtime 18→21 (R3 era 8, real 11), App 17→15, tabela Total 33→36. Nota auto-flagged sobre R3 removida pois ajuste foi aplicado inline.
