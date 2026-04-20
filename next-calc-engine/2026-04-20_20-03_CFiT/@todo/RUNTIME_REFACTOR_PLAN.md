# Runtime Refactor Plan

> Plano de execução detalhado da refatoração e endurecimento da `lib/runtime/` antes de:
> (1) subir sob carga em produção e (2) extrair o pacote como lib independente para ser consumida por um serviço HTTP leve (Express/Fastify) separado da aplicação Next.
>
> **Convenção:** cada item tem checkboxes granulares, racional (“Por quê”), arquivos afetados, risco estimado, e critério de pronto (“Como verificar”). Itens são marcados `- [ ]` pendente e `- [x]` concluído. Mudanças de escopo ou decisões importantes durante a execução vão no **Changelog** no fim deste documento.
>
> **Docs irmãs:**
> - [`RUNTIME_REFACTOR_PROGRESS.md`](./RUNTIME_REFACTOR_PROGRESS.md) — dashboard macro (Parte 1 Runtime + Parte 2 App no mesmo arquivo).
> - [`RUNTIME_REFACTOR_APP.md`](./RUNTIME_REFACTOR_APP.md) — plano complementar cobrindo o lado aplicação Next (API routes, builder, calculator, stores, schemas, migração).

---

## Sumário

- [Contexto & Verdict](#contexto--verdict)
- [Camada 1 — Arquitetura & desenho da lib](#camada-1--arquitetura--desenho-da-lib)
- [Camada 2 — Performance & escalabilidade](#camada-2--performance--escalabilidade)
- [Camada 3 — Robustez, tipos, documentação](#camada-3--robustez-tipos-documentação)
- [Camada 4 — Branching & features](#camada-4--branching--features)
- [Fases de execução (priorização)](#fases-de-execução-priorização)
- [Convenções gerais](#convenções-gerais)
- [Changelog](#changelog)

---

## Contexto & Verdict

### Diagnóstico resumido

A `lib/runtime/` está **bem desenhada conceitualmente**: separação clara entre `schema → decimalFactory → evaluator → execute`, uso correto de `decimal.js` para precisão financeira, Shunting-yard + RPN como algoritmo de avaliação (simples e auditável), trace opt-in via `options.debug` (zero overhead em prod), e entrada validada por Zod (`execute(engine: unknown, ...)`).

### Por que ainda não está pronta para prod em escala ou extração

1. **`execute()` faz trabalho demais por request** — validação Zod, clone do `Decimal`, construção de maps, resolução de defaults. Esse trabalho é 100% repetido quando o mesmo engine é usado por N requests. É o padrão *faltando*: **compile-uma-vez / executa-muitas-vezes**.
2. **Sem guards de recurso** (tamanho de expressão, linhas de tabela, ciclos entre steps) — não é defensivo o suficiente para rodar como serviço público.
3. **Tipos de UI contaminam `types.ts`** (`UIState`, `AppState`, `TestResult`, `EditingNumber`) — impede extração limpa como pacote.
4. **Sem JSDoc nas exports públicas** — UX ruim para consumidores da lib.
5. **Erros como strings PT-BR soltas** — impede routing, i18n, e diferenciação de categoria de erro por parte do consumidor.
6. **Duplicação de tipo/schema mantida à mão** (`z.ZodType<T>`) — pode divergir silenciosamente.
7. **Fallbacks silenciosos** (input inválido vira `0`) — perigoso em motor de cálculo fiscal.

### Verdict

Base técnica sólida — nenhum dos gargalos é estrutural. São dívidas de maturidade. Com as refatorações abaixo, o runtime fica apto para (a) produção sob carga moderada-alta no próprio Next e (b) extração como pacote para um serviço Express/Fastify dedicado.

---

## Camada 1 — Arquitetura & desenho da lib

### 1.1 Remover tipos de UI de `types.ts`

- [ ] Deletar as interfaces `UIState`, `AppState`, `TestResult`, `EditingNumber` de `lib/runtime/types.ts`.
- [ ] `tsc --noEmit` verde.

**Por quê:** a `lib/runtime/` precisa ser agnóstica ao UI. Esses 4 tipos já vivem duplicados em `lib/types.ts` (com as mesmas definições) e os consumidores (`hooks/useEngineState.ts`) já importam de lá. Em `lib/runtime/index.ts` eles **nunca foram re-exportados** — ou seja, hoje são código morto dentro da lib. Remover é apagar linhas; não há consumidores a migrar, não há novo arquivo a criar.

**Arquivos afetados:** `lib/runtime/types.ts` (apenas).

**Risco:** nenhum. Se algum import ainda apontasse pra lá, o TS acusaria — o grep confirma que não existe.

**Como verificar:** `grep -r "from.*@/lib/runtime.*\(UIState\|AppState\|TestResult\|EditingNumber\)"` retorna vazio (já retorna hoje); `tsc --noEmit` verde.

---

### 1.2 Separar `compile()` de `run()` (marco central da refatoração)

- [ ] Criar `lib/runtime/compile.ts` exportando `compile(engine: unknown): CompiledEngine` e o tipo `CompiledEngine`.
- [ ] `compile()` executa: validação Zod (uma vez), construção de `tablesMap`, defaults explícitos, normalização de variáveis, validação estrutural (forward refs, ciclos — itens 3.2 e 3.3), pré-cômputo de literais Decimal (item 2.3).
- [ ] `CompiledEngine` é um objeto imutável carregando: engine validado, tablesMap, função `makeDecimalFactory` (com factory já resolvido do cache — item 2.2), índices pré-construídos, metadados.
- [ ] Criar `lib/runtime/run.ts` exportando `run(compiled: CompiledEngine, inputs: Record<string, string>, options?: RunOptions): ExecuteResult`.
- [ ] `run()` executa apenas o hot-path: resolução de inputs → Decimals, evaluation dos steps, tracing opcional.
- [ ] Adaptar `execute.ts` para ser um **facade** simples: `execute(engine, inputs, opts) = run(compile(engine), inputs, opts)`. Manter a assinatura pública atual 100% compatível.
- [ ] Exportar `compile`, `run`, `CompiledEngine` em `index.ts`.
- [ ] JSDoc completo nos três (`compile`, `run`, `execute`) explicando quando usar cada um.
- [ ] Benchmark comparando `execute()` vs `compile()+run()` repetido (item 2.7) mostrando ganho.

**Por quê:** este é o item de **maior ROI de performance** do plano. Engine típico (30 steps, 5 tabelas) tem 2–10ms só de Zod + construções auxiliares por request. Se o engine é imutável entre requests (caso comum no serviço HTTP), esse custo é desperdício puro. Compile/run permite ganhos de 5–20x em throughput e também viabiliza `runBatch()` futuro.

**Arquivos afetados:** novos `compile.ts`, `run.ts`; reescrita de `execute.ts`; `index.ts`.

**Risco:** médio. A API pública não muda, mas a estrutura interna é substancialmente refatorada. Cobrir com testes antes e depois é o único caminho seguro.

**Como verificar:**
- `execute()` continua retornando o mesmo `ExecuteResult` para os mesmos inputs (snapshot de testes).
- `compile()` chamado uma vez + `run()` N vezes produz resultado idêntico a N `execute()`.
- Benchmark: `compile + run×1000` significativamente mais rápido que `execute×1000`.

#### 1.2.a Anatomia do `CompiledEngine`

`CompiledEngine` é um objeto **em memória** (não um artefato em disco) carregando tudo que o `run()` precisa **sem ter que re-parsear nem re-construir nada**. O shape cresce incrementalmente entre as fases — **Fase 1** entrega a base mínima necessária para `compile()+run()` funcionar; **Fase 3** adiciona os pré-computes que eliminam trabalho do hot-path.

**Versão Fase 1 (mínima — entrega do item 1.2):**

```ts
interface CompiledEngine {
  // dados validados (Zod já rodou)
  readonly engine: EngineState
  readonly config: EngineConfig

  // lookup estruturas (O(1) reads) — inclui 2.6 de graça
  readonly tablesMap: ReadonlyMap<string, CompiledTable>
  readonly variablesMap: ReadonlyMap<string, CompiledVariable>
  readonly stepsMap: ReadonlyMap<string, CompiledStep>

  // decimal factory já cacheado (ver 2.2)
  readonly D: DecimalFactory

  // ordem de execução calculada via topsort (ver 3.2/3.3)
  readonly executionOrder: readonly string[]
  readonly outputStepIds: readonly string[]

  // metadados (debug/introspecção)
  readonly meta: {
    readonly warnings: readonly string[]  // unreachable steps, migrações implícitas, etc.
  }
}
```

Sub-estruturas Fase 1:
- `CompiledStep`: `id`, `name`, `enabled`, `kind` (normalizado via default), `clamp` (normalizado via default), `when` (bruto — Fase 4), `expression: readonly ExpressionToken[]` (tokens originais, **não** pré-parseados), `dependencies: ReadonlySet<string>`.
- `CompiledVariable`: `{ id, defaultValue, valueType, kind }` (defaults resolvidos).
- `CompiledTable`: `columns`, `rows` com valores brutos (não pré-parseados).

**Versão final (Fase 3 — após itens 2.3 e 2.4):**

Campos adicionados:
- `CompiledStep.expression: readonly CompiledToken[]` — tokens com `decimal: Decimal` pré-parseado (item 2.3).
- `CompiledConditionSide`: literais `{ kind: "number", value, decimal: Decimal }` — idem 2.3.
- `CompiledTable.rows`: valores literais pré-parseados por coluna (item 2.3).
- `CompiledTable.rowIndex: RowIndex | null` — estrutura de busca binária para tabelas de faixas (item 2.4).
- `CompiledEngine.meta.indexedTables: ReadonlySet<string>` — IDs das tabelas com índice ativo (item 2.4).

**Chave (Fase 3):** o hot-path do `run()` não faz mais `Zod.parse`, nem `Decimal.clone`, nem `Object.fromEntries`, nem `new Decimal("literal")`. Tudo isso já está pronto.

**Chave (Fase 1):** `run()` ainda faz `new Decimal("literal")` para tokens `number` e valores de tabela; os ganhos de 2.3/2.4 ficam reservados para Fase 3. O que a Fase 1 já entrega: elimina `Zod.parse` repetido, elimina `Decimal.clone` repetido (via 2.2), elimina `Object.fromEntries` repetido (via 2.6 embutido no Map), e calcula `executionOrder` uma vez só (via 3.3).

#### 1.2.b Workflow interno do `compile()`

```
compile(engine) →
  [A] EngineSchema.safeParse        (Zod; defaults aplicados; ZodError se falhar — vira INVALID_ENGINE na Fase 2)
  [B] Construir tablesMap, variablesMap, stepsMap (inclui 2.6)
  [C] Obter D via createDecimalFactory com cache (ver 2.2)
  [D] Análise estática:
        - grafo de dependências (stepRef em expressions + when + conditional)
        - detecção de ciclo  (CYCLE_DETECTED — ver 3.2)
        - topsort estável (calcula executionOrder; tie-break pela ordem do array — ver 3.3)
        - warnings (unreachable steps)
  [E] Guards de recursos estruturais (ver 1.5)  (RESOURCE_LIMIT_EXCEEDED: maxSteps/maxTables/maxRowsPerTable)
  [F] (Fase 3) Pré-computar Decimais de todos os literais (ver 2.3)
  [G] (Fase 3) Indexação de tabelas de faixas numéricas (ver 2.4)
  → retorna CompiledEngine imutável
```

#### 1.2.c Workflow interno do `run()`

```
run(compiled, inputs, options) →
  [1] Resolver inputs → Decimals (respeitando onInvalidInput — ver 3.1)
  [2] Inicializar stepResults: Map<stepId, { value, reason }>
  [3] Para cada step em compiled.executionOrder:
        - if !enabled → marca "disabled", continua
        - if when && !evaluateCondition(when, ctx) → marca "skipped", continua  (ver 4.1)
        - try: val = evaluateExpression(step.expression, ctx)
          - marca "ok"
          - if kind === "output": formata, popula outputs[id], atualiza finalValue
        - catch CalcError: marca "error", registra em steps[]
  [4] Montar ExecuteResult { success, steps, finalValue, outputs, ... }
```

`run()` **não muta** o `CompiledEngine` — cada request constrói seu próprio `stepResults`, `outputs`, `trace`. Imutabilidade garante thread-safety e reuso seguro entre requests.

#### 1.2.d Estratégia de cache em memória (deployment)

`CompiledEngine` **vive em memória do processo Node** — não é serializado em disco, não faz sentido escrever o objeto compilado num arquivo (tem Decimais, Maps, closures). O que existe em disco é o **JSON cru do engine**; o `CompiledEngine` é um **artefato derivado em runtime**.

**Padrão recomendado:** cache em memória no servidor (Next API route ou Express futuro), compartilhado entre todas as requests do mesmo processo.

```ts
// Padrão canônico
const compiledCache = new Map<string, CompiledEngine>()

function getCompiled(engineId: string, loader: () => unknown): CompiledEngine {
  let compiled = compiledCache.get(engineId)
  if (!compiled) {
    compiled = compile(loader())
    compiledCache.set(engineId, compiled)
  }
  return compiled
}

// Handler: User A dispara compile (cache miss), User B reusa (cache hit)
app.post("/calc/:engineId", async (req, res) => {
  const compiled = getCompiled(req.params.engineId, () => loadEngine(req.params.engineId))
  res.json(run(compiled, req.body.inputs))
})
```

Comportamento:
- **Request 1 (User A):** cache miss → `compile()` roda (5–15ms) → guarda → `run()` → responde.
- **Request 2 (User B, mesmo engine):** cache hit → pula `compile()` → `run()` direto → responde em <1ms.
- **Imutabilidade garante segurança:** `run()` não muta `compiled`; User A e User B podem chamar em paralelo sem race conditions.

**Invalidação do cache (quando admin atualizar um engine):** 3 estratégias, em ordem de complexidade:

1. **Invalidação explícita (recomendada pra começar):** endpoint interno `DELETE /cache/:engineId` disparado quando engine é salvo. Simples, eficaz, determinístico.
2. **Versionamento por chave:** cachear por `${engineId}:${version}` — ao salvar uma versão nova, a chave antiga fica órfã e é evictada por LRU.
3. **Hash-based:** chave = hash estável do JSON; qualquer mudança no engine gera chave nova automaticamente.

**Múltiplos processos (cluster/serverless):**
- **Cluster Node** (Next em VM/container com múltiplos workers): cada worker tem seu próprio cache. Aceitável — compile é cheap e pago só na primeira request de cada worker.
- **Serverless (Vercel/Lambda):** cold starts resetam o cache. Estratégia: pagar o `compile` no cold start (aceitável, <15ms) e aproveitar cache durante o "warm" do container.
- **Cache cross-process** (via Redis, etc.): **não recomendado para o `CompiledEngine`** — ele não é serializável de forma trivial. Se precisar, compartilhe apenas o JSON cru e mantenha `compile` local por processo.

**Eviction / memória:**
- `CompiledEngine` consome mais memória que o JSON cru (Decimais pré-computados, Maps, índices). Estimativas: engine pequeno ~50 KB, médio ~500 KB, grande ~2 MB.
- Pra projetos com 100 engines ativos, cache simples (`Map`) basta.
- Pra 10k+ engines, usar LRU com `maxSize`/TTL.

**Pré-aquecimento opcional (boot do servidor):**
```ts
// Antes de começar a aceitar requests, compila tudo que importa
await Promise.all(
  activeEngineIds.map(id => getCompiled(id, () => loadEngine(id)))
)
```

Isso remove a primeira "request cara" de cada engine — paga ~100ms no boot em troca de latência estável desde a primeira request real.

**JSDoc recomendado no `compile()`:**
- Documentar custo (ms típicos).
- Documentar padrão de cache (com exemplo).
- Documentar imutabilidade / thread-safety.
- Documentar que `CompiledEngine` **não é serializável** (avisar consumidores que pensarem em persistir).

---

### 1.3 Documentar API pública com JSDoc (precondição para extração)

- [ ] `index.ts`: cada `export` público recebe JSDoc com `@param`, `@returns`, `@throws`, `@example`.
- [ ] `execute()`: documentar formato de `engine`, contrato de `inputs` (strings, por quê), semântica de retorno, semântica de `finalValue` (último step `kind: "output"`), efeito de `options.debug`.
- [ ] `compile()` / `run()`: documentar contrato de imutabilidade de `CompiledEngine`, thread-safety (OK pois Decimal é imutável), quando cada um é preferível.
- [ ] `createDecimalFactory()` / `DecimalFactory`: documentar semântica de cada método (`add/sub/mul/div/mod/round/clamp/format`), em particular o `precision + 10` interno.
- [ ] `evaluateExpression()` / `EvalContext`: documentar como API de baixo nível (uso avançado), referenciar `execute()` como API recomendada.
- [ ] `EngineSchema`: `@example` com engine mínimo válido.
- [ ] Tipos (`EngineState`, `EngineConfig`, `Variable`, `LookupTable`, `Step`, `ExpressionToken`, `ScalarToken`, `TableCondition`, `TableConditionSide`, `CompareOp`, `RoundingMode`): JSDoc em cada campo com semântica e restrições.

**Por quê:** autocompletion do consumidor hoje é cego. Para uma lib, JSDoc nos exports é o primeiro critério de “profissional vs amador”.

**Arquivos afetados:** `index.ts`, `types.ts`, `execute.ts`, `compile.ts`, `run.ts`, `decimalFactory.ts`, `evaluator.ts`, `schema.ts`.

**Risco:** nenhum (só doc).

**Como verificar:** hover em VS Code sobre cada export mostra JSDoc completo; `typedoc` (opcional) gera doc sem warnings.

---

### 1.4 Introduzir `CalcError` com `code` + `context`

- [ ] Criar `lib/runtime/errors.ts` exportando classe `CalcError extends Error` com propriedades:
  - `code: CalcErrorCode` (union literal: ver abaixo)
  - `context?: Record<string, unknown>` (info estruturada para logging)
  - `message: string` (PT-BR default, mesma semântica atual)
- [ ] Definir `CalcErrorCode`:
  - `INVALID_ENGINE` (validação Zod falhou)
  - `VAR_NOT_FOUND`
  - `STEP_NOT_FOUND`
  - `STEP_DISABLED`
  - `TABLE_NOT_FOUND`
  - `TABLE_NO_ROW_MATCH`
  - `TABLE_NO_COL_MATCH`
  - `TABLE_ROW_NOT_FOUND`
  - `TABLE_COL_NOT_FOUND`
  - `TABLE_CELL_MISSING`
  - `TABLE_PARAM_REQUIRED`
  - `TABLE_PARAM_UNKNOWN`
  - `TABLE_PARAM_OUT_OF_CONTEXT`
  - `DIV_BY_ZERO`
  - `MOD_BY_ZERO`
  - `UNBALANCED_PARENS`
  - `INVALID_EXPRESSION`
  - `NON_FINITE_RESULT`
  - `UNKNOWN_OPERATOR`
  - `EMPTY_EXPRESSION`
  - `CYCLE_DETECTED` (item 3.2)
  - `INVALID_INPUT` (item 3.1)
  - `RESOURCE_LIMIT_EXCEEDED` (item 1.5)
- [ ] Substituir `throw new Error("...")` dentro de `evaluator.ts`, `execute.ts`, `decimalFactory.ts`, `compile.ts`, `run.ts` por `throw new CalcError(CODE, msg, context)`.
- [ ] **Ponte Fase 1 → Fase 2.** Durante a Fase 1, `compile()`/`run()` ainda lançam `Error` com `message` prefixado por `"[CODE] ..."` (ex.: `"[CYCLE_DETECTED] Ciclo entre steps A→B→A"`, `"[RESOURCE_LIMIT_EXCEEDED] Engine excede maxSteps=500"`). O handler do app (`lib/server/handleCalcError.ts` — APP A.3) faz parse desse prefix. Quando este item 1.4 aterrissar (Fase 2), substituir cada `throw new Error("[CODE] ...")` por `throw new CalcError(CODE, msg, context)` in-place. O handler detecta `instanceof CalcError` antes de cair no parse do prefix, então a transição é drop-in — zero regressão no contrato HTTP.

- [ ] Em `execute()`/`run()`, capturar `CalcError` e serializar em `StepResult.error` como string preservando `code` (ex.: `"[DIV_BY_ZERO] Divisão por zero em ..."`) **ou** estender `StepResult` com `errorCode?: CalcErrorCode`.
- [ ] Exportar `CalcError` e `CalcErrorCode` em `index.ts`.
- [ ] JSDoc em `CalcError` com exemplo de tratamento no consumidor.

**Por quê:** erro identificado por string humana em PT-BR não permite i18n, monitoramento por categoria, ou diferenciação programática. Uma lib séria expõe códigos.

**Arquivos afetados:** novo `errors.ts`, todos os arquivos com `throw`, `execute.ts`/`run.ts` (serialização), `index.ts`.

**Risco:** baixo-médio. Precisa garantir que a mensagem PT-BR atual é preservada para evitar regressão de UX.

**Como verificar:** testes de erro continuam passando (mensagens preservadas); consumidor consegue `instanceof CalcError` e checar `.code`; nenhum `throw new Error` sobra em `lib/runtime/` (busca regex).

---

### 1.5 Guards de recursos

- [ ] Adicionar em `EngineConfig` (ou em novo `RunOptions`) limites opcionais configuráveis:
  - `maxTokensPerExpression` (default ex.: `1000`) — **per-expression** (checado em `run()`).
  - `maxRowsPerTable` (default ex.: `10_000`) — **estrutural** (checado em `compile()`).
  - `maxSteps` (default ex.: `500`) — **estrutural** (checado em `compile()`).
  - `maxTables` (default ex.: `100`) — **estrutural** (checado em `compile()`).
- [ ] **Guards estruturais (`maxSteps`/`maxTables`/`maxRowsPerTable`)** são validados em `compile()` e **abortam o engine inteiro** lançando erro com prefix `"[RESOURCE_LIMIT_EXCEEDED] ..."` (Fase 1; vira `CalcError("RESOURCE_LIMIT_EXCEEDED", ...)` na Fase 2). O handler do app mapeia para HTTP 413. Engine nem chega a rodar.
- [ ] **Guard per-expression (`maxTokensPerExpression`)** é validado dentro do loop de steps em `run()`. Step que estoura gera erro **nesse step específico** (preservando a semântica atual de erro-por-step — `steps[i].error` populado, outros steps seguem executando). Não aborta o engine.
- [ ] JSDoc explicando a motivação, defaults e a distinção estrutural vs per-expression.
- [ ] Teste unitário cobrindo cada limite — garantir que estruturais abortam `compile()` e per-expression é localizado em `run()`.

**Por quê:** quando virar serviço HTTP público ou compartilhado, engines maliciosos/acidentalmente gigantes podem travar CPU. Guards explícitos > timeouts implícitos. A distinção estrutural vs per-expression preserva a UX atual: um step "gordo" isolado não derruba os demais; um engine inteiro mal-dimensionado falha cedo antes de rodar.


**Arquivos afetados:** `types.ts`, `schema.ts`, `compile.ts`, `run.ts`.

**Risco:** baixo, desde que defaults sejam generosos (não quebrar engines atuais legítimos).

**Como verificar:** testes unitários com engines sintéticos acima do limite falhando com `RESOURCE_LIMIT_EXCEEDED`; engines reais do projeto passando sem mudança.

---

## Camada 2 — Performance & escalabilidade

### 2.1 Cache de parse Zod por engine

- [ ] Estratégia: `compile()` já valida Zod uma vez; esse item é um **reforço** para o facade `execute(engine, ...)` quando o mesmo objeto JS é reutilizado.
- [ ] Implementar `WeakMap<object, CompiledEngine>` em `execute.ts` — se o mesmo reference é passado, retornar compilado.
- [ ] **Alternativa** (se engine vem como JSON novo a cada request): hash estável (ex.: `fast-json-stable-stringify`) + `LRU<hash, CompiledEngine>` com tamanho configurável (ex.: 32).
- [ ] Documentar no JSDoc de `execute()` que, para serviço HTTP, `compile()` explícito é preferível a confiar no cache.

**Por quê:** validação de `EngineSchema` com `discriminatedUnion` recursivo (`z.lazy`) é caro. Engine imutável = parse único.

**Arquivos afetados:** `execute.ts`.

**Risco:** baixo; cache tem fallback trivial.

**Como verificar:** benchmark mostra `execute()` repetido com mesma referência ≈ `run()` puro.

---

### 2.2 Cache de `Decimal.clone` por `(precision, rounding)`

- [ ] `createDecimalFactory(config)` hoje faz `Decimal.clone({...})` toda vez.
- [ ] Introduzir `Map<string, DecimalConstructor>` com chave `` `${precision}|${rounding}` ``.
- [ ] `createDecimalFactory` consulta o cache antes de clonar.
- [ ] JSDoc explicando que o construtor é cacheado globalmente (thread-safe porque imutável).

**Por quê:** clone de Decimal não é grátis, e combinações de precisão/rounding são finitas e pequenas no mundo real.

**Arquivos afetados:** `decimalFactory.ts`.

**Risco:** mínimo.

**Como verificar:** benchmark mostra `createDecimalFactory` praticamente O(1) após primeira chamada; `Map` inspecionável em dev.

---

### 2.3 Pré-computar Decimal de literais no compile

- [ ] Durante `compile()`, percorrer todas expressões e condições e transformar:
  - `{ type: "number", value: "1.5" }` → `{ type: "number", value: "1.5", decimal: D.from("1.5") }` (campo adicional no token compilado).
  - `{ kind: "number", value: "1000" }` em `TableConditionSide` idem.
  - `defaultValue` das variáveis (pré-parseado, reutilizado se input ausente).
  - `config.min`/`config.max` (usados no `clamp`).
  - Todos os valores literais de `TableRow.values` (por coluna).
- [ ] Criar tipos internos `CompiledExpressionToken`, `CompiledConditionSide` etc. (não exportados, uso apenas do `run`/`evaluator` pós-compile).
- [ ] `evaluator.ts` adaptado para consumir a forma compilada — eliminando `ctx.D.from(token.value)` no hot-path.

**Por quê:** `new Decimal("1000.00")` acontece centenas a milhares de vezes por request em engines reais. É parse + alocação. No compile, cada literal vira um `Decimal` uma vez.

**Arquivos afetados:** `compile.ts`, `evaluator.ts`, tipos internos compilados.

**Risco:** médio. Mexe no tipo consumido pelo evaluator.

**Como verificar:** benchmark mostra redução no tempo de `run()`; snapshot de resultados permanece idêntico.

---

### 2.4 Indexar tabelas de faixas numéricas (busca binária)

- [ ] Durante `compile()`, detectar tabelas “de faixas” — heurística:
  - Todas as linhas (exceto talvez a última default) têm `condition` com padrão estável: mesmo `left` (um `varRef`/`stepRef`), ops em `<`/`<=`/`>=`/`>`, `right` do tipo `number`.
- [ ] Pré-ordenar linhas pelo valor numérico e construir estrutura de busca binária.
- [ ] Na evaluation, `evaluateTableRef` usa o índice quando disponível; fallback para busca linear.
- [ ] Marcar no `CompiledEngine` quais tabelas foram indexadas (util para debug).

**Por quê:** tabelas CNAE, INSS, IR podem ter dezenas a centenas de faixas. Em loop (tabelas parametrizadas chamadas várias vezes), diferença é real.

**Arquivos afetados:** `compile.ts`, `evaluator.ts`.

**Risco:** médio. Heurística pode ser frágil — garantir fallback linear sempre existe.

**Como verificar:** teste unitário cobrindo tabelas de faixas (resultado idêntico); benchmark sintético com 500 linhas mostrando ganho O(log n) vs O(n).

---

### 2.5 Fundir `resolve + shunting-yard` em uma passada

- [ ] Hoje `evaluateExpression` faz 3 passadas: `map(resolveToken)` → shunting-yard → RPN evaluate.
- [ ] Reescrever para uma única passada: resolver token, empurrar direto no stack/RPN conforme tipo.
- [ ] Manter legibilidade — pode continuar em funções nomeadas internamente.
- [ ] **Precondição:** item 2.7 (benchmarks) rodando, pra medir se vale a complexidade.

**Por quê:** reduz alocação intermediária (`items`, `output`). Ganho marginal em expressões curtas, relevante em expressões longas ou loops.

**Arquivos afetados:** `evaluator.ts`.

**Risco:** baixo-médio. Deixa o código um pouco mais denso — só vale se benchmark mostrar.

**Como verificar:** resultado idêntico nos testes; benchmark de expressões grandes melhora.

---

### 2.6 Converter `tablesMap` para `Map` cacheado

- [ ] Substituir `Object.fromEntries(...)` em `execute.ts` por construção de `Map<string, LookupTable>` durante `compile()`.
- [ ] `evaluator.ts` consome via `.get()`.
- [ ] Trivial, feito em conjunto com 1.2.

**Por quê:** `Map` tem lookup marginalmente melhor que object para chaves dinâmicas e evita o `Object.fromEntries` a cada request.

**Arquivos afetados:** `compile.ts`, `evaluator.ts`.

**Risco:** nenhum.

---

### 2.7 Suíte de benchmark (vitest bench)

- [ ] Adicionar `vitest` e `tsx` como devDependencies:
  - `vitest` — usa `tinybench` por baixo e já destrava unit tests futuros sem tooling adicional.
  - `tsx` — roda o script de fixtures em TS direto (sem build step); usado apenas pelo `bench:fixtures`.

- [ ] **Fixtures geradas por script determinístico versionado + saída gitignored** (padrão canônico do projeto):
  - Script: `lib/runtime/__bench__/generate-fixtures.ts` (commitado).
  - Saída: `lib/runtime/__bench__/fixtures/*.json` (gitignored).
  - O commit carrega o gerador; a saída é recriada localmente com `yarn bench:fixtures`.
- [ ] Criar `lib/runtime/__bench__/engine.bench.ts` usando a API `bench()` do vitest.
- [ ] Cenários:
  - **Pequeno:** 5 steps, 0 tabelas.
  - **Médio:** 20 steps, 3 tabelas de 30 linhas.
  - **Grande:** 50 steps, 10 tabelas, algumas com 500+ linhas.
- [ ] Medir: `execute()` (atual), `compile()` isolado, `run()` isolado, `execute()` repetido (mostra overhead repetido).
- [ ] Definir e documentar metas de p99:
  - Pequeno: < 0.2ms
  - Médio: < 1ms
  - Grande: < 5ms
- [ ] Scripts npm:
  - `bench:fixtures` → roda `tsx lib/runtime/__bench__/generate-fixtures.ts` (gera os 3 JSONs em `fixtures/`).
  - `bench` → roda `vitest bench --run` (exibe tabela comparativa).
- [ ] Registrar baseline (antes das otimizações) e target (depois) em `RUNTIME_REFACTOR_PROGRESS.md` → "Histórico de medições".

**Por quê:** sem benchmark, “otimização” é chute. Este item é guard-rail pra regressão e evidência pra decidir quando parar. A escolha por `vitest bench` sobre `tinybench + tsx` evita uma dependência extra (`tsx`), padroniza o runner do projeto caso futuramente sejam adicionados unit tests, e mantém a mesma engine de medição (`tinybench`) sob o capô.

**Arquivos afetados:** `package.json`, `.gitignore` (adicionar `lib/runtime/__bench__/fixtures/`), novo diretório `lib/runtime/__bench__/` com `generate-fixtures.ts` + `engine.bench.ts`.

**Risco:** nenhum.

**Como verificar:** `yarn bench:fixtures && yarn bench` executa e imprime resultados. Fixtures não aparecem no `git status` (gitignored).


---

## Camada 3 — Robustez, tipos, documentação

### 3.1 Eliminar fallback silencioso em input inválido

- [ ] Hoje (`execute.ts:60-64`): `try { D.from(inputs[v.id] ?? v.defaultValue ?? "0") } catch { variables[v.id] = D.from("0") }`.
- [ ] Introduzir `RunOptions.onInvalidInput: "throw" | "zero" | "default"` (default: `"throw"`).
- [ ] `"throw"` → `throw new CalcError("INVALID_INPUT", ...)`.
- [ ] `"zero"` → comportamento atual (silencioso → 0), com warning no trace se `debug`.
- [ ] `"default"` → tenta `defaultValue`, se também falhar, lança.
- [ ] Documentar em JSDoc com exemplo.

**Por quê:** em motor fiscal, `NaN → 0` silencioso é vetor de bug crítico invisível. Comportamento default deve ser explícito (fail-loud).

**Arquivos afetados:** `execute.ts`/`run.ts`, `types.ts` (RunOptions), `errors.ts`.

**Risco:** **breaking change** se o app atual confia no fallback. Mitigação: manter `"zero"` disponível e documentar migração.

**Como verificar:** teste com input `"abc"` lança erro por padrão; teste com `onInvalidInput: "zero"` retorna 0.

---

### 3.2 Detecção de ciclo entre steps

- [ ] Em `compile()`, construir grafo de dependências: nós = stepIds, aresta `A → B` se `A` depende de `B` (ou seja, `A.expression`, `A.when` ou `conditional` branches dentro de `A` contêm `stepRef(B)`).
- [ ] Executar DFS/topsort; ciclo detectado aborta `compile()`.
- [ ] **Erro lançado (Fase 1):** `throw new Error("[CYCLE_DETECTED] Ciclo entre steps A→B→...→A")` — contrato temporário `[CODE]` no `message` enquanto a classe formal não existe. `handleCalcError` (APP A.3) faz parse do prefix e devolve HTTP 422 estruturado.
- [ ] **Erro lançado (Fase 2, após item 1.4):** substituir in-place por `throw new CalcError("CYCLE_DETECTED", "Ciclo entre steps ...", { cycle: [...] })` — o handler detecta `instanceof CalcError` com prioridade sobre o parse de prefix, transição é drop-in.
- [ ] **Ciclos condicionais** (ex.: `A.when = B > 10` e `B.when = A > 10`): detectar como ciclo normal — política conservadora; se o autor quer "ciclo aparente mas impossível em runtime", deve refatorar.

**Por quê:** hoje ciclo quebra em runtime com "Etapa não encontrada" — mensagem enganosa e detecção tardia.


**Arquivos afetados:** `compile.ts`, `errors.ts`.

**Risco:** baixo.

**Como verificar:** teste com engine contendo A→B→A falha no `compile()` com `CYCLE_DETECTED`.

---

### 3.3 Ordenação topológica em `compile()` (ordem de execução calculada)

> **Decisão (2026-04-20):** `run()` itera sobre `compiled.executionOrder` calculado via **topsort** do grafo de dependências (expressões + `when` + `conditional`). Tie-break estável: ordem de declaração no array `engine.steps`. Forward refs **deixam de ser erro** — o topsort reordena.

- [ ] Em `compile()`, após montar o grafo de dependências (ver 3.2), executar topsort estável — quando dois steps não têm dependência entre si, preservar a ordem relativa do array.
- [ ] Expor resultado em `CompiledEngine.executionOrder: readonly string[]` (já declarado em 1.2.a).
- [ ] `run()` itera por `compiled.executionOrder` (não por `compiled.engine.steps`) — ver 1.2.c.
- [ ] O único erro estrutural que resta é **ciclo** (item 3.2). Autor pode declarar steps em qualquer ordem no JSON.
- [ ] JSDoc em `CompiledEngine.executionOrder` explicando: "resultado do topsort; quando não há dependência, respeita a ordem do array como tie-break estável (determinístico entre execuções)".

**Por quê:** engines com `when` + `conditional` produzem fluxos onde a "ordem correta" nem sempre é óbvia pro autor. Deixar a lib resolver via grafo elimina uma classe de bug ("declarei na ordem errada e não sabia") e habilita reorganização livre no builder. Tie-break estável garante determinismo — mesmo engine + mesmos inputs → sempre mesmo resultado (requisito de auditoria fiscal).

**Arquivos afetados:** `compile.ts`, `errors.ts`, `run.ts` (itera por `executionOrder`).

**Risco:** médio. Muda a semântica de ordem (antes = array, agora = topsort). Engines atuais que já estavam em ordem correta continuam funcionando idênticos (topsort preserva ordem de declaração como tie-break). Engines mal ordenados passam a funcionar (antes falhavam em runtime) — isso é fix, não regressão.

**Como verificar:**
- Engine com `stepB` declarado antes de `stepA` mas `stepB` depende de `stepA` → topsort coloca `stepA` primeiro; execução bem-sucedida.
- Engine com ciclo (A depende de B, B depende de A) → `CYCLE_DETECTED`.
- Dois engines com mesmos steps em ordens diferentes no array mas sem dependências entre si → `executionOrder` reflete a ordem do array (tie-break).

---

### 3.4 Validar `conditional` com pelo menos 1 branch

- [ ] Adicionar `.min(1)` em `branches` no `ExpressionTokenSchema` (conditional).
- [ ] Atualizar mensagem de erro.

**Por quê:** conditional sem branches é equivalente a `elseToken` isolado — indica provável erro do autor. Falhar explicitamente.

**Arquivos afetados:** `schema.ts`.

**Risco:** mínimo.

---

### 3.5 Documentar semântica de rounding (por step vs intermediário)

- [ ] No JSDoc de `Step`, `EngineConfig.precision`, `evaluateExpression`: deixar explícito que:
  - Operações intermediárias usam `precision + 10` (do `Decimal.clone`).
  - O resultado **final de cada step** é arredondado para `config.precision` (via `D.round`).
  - Steps downstream consomem o valor **já arredondado** (`stepResults[id]`).
- [ ] Adicionar exemplo mostrando acumulação de arredondamentos (decisão intencional).
- [ ] Referenciar no `README.md` (item 3.13) na seção de semântica.

**Por quê:** decisão de semântica **forte** em cálculo fiscal. Se não for documentada, consumidor interpreta errado e culpa a lib.

**Arquivos afetados:** docstrings em `types.ts`, `evaluator.ts`, `decimalFactory.ts`.

**Risco:** nenhum.

---

### 3.6 Revisar semântica de `clamp` (display-only vs stored)

- [ ] Auditar o código atual: `execute.ts:92` aplica clamp apenas em `displayVal` (`formatted`), mas `stepResults[step.id] = val` armazena o valor **não-clampado**.
- [ ] Decidir com explicitação:
  - **Opção A (atual):** clamp é display-only. Steps downstream veem valor real (não clampado).
  - **Opção B:** clamp afeta o valor armazenado. Steps downstream veem clampado.
- [ ] Documentar a decisão no JSDoc de `Step.clamp`.
- [ ] Se Opção A for mantida, documentar o caso explícito (pode surpreender).
- [ ] Se Opção B for escolhida, ajustar para `stepResults[step.id] = displayVal`.

**Por quê:** inconsistência silenciosa entre “o que vejo” e “o que uso downstream” é armadilha clássica.

**Arquivos afetados:** `execute.ts`/`run.ts`, JSDoc em `types.ts`.

**Risco:** **depende da decisão** — Opção B muda comportamento.

---

### 3.7 Tipagem explícita para `paramRef`

- [ ] Hoje, `resolveConditionSide` em `paramRef` tenta `D.from(value)` e cai pra string no catch — "magia".
- [ ] Estender `LookupTable.parameters` de `string[]` para `Array<{ name: string; type: "number" | "text" }>`.
- [ ] Ajustar `schema.ts` e código que consome `parameters`.
- [ ] No `resolveConditionSide`, usar o tipo declarado em vez de inferir por try/catch.
- [ ] Migração: aceitar a forma antiga (`string[]`) por um período, convertendo para `{ name, type: "number" }` implícito (com warning).

**Por quê:** tipagem explícita > inferência por falha de parsing. Evita bugs sutis (string numérica virar Decimal quando deveria ser comparada como texto, por exemplo).

**Arquivos afetados:** `types.ts`, `schema.ts`, `evaluator.ts`.

**Risco:** médio — breaking se houver engines salvos com a forma antiga. Camada de compat resolve.

---

### 3.8 Extrair `TableRefToken` compartilhado

- [ ] Em `types.ts`, a shape `{ type: "tableRef"; tableId; columnId; rowId?; arguments? }` aparece duplicada em `ScalarToken` e `ExpressionToken`.
- [ ] Mesma duplicação em `schema.ts`.
- [ ] Extrair:
  ```ts
  export interface TableRefToken {
    type: "tableRef"
    tableId: string
    columnId: string | null
    rowId?: string | null
    arguments?: Record<string, TableConditionSide>
  }
  ```
- [ ] Reutilizar em ambos os unions.
- [ ] Mesma extração no Zod schema.

**Por quê:** DRY, alinhamento entre TS e Zod, menos pontos de divergência futura.

**Arquivos afetados:** `types.ts`, `schema.ts`.

**Risco:** nenhum.

---

### 3.9 Unificar tipos via `z.infer` (fonte única de verdade)

- [ ] Decidir a fonte canônica entre TS interfaces e Zod schemas.
- [ ] **Opção A (recomendada):** `z.infer<typeof XxxSchema>` — Zod é fonte de verdade; `types.ts` exporta apenas `z.infer` types e unions derivados. Schema e tipo nunca divergem.
- [ ] **Opção B:** manter interfaces e usar `satisfies` no schema para garantir alinhamento (stricter que `z.ZodType<T>`).
- [ ] Migrar todos os tipos de domínio (`EngineState`, `EngineConfig`, `Variable`, `LookupTable`, `Step`, `TableCondition`, etc).
- [ ] Manter tipos puramente de "runtime do motor" (`ExpressionToken`, `ScalarToken`) também derivados do schema, se viável.
- [ ] Confirmar que consumidores externos (se houver) continuam compilando.

**Por quê:** hoje, um campo adicionado só no schema ou só no tipo TS compila sem erro até explodir em runtime. Fonte única elimina classe inteira de bugs.

**Arquivos afetados:** `types.ts`, `schema.ts`, possivelmente consumidores.

**Risco:** médio — mudança estrutural. `z.infer` pode produzir tipos um pouco diferentes dos interfaces atuais (ex.: opcional virar `| undefined`).

**Como verificar:** `tsc --noEmit` verde; testes passando; diff dos tipos inferidos vs interfaces é revisado manualmente.

---

### 3.10 Defaults explícitos no schema

- [ ] `Variable.kind` default `"input"` — explicitar no schema: `z.enum(["input", "constant"]).default("input")`.
- [ ] `Variable.valueType` default `"number"` — idem: `z.enum(["number", "text"]).default("number")`.
- [ ] `Step.kind` default `"output"` — idem: `z.enum(["internal", "output"]).default("output")`.
- [ ] `Step.clamp` default `false` — idem: `z.boolean().default(false)`.
- [ ] Após parse, consumidores recebem valores concretos (não precisam tratar `undefined`).
- [ ] Ajustar `evaluator.ts` e `execute.ts` removendo `?? "default"` redundantes.

**Por quê:** defaults implícitos obrigam todo consumidor a conhecer a regra. Com `.default()` do Zod, `parsed.data` já vem normalizado.

**Nota sobre `Step.kind = "output"` (2026-04-20):** o comentário atual em `types.ts` já diz *"output if omitted"*, mas `execute.ts:102` faz `if (step.kind === "output")` — ou seja, step sem `kind` hoje **não** vira output (bug silencioso, comentário e código se contradizem). Aplicar `.default("output")` alinha o código com a intenção documentada. **Isto é fix, não breaking**: engines com steps sem `kind` passam a produzir `finalValue` corretamente (e entram em `outputs` — item 4.3). Registrar no Changelog como correção de comportamento.

**Arquivos afetados:** `schema.ts`, `types.ts` (se derivado via `z.infer`), `evaluator.ts`, `execute.ts`.

**Risco:** baixo. Nenhuma migração de dados necessária — a transformação ocorre no parse do Zod.

**Como verificar:** teste verifica que `parse({ ..., variables: [{ id, name, defaultValue }] })` retorna variável com `kind: "input"`, `valueType: "number"`. Teste adicional: engine com step sem `kind` → `finalValue` é o valor desse step, não `null`.

---

### 3.11 Type guards em `ResolvedItem` (remover cast)

- [ ] Hoje `evaluator.ts:287` faz cast: `(opStack[opStack.length - 1] as { kind: "op"; op: string }).op`.
- [ ] Substituir por type guards:
  ```ts
  function isOp(item: ResolvedItem): item is Extract<ResolvedItem, { kind: "op" }> {
    return item.kind === "op"
  }
  ```
- [ ] Usar em todos os lugares onde o cast hoje é feito.

**Por quê:** casts são buracos de tipagem. Type guards mantêm segurança do TS.

**Arquivos afetados:** `evaluator.ts`.

**Risco:** nenhum.

---

### 3.12 JSDoc em toda export pública + `@example`

(Redundante em parte com 1.3; separado para garantir que não esqueça dos tipos de domínio.)

- [ ] `types.ts`: JSDoc em cada interface e em cada campo.
- [ ] `schema.ts`: JSDoc no topo explicando a filosofia (Zod como fonte de verdade, se 3.9 for aplicado).
- [ ] Em cada campo com semântica sutil (`kind: "output"` define finalValue; `columnId: null` ativa 2D; `rowId: null` ativa row-by-condition; `clamp` é display-only), comentário explícito.
- [ ] Rodar `typedoc` local e verificar que docs são geradas sem warnings (opcional, mas recomendável).

**Arquivos afetados:** todos de `lib/runtime/`.

**Risco:** nenhum.

---

### 3.13 `README.md` dentro de `lib/runtime/`

- [ ] Criar `lib/runtime/README.md` com seções:
  - **Visão geral:** o que o runtime faz.
  - **Conceitos:** Engine, Steps, Variables, Tables, Tokens, Conditions.
  - **API pública:** `execute`, `compile`, `run`, `EngineSchema`, `CalcError`.
  - **Semântica importante:** rounding, clamp, order-of-execution, output step, text vs number variables.
  - **Exemplos:**
    1. Cálculo simples (2-3 steps, sem tabela).
    2. Com tabela 1D (lookup por coluna fixa).
    3. Com tabela 2D (row+col por condition).
    4. Com tabela parametrizada.
    5. Uso de `debug: true` e interpretação do trace.
  - **Tratamento de erro:** `CalcError.code` e como rotear.
  - **Performance:** quando preferir `compile()+run()` vs `execute()`.
  - **Roadmap:** referência ao `RUNTIME_REFACTOR_PLAN.md` e estado atual.

**Por quê:** ponto de entrada para qualquer consumidor futuro (humano ou LLM). Sem ele, a lib é uma caixa preta.

**Arquivos afetados:** novo `README.md`.

**Risco:** nenhum.

---

### 3.14 Documentar semântica de `finalValue` e `kind: "output"`

- [ ] No JSDoc de `ExecuteResult.finalValue`: "valor do **último** step com `kind: 'output'` que executou com sucesso (não skipped por `when`). Steps `kind: 'internal'` são ignorados. Se nenhum output executou, é `null`."
- [ ] No JSDoc de `Step.kind`: mesma explicação do lado oposto.
- [ ] Exemplo explícito: engine com múltiplos outputs — `finalValue` pega o último.
- [ ] **Decisão tomada (2026-04-19):** `finalValue` permanece como "último output executado" (retrocompatível). **Adicionalmente expor `outputs: Record<stepId, string | null>`** em `ExecuteResult` com todos os outputs bem-sucedidos (ver item 4.3) — assim consumidores com múltiplos branches têm granularidade.
- [ ] Semântica com branching (Camada 4): em engine com `when`, apenas os outputs no caminho executado aparecem com valor; os skipped aparecem como `null` em `outputs` (ou ausentes, a definir no item 4.3).

**Por quê:** nome `finalValue` sugere "resultado final" (singular) mas o engine permite múltiplos outputs. Com branching (Camada 4), essa ambiguidade piora — expor `outputs` resolve sem quebrar compat.

**Arquivos afetados:** `execute.ts`/`run.ts` (JSDoc), `types.ts` (JSDoc).

**Risco:** nenhum para doc; baixo para adicionar `outputs` (aditivo).

---

## Camada 4 — Branching & features

> Habilita fluxos condicionais entre steps — essencial para cenários com múltiplos regimes (ex.: Simples/Lucro Real), decisões por variável de entrada, e engines com caminhos exclusivos.
>
> **Decisões-chave tomadas (2026-04-19):**
> - **Modelo escolhido:** _filter-based_ (cada step ganha campo opcional `when: TableCondition`) em vez de grafo explícito com arestas. Mudança mínima, retrocompatível, reusa `TableCondition` que já existe.
> - **Política de `stepRef` para step skipped:** lança `CalcError("STEP_SKIPPED")` por padrão (fail-loud). Uso correto: combinar `when` nos steps-branch com `conditional` token no step consumidor para rotear.
> - **Múltiplos outputs:** expor `outputs: Record<stepId, string | null>` em `ExecuteResult`; `finalValue` permanece como "último output executado" (retrocompat).

### 4.1 Estender `Step` com `when?: TableCondition`

- [ ] Em `types.ts`: adicionar campo opcional `when?: TableCondition | null` em `Step`.
- [ ] Em `schema.ts`: `StepSchema` ganha `when: TableConditionSchema.nullable().optional()`.
- [ ] Em `execute.ts`/`run.ts`: **antes** de avaliar `step.expression`, avaliar `step.when` se existir. Se `when` avaliar `false`, pular o step (ver item 4.2 para política do resultado).
- [ ] `when` executa no mesmo contexto da expression: pode usar `varRef`, `stepRef` (para steps já executados), `number`, `text`.
- [ ] `enabled: false` (design-time) tem precedência sobre `when` (se enabled=false, `when` nem é avaliado).
- [ ] Integração com `compile()` (item 1.2): validação de referências e ciclos considerando `when` (ver 3.2 e 3.3).
- [ ] Ao pular, registrar no trace (se debug): `{ type: "step-skip", reason: "when=false", detail: "..." }`.
- [ ] JSDoc completo em `Step.when` explicando semântica, precedência vs `enabled`, e exemplos.

**Por quê:** desbloqueia fluxos como "step A calcula faturamento, step B só executa se tipoEmpresa == 'simples', step C só se 'lucroReal', step D usa `conditional` token para escolher entre B e C". Hoje isso é inviável sem workarounds na expressão.

**Arquivos afetados:** `types.ts`, `schema.ts`, `execute.ts`/`run.ts`, `evaluator.ts` (se passar por aqui), `compile.ts` (validação).

**Risco:** baixo. Campo opcional → engines atuais continuam funcionando sem mudança.

**Como verificar:**
- Teste: step com `when: varX > 10`; input `varX=5` → step skipped; input `varX=20` → step executado.
- Teste: `enabled: false` + `when: true` → step continua skipped.
- Teste: `when` com `stepRef` a um step skipped → conforme política do item 4.2.

---

### 4.2 Política de `stepRef` / `when` referenciando step skipped

- [ ] Decisão tomada: **fail-loud por padrão**. `stepRef(S)` onde S foi skipped por `when: false` lança `CalcError("STEP_SKIPPED", { stepId: S })`.
- [ ] Implementar: em `stepResults`, step skipped guarda marcador distinto de step desabilitado — `{ value: null, reason: "skipped" | "disabled" | "error" }` (internamente).
- [ ] `evaluator.ts` ao resolver `stepRef` para um alvo com `reason === "skipped"`: lançar `STEP_SKIPPED`.
- [ ] Para steps **desabilitados** (enabled: false): manter comportamento atual (`STEP_DISABLED`).
- [ ] **Escape hatch:** permitir `conditional` token consumir o resultado sem explodir — avaliar condições primeiro, só resolver o `stepRef` da branch matched. Isso já é o comportamento atual do `conditional`, mas garantir que a branch que *não* é matched não seja resolvida (lazy evaluation).
- [ ] Documentar padrão recomendado no README: "para branching entre steps, use `when` nos steps-branch e `conditional` token no step consumidor para rotear explicitamente".
- [ ] Opcional futuro: flag `RunOptions.onSkippedStepRef: "throw" | "null"` para casos onde propagação silenciosa é desejada. **Não implementar agora** — abrir issue se demanda aparecer.

**Por quê:** step skipped referenciado diretamente é quase sempre bug (autor esqueceu de rotear via `conditional`). Fail-loud evita silent-wrong-result.

**Arquivos afetados:** `evaluator.ts`, `execute.ts`/`run.ts`, `errors.ts` (novo código `STEP_SKIPPED`), `types.ts` (estrutura interna de `stepResults`).

**Risco:** médio — exige garantir que `conditional` faz lazy evaluation corretamente (só avalia a branch matched). Teste rigoroso aqui.

**Como verificar:**
- Teste: `stepRef(S)` direto com S skipped → erro `STEP_SKIPPED`.
- Teste: `conditional` com 2 branches, uma aponta pra step skipped, condição escolhe a outra → OK, não lança.
- Teste: `conditional` que escolhe branch com step skipped → lança `STEP_SKIPPED`.

---

### 4.3 Expor `outputs: Record<stepId, string | null>` em `ExecuteResult`

- [ ] Estender `ExecuteResult`:
  ```ts
  interface ExecuteResult {
    success: boolean
    steps: StepResult[]
    finalValue: string | null
    outputs: Record<string, string | null>  // ← NOVO
    error?: string
    validationErrors?: ...
  }
  ```
- [ ] `outputs` é populado com todo step `kind: "output"` que executou com sucesso; chave = `step.id`, valor = `formatted` (string). Steps skipped/erro: valor = `null` (ou omitir — a decidir).
- [ ] `finalValue` permanece inalterado (retrocompat): último output executado.
- [ ] JSDoc detalhado no `ExecuteResult` explicando a relação entre `outputs` e `finalValue`.
- [ ] Teste: engine com 3 outputs, 1 skipped por `when` → `outputs` tem 2 chaves populadas + 1 null (ou ausente); `finalValue` é o último dos 2 que rodou.

**Por quê:** com branching, o consumidor raramente se satisfaz com "último output". Query por ID é o natural. Aditivo, zero breaking.

**Arquivos afetados:** `execute.ts`/`run.ts`, `types.ts` (tipo `ExecuteResult`).

**Risco:** mínimo (aditivo).

**Decisão pendente:** steps output skipped aparecem em `outputs` com valor `null` ou são omitidos do objeto? **Sugestão:** aparecer como `null` — permite consumidor iterar por todos os outputs conhecidos e saber quais foram skipped. Confirmar na implementação.

---

### 4.4 Documentar branching no `README.md`

(Complementa o item 3.13.)

- [ ] Nova seção "Branching entre steps" no `README.md` da lib com:
  - Explicação conceitual do modelo `when`.
  - Exemplo completo: engine com 3 regimes de cálculo (ex.: Simples/Lucro Presumido/Lucro Real), selecionado por variável `tipoEmpresa`.
  - Padrão recomendado: `when` nos steps-branch + `conditional` token no step consumidor.
  - Anti-padrões: `stepRef` direto para step com `when` (vai quebrar se condição falhar).
  - Política de erro (`STEP_SKIPPED`), como lidar.
  - Trace em debug mode exibindo step-skips.

**Arquivos afetados:** `README.md`.

**Risco:** nenhum.

---

### 4.5 Cenário de benchmark com branching

(Complementa o item 2.7.)

- [ ] Adicionar cenário "branching intenso" na suíte de benchmark:
  - Engine com 30+ steps, metade tendo `when` baseado em variável de entrada.
  - Variações de input que ativam diferentes caminhos.
- [ ] Medir overhead de avaliar `when` vs não ter `when` (baseline).
- [ ] Confirmar que skip de step é O(1) após avaliar `when` (não avalia expression).
- [ ] Meta: overhead de `when` deve ser comparável ao custo de uma avaliação de `conditional` simples (< 50μs por step).

**Arquivos afetados:** `lib/runtime/__bench__/engine.bench.ts`.

**Risco:** nenhum.

---

## Fases de execução (priorização)

Cada fase tem um critério de entrada (o que precisa estar feito) e um critério de saída (o que precisa estar comprovado). A cada fase, atualizar `RUNTIME_REFACTOR_PROGRESS.md` (Parte 1 — Runtime).

### Fase 1 — Pré-produção (prioridade máxima)

**Objetivo:** tornar o runtime apto para carga moderada no Next sem regressão.

**Ordem de execução recomendada (não é ordem numérica — é cronológica):**

1. **1.1** — Remover tipos de UI (delete puro, 18 linhas mortas; baseline verde no build).
2. **3.11** — Type guards em `ResolvedItem` (mecânico, sem impacto em hot path).
3. **2.7** — **BASELINE OBRIGATÓRIO.** Instalar `vitest` + `tsx` como devDeps (`vitest` roda a suite de bench via `tinybench`; `tsx` roda o script de fixtures em TS sem build step), escrever os 3 cenários com `bench()`, rodar `yarn bench:fixtures && yarn bench` contra a lib **pré-refactor**, registrar números brutos em `RUNTIME_REFACTOR_PROGRESS.md` → "Histórico de medições". Sem baseline, otimização vira chute.


4. **2.2** — Cache de `Decimal.clone` (re-rodar bench, comparar com baseline).
5. **1.2** — `compile()` + `run()` (marco central; inclui 2.6 de graça; re-rodar bench comparando `execute()` facade vs `compile+run×N`).
6. **2.6** — `tablesMap` como `Map` (cai dentro de 1.2).
7. **3.2** + **3.3** — Detecção de ciclo e ordenação topológica (mesma análise de grafo; bench de sanidade — não esperamos ganho, só regressão zero).
8. **1.5** — Guards de recursos (bench de sanidade).

Todos os itens listados abaixo fazem parte da Fase 1 (mesma lista, só em ordem numérica pro checkbox):

- [ ] 1.1 — Remover tipos de UI de `types.ts`
- [ ] 1.2 — Separar `compile()` de `run()`
- [ ] 1.5 — Guards de recursos
- [ ] 2.2 — Cache de `Decimal.clone`
- [ ] 2.6 — `tablesMap` como `Map` (feito junto de 1.2)
- [ ] 2.7 — Suíte de benchmark (baseline registrado)
- [ ] 3.2 — Detecção de ciclo
- [ ] 3.3 — Ordenação topológica (`executionOrder` calculado pelo topsort)
- [ ] 3.11 — Type guards em `ResolvedItem`

**Critério de saída:** benchmark do cenário médio < 1ms p99, grande < 5ms p99; smoke test via bruno (`bruno/calc/*` e `bruno/flows/calc/*`) passando; app Next rodando normalmente; baseline **e** resultado pós-refactor registrados em `RUNTIME_REFACTOR_PROGRESS.md`.

---

### Fase 2 — Pré-extração como lib

**Objetivo:** permitir extração limpa como pacote independente consumível por serviço HTTP.

- [ ] 1.3 — JSDoc em API pública
- [ ] 1.4 — `CalcError` com `code` + `context`
- [ ] 3.1 — Eliminar fallback silencioso em input inválido
- [ ] 3.4 — Validar `conditional` com ≥1 branch
- [ ] 3.5 — Documentar semântica de rounding
- [ ] 3.6 — Revisar semântica de `clamp`
- [ ] 3.8 — Extrair `TableRefToken`
- [ ] 3.9 — Unificar tipos via `z.infer`
- [ ] 3.10 — Defaults explícitos no schema
- [ ] 3.12 — JSDoc completo nos tipos de domínio
- [ ] 3.13 — `README.md` em `lib/runtime/`
- [ ] 3.14 — Documentar `finalValue`

**Critério de saída:** qualquer consumidor externo (simulado por um script isolado) consegue importar de `lib/runtime/` sem arrastar código do Next; docs completas; CalcError exposto e testado.

---

### Fase 3 — Otimização guiada por benchmark

**Objetivo:** ganhos incrementais baseados em medição, não em chute.

- [ ] 2.1 — Cache de parse Zod por engine (via `execute()` facade)
- [ ] 2.3 — Pré-computar Decimal de literais no compile
- [ ] 2.4 — Indexar tabelas de faixas numéricas
- [ ] 2.5 — Fundir resolve + shunting-yard em uma passada
- [ ] 3.7 — Tipagem explícita para `paramRef`

**Critério de saída:** cada item ativado + medido; se benchmark não melhorar, item é revertido com nota no Changelog explicando por quê.

---

### Fase 4 — Branching & features

**Objetivo:** habilitar fluxos condicionais entre steps.

**Pré-requisitos:** Fase 1 concluída (precisa do `compile()` do item 1.2 para validar `when`; precisa de `CalcError` do item 1.4 para o novo código `STEP_SKIPPED`).

- [ ] 4.1 — Estender `Step` com `when?: TableCondition`
- [ ] 4.2 — Política de `stepRef` para step skipped (`STEP_SKIPPED` + `conditional` lazy)
- [ ] 4.3 — Expor `outputs: Record<stepId, string | null>` em `ExecuteResult`
- [ ] 4.4 — Documentar branching no `README.md`
- [ ] 4.5 — Cenário de benchmark com branching

**Critério de saída:** engine de exemplo com 3 regimes de cálculo executando corretamente cada caminho; testes cobrindo todos os edge-cases de `stepRef` para skipped; benchmark mostra overhead de `when` dentro do orçamento.

---

## Convenções gerais

- Todo commit referencia o item: `runtime: 1.2 separar compile de run`.
- Mudanças breaking sempre com entrada no Changelog + seção de migração no README.
- Nenhum `throw new Error` remanescente em `lib/runtime/` após Fase 2.
- Zod schema é o contrato público (se Fase 2 → 3.9 for aplicado).
- Verificação padrão = **smoke test via bruno** (`bruno/calc/*` e `bruno/flows/calc/*`). O projeto não tem suite de unit tests automatizados — critérios de "testes verdes" significam "bruno passando + revisão manual de snapshot JSON quando aplicável".
- Antes de começar qualquer item, revisitar o racional do item — se mudou de ideia, atualizar este documento + Changelog primeiro.
- Progresso de execução vive em [`RUNTIME_REFACTOR_PROGRESS.md`](./RUNTIME_REFACTOR_PROGRESS.md) (Parte 1 — Runtime). Alterações no app vivem em [`RUNTIME_REFACTOR_APP.md`](./RUNTIME_REFACTOR_APP.md) e seu progresso na Parte 2 do mesmo PROGRESS.

---

## Changelog

> Registro de decisões, desvios, e descobertas durante a execução.

- **2026-04-19** — Documento criado. Baseline identificado:
  - Runtime conceitualmente sólido (decimal.js + shunting-yard + Zod + trace opt-in).
  - 7 dívidas estruturais a endereçar antes de prod/extração.
  - 3 fases planejadas; Fase 1 tem o maior ROI (item 1.2).
  - Sem benchmark ainda — primeiro entregável de medição é item 2.7.

- **2026-04-19** — Adicionada **Camada 4 — Branching & features** e **Fase 4**. Decisões:
  - **Modelo escolhido:** _filter-based_ (`Step.when?: TableCondition`) em vez de grafo explícito. Mudança mínima, retrocompat, reusa `TableCondition`.
  - **Política de `stepRef` para step skipped:** `CalcError("STEP_SKIPPED")` por padrão (fail-loud). Combinar com `conditional` token (avaliação lazy) para rotear entre branches.
  - **Múltiplos outputs:** expor `outputs: Record<stepId, string | null>` em `ExecuteResult`. `finalValue` permanece como "último output executado" (retrocompat).
  - Itens 3.2, 3.3 e 3.14 ganharam notas cruzando com 4.1 (considerar `when` em dependências, forward-refs e finalValue).
  - Fase 4 depende da Fase 1 (precisa de `compile()` e `CalcError`).

- **2026-04-19** — Aprofundamento do item **1.2** com 4 subseções novas (1.2.a–d):
  - **1.2.a Anatomia do `CompiledEngine`** — shape do objeto imutável, sub-estruturas (`CompiledStep`, `CompiledToken`, `CompiledTable`).
  - **1.2.b Workflow do `compile()`** — etapas A–G (Zod parse → maps → factory → pré-compute → análise estática → indexação → guards).
  - **1.2.c Workflow do `run()`** — etapas 1–4 (inputs → stepResults → loop de steps com when/enabled/try/catch → monta ExecuteResult).
  - **1.2.d Estratégia de cache em memória** — `CompiledEngine` **não é arquivo em disco**; vive em memória do processo; padrão canônico de cache (`Map<engineId, CompiledEngine>`); invalidação (explícita / versão / hash); múltiplos processos; serverless; eviction; pré-aquecimento no boot; aviso sobre não-serializabilidade.
  - Motivação: registrar o fundamento do item 1.2 pra qualquer pessoa (Barney, outro dev, futuro LLM) entender o "porquê" sem precisar reler a conversa original.

- **2026-04-19** — **Reorganização de arquivos.** Os docs de refactor saíram de `lib/runtime/` e foram para `@todo/` com prefixo padronizado:
  - `lib/runtime/REFACTOR_PLAN.md` → `@todo/RUNTIME_REFACTOR_PLAN.md`
  - `lib/runtime/REFACTOR_PROGRESS.md` → `@todo/RUNTIME_REFACTOR_PROGRESS.md`
  - Criado `@todo/RUNTIME_REFACTOR_APP.md` como plano complementar cobrindo o lado aplicação Next (API routes, builder, calculator, stores, schemas, migração de dados).
  - O PROGRESS passou a ser **unificado em dois blocos** no mesmo arquivo: Parte 1 (Runtime — antigos contadores/tabelas) + Parte 2 (App — camadas A–G do APP doc). Sem arquivo de progresso separado para o APP.
  - Cross-references atualizadas nos três documentos.

- **2026-04-20** — **Ordem de execução explícita na Fase 1.** Adicionada sequência cronológica recomendada na seção "Fase 1" do plano:
  1. `1.1` + `3.11` primeiro (delete/mecânico, zero impacto em perf).
  2. `2.7` em seguida para registrar **baseline obrigatório** contra a lib pré-refactor. Sem baseline, otimização vira chute.
  3. Otimizações (`2.2`, `1.2` + `2.6`) rodam depois do baseline, cada uma re-medindo.
  4. Itens estruturais sem ganho esperado (`3.2`, `3.3`, `1.5`) viram bench de sanidade ao final.
  Motivação: PROGRESS.md já tinha uma tabela "Histórico de medições" vazia, mas não havia cronograma explícito que obrigasse a preencher o baseline ANTES das otimizações. Sem isso, medir ganho post-hoc é impossível.

- **2026-04-20** — **Decisões de execução da Fase 1** (pré-código, após revisão com Barney):
  - **2.7 tooling.** Bench rodará via `tsx` (devDep) em vez de `node --experimental-strip-types`, para não depender de Node 24 em pipelines futuras. Fixtures dos 3 cenários (pequeno/médio/grande) são **geradas por script determinístico** (`lib/runtime/__bench__/generate-fixtures.ts`) e gravadas em `lib/runtime/__bench__/fixtures/*.json` **gitignored**. Esse padrão (script gerador versionado + saída gitignored) passa a ser o canônico do projeto para mocks/benchs grandes no futuro. Scripts npm: `bench:fixtures` e `bench`.
  - **1.2 escopo Fase 1 restrito.** `CompiledEngine` na Fase 1 carrega apenas `{ engine, config, tablesMap: Map, D, executionOrder, variables: { defaults, valueType } }`. **Não** inclui pré-compute de literais `Decimal` (2.3) nem indexação de tabelas (2.4) — esses entram só na Fase 3. Objetivo da Fase 1 é entregar o marco compile/run com caches triviais (2.2, 2.6) + análise estática (3.2, 3.3, 1.5), sem reescrever o evaluator.
  - **3.2 código de erro sem `CalcError` formal.** `CalcError` é Fase 2 (item 1.4). Até lá, ciclos lançam `Error` com mensagem prefixada `"[CYCLE_DETECTED] ..."` — o prefix `[CODE]` em `err.message` é contrato temporário até a classe formal existir. `app/api/calc` consome isso via `handleCalcError` (APP A.3) que faz parse do prefix. Quando a Fase 2 aterrissar, `throw new CalcError("CYCLE_DETECTED", ...)` substitui in-place sem quebrar o handler (handler detecta `instanceof CalcError` com prioridade, fallback para parse do prefix).
  - **1.5 per-expression guard localizado.** `maxTokensPerExpression` é checado dentro do loop de steps em `run()`. Step que estoura gera erro nesse step específico (preservando semântica atual de erro-por-step — `steps[i].error` populado, outros steps seguem). `maxSteps`/`maxTables`/`maxRowsPerTable` são estruturais e lançam em `compile()` com prefix `[RESOURCE_LIMIT_EXCEEDED]`.

- **2026-04-20** — **Revisão crítica do plano** (pré-execução). Ajustes aplicados a partir de auditoria cruzando os 3 docs com o código real:
  - **1.1 simplificado.** Os 4 tipos UI (`UIState`, `AppState`, `TestResult`, `EditingNumber`) em `lib/runtime/types.ts` **nunca foram re-exportados** em `index.ts` e já vivem duplicados em `lib/types.ts` com seus únicos consumidores apontando pra lá. O item virou "deletar 18 linhas mortas". D.1 e D.2 no APP viraram no-op.
  - **3.3 reescrito (Opção B — topsort).** Decisão: `run()` itera sobre `compiled.executionOrder` calculado via topsort do grafo de dependências (expressões + `when` + `conditional`), com tie-break estável pela ordem do array. Forward refs **deixam de ser erro** — o topsort reordena. Só ciclo (3.2) permanece como erro estrutural. Racional: engines com `when`/`conditional` produzem fluxos onde "ordem correta" nem sempre é óbvia; lib resolve, autor não precisa reordenar manualmente no builder.
  - **3.10 — nota sobre `Step.kind` default.** Comentário em `types.ts` já dizia *"output if omitted"*, mas `execute.ts:102` testa `step.kind === "output"` literal. Step sem `kind` não virava output. Aplicar `.default("output")` é **fix** (alinha código com intenção documentada), não breaking.
  - **APP A.1 — nota de runtime nodejs.** Cache `Map` module-scope depende de `runtime = "nodejs"` (edge runtime recria isolate). Rota deve declarar explicitamente.
  - **APP novo A.6 — política de `onInvalidInput` no endpoint.** Runtime 3.1 muda default para `throw`; endpoint/builder/calculator precisam tratar `CalcError("INVALID_INPUT")` explicitamente (antes estavam sem contraparte).
  - **Convenções gerais:** "testes verdes" substituído por "smoke test via bruno" — não existe suite de unit tests no projeto, verificação padrão é bruno + snapshot manual.

- **2026-04-20** — **Consolidação corpo-vs-Changelog + swap de tooling de bench.** Barney identificou que várias decisões registradas em Changelog ainda não estavam refletidas no corpo principal dos documentos — a filosofia do projeto é que o **corpo é sempre a solução final**, Changelog é apenas histórico de como chegamos lá. Ajustes aplicados ao corpo do PLAN.md:
  - **1.2.a** — shape do `CompiledEngine` explicitamente dividido em "Versão Fase 1 mínima" (sem pré-compute 2.3 nem índice 2.4) vs "Versão final Fase 3". Chaves Fase 1 e Fase 3 documentadas separadamente.
  - **1.2.b** — workflow do `compile()` mostra agora `[F]` e `[G]` marcados como `(Fase 3)`; `ZodError` é anotado "vira INVALID_ENGINE na Fase 2". `FORWARD_REF` removido do fluxo (topsort reordena em vez de falhar).
  - **1.4** — `FORWARD_REF` **removido do enum `CalcErrorCode`** (3.3 virou topsort estável, não há mais erro dedicado de forward ref). Adicionada subseção "Ponte Fase 1 → Fase 2" no corpo explicando o contrato temporário `"[CODE] ..."` no `message` e a transição drop-in para `CalcError` quando o item 1.4 aterrissar.
  - **1.5** — corpo agora distingue explicitamente **guards estruturais** (`maxSteps`/`maxTables`/`maxRowsPerTable` — validados em `compile()`, abortam o engine inteiro) vs **guard per-expression** (`maxTokensPerExpression` — validado em `run()`, erro localizado no step que estoura, outros steps seguem). Antes essa distinção estava só no Changelog.
  - **2.7** — **tooling trocado de `tinybench + tsx` para `vitest bench`** (`vitest` usa `tinybench` por baixo, evita a devDep `tsx`, padroniza runner do projeto pra eventuais unit tests futuros). Corpo agora documenta o padrão canônico de fixtures: script determinístico `generate-fixtures.ts` versionado + saída em `fixtures/*.json` gitignored. Scripts npm: `bench:fixtures` (`tsx generate-fixtures.ts`) e `bench` (`vitest bench --run`).
  - **3.2** — corpo agora documenta explicitamente o par Fase 1 (`throw new Error("[CYCLE_DETECTED] ...")`) / Fase 2 (`throw new CalcError("CYCLE_DETECTED", ...)`) em vez de só mencionar `CalcError` como se já existisse na Fase 1.
  - **Fase 1 ordem cronológica** — passo 3 atualizado para refletir `vitest` em vez de `tinybench` no comando de baseline.
  - Motivação: se o corpo estivesse desatualizado, um leitor novo (LLM ou humano) implementaria a versão errada. Agora corpo = decisão final, Changelog = trilha de auditoria.

- **2026-04-20** — **`tsx` declarado como devDep explícita em 2.7.** Durante validação cruzada dos 7 docs (PLAN + APP + PROGRESS + 4 prompts), Barney notou que o item 2.7 mencionava `tsx` apenas no script npm `bench:fixtures` (`tsx lib/runtime/__bench__/generate-fixtures.ts`) mas não declarava a instalação como devDep. O swap anterior (tinybench+tsx → vitest bench) tirou `tsx` do runner de bench, mas o script gerador de fixtures **continua** precisando dele. Ajuste: corpo de 2.7 agora lista `vitest` + `tsx` como devDeps separadamente com o racional de cada um; item 3 da ordem cronológica da Fase 1 idem; PROMPT_FASE_1 (passo 3) atualizado no mesmo espírito. Zero mudança semântica — só deixa explícita uma dependência que estava implícita no comando do script.


