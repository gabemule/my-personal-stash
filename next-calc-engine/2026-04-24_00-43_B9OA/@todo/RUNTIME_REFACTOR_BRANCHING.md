# Runtime Branching Refactor — Plano completo

> Plano **self-contained** para habilitar fluxos condicionais entre steps na `lib/runtime/`. Este é o escopo **ativo** da refatoração em 2026-04-20 — entrega incremental direto sobre o `execute()` atual, sem depender de `compile()+run()` nem de `CalcError` formal (ambos deferidos em `RUNTIME_REFACTOR_PERFORMANCE.md`).
>
> **Pressuposto de leitura:** quem executar este plano pode não ter contexto da história anterior. Tudo que importa — decisões já batidas, racional, escopo, ordem de execução, critério de pronto e progresso — vive neste arquivo. Não há dependência cruzada com outros documentos para **executar**. Os docs antigos (`RUNTIME_REFACTOR_PLAN.md`, `RUNTIME_REFACTOR_APP.md`, `RUNTIME_REFACTOR_PROGRESS.md`, `RUNTIME_PROMPT_FASE_*.md`) ficam em `@todo/` por um tempo **apenas como referência cruzada** até o conteúdo aqui ser validado — depois serão removidos.

---

## Sumário

- [Contexto](#contexto)
- [Decisões-chave (já batidas, entram aqui como fato)](#decisões-chave-já-batidas-entram-aqui-como-fato)
- [Pré-requisitos](#pré-requisitos)
- [Escopo de execução](#escopo-de-execução)
  - [B.1 — Detecção de ciclo entre steps](#b1--detecção-de-ciclo-entre-steps)
  - [B.2 — Ordenação topológica estável (`executionOrder`)](#b2--ordenação-topológica-estável-executionorder)
  - [B.3 — `Step.when?: TableCondition`](#b3--stepwhen-tablecondition)
  - [B.4 — Política `STEP_SKIPPED` + `conditional` lazy](#b4--política-step_skipped--conditional-lazy)
  - [B.5 — `outputs: Record<stepId, string | null>`](#b5--outputs-recordstepid-string--null)
  - [B.6 — Cenário de benchmark com branching](#b6--cenário-de-benchmark-com-branching)
  - [B.7 — Documentação (README + JSDoc)](#b7--documentação-readme--jsdoc)
- [Ordem de execução (cronológica)](#ordem-de-execução-cronológica)
- [Convenções & contrato de erros](#convenções--contrato-de-erros)
- [Critério de saída global](#critério-de-saída-global)
- [Atualizações correlatas no app](#atualizações-correlatas-no-app)
- [Progresso](#progresso)
- [Changelog](#changelog)

---

## Contexto

### O que o runtime faz hoje

`lib/runtime/` expõe `execute(engine: unknown, inputs, options) → ExecuteResult`. Internamente:

1. Valida o engine via Zod (`EngineSchema.safeParse`).
2. Constrói contexto por request: `tablesMap` (via `Object.fromEntries`), decimal factory, resolução de `inputs` → `Decimal`.
3. Itera sobre `validEngine.steps` **na ordem do array**. Cada step:
   - Se `!enabled` → marca disabled, continua.
   - Avalia `step.expression` via shunting-yard + RPN.
   - Aplica `precision` (arredondamento) e `clamp` (display-only), popula `stepResults[id]`.
   - Se `kind === "output"` (string literal), atualiza `finalValue`.
4. Monta `ExecuteResult` com `success`, `steps[]`, `finalValue`.

**Erros:** `throw new Error("mensagem PT-BR")`. Sem contrato de código. Handler HTTP no app tem que parsear mensagens por substring. Isso será melhorado no plano PERFORMANCE via `CalcError`; aqui, adotamos o **contrato intermediário de prefix `"[CODE] ..."`** no `message` para códigos novos introduzidos por este plano.

### O que falta para branching

- **Nenhuma forma de pular um step condicionalmente em runtime.** A única "pulagem" hoje é `enabled: false` (design-time, opt-out permanente no builder).
- **Autor precisa declarar steps na ordem correta** manualmente. Forward ref (step A referencia step B declarado depois) hoje explode em runtime com `"Etapa não encontrada: B"` — mensagem enganosa, detecção tardia.
- **Ciclos entre steps** não são detectados estruturalmente. Se A depende de B e B depende de A, a primeira avaliação falha no meio com `"Etapa não encontrada"` — mesmo sintoma do forward ref.
- **`ExecuteResult.finalValue` retorna só o último output.** Engines com múltiplos outputs em branches diferentes não têm como o consumidor consultar outputs específicos.

---

## Decisões-chave (já batidas, entram aqui como fato)

Estas decisões foram tomadas em discussões anteriores (2026-04-19) e aterrissam neste doc como ponto de partida — não são mais abertas a debate, só a execução.

### 1. Modelo _filter-based_ (`Step.when?: TableCondition`)

**Decisão:** cada step recebe um campo opcional `when: TableCondition` que é avaliado antes de `expression`. Se `when` retorna `false`, o step é **skipped** (não executa expression, não popula `stepResults[id]` com valor).

**Por que não modelo de grafo explícito (nós + arestas):** mudança mínima, retrocompatível, reusa `TableCondition` que já existe para condições de tabelas. Engines atuais (sem `when`) continuam funcionando sem mudança.

### 2. Política `STEP_SKIPPED` fail-loud

**Decisão:** `stepRef(S)` direto para um step `S` skipped por `when: false` **lança erro** `"[STEP_SKIPPED] ..."` — fail-loud por padrão.

**Por que fail-loud:** `stepRef` direto para skipped é quase sempre bug (autor esqueceu de rotear via `conditional`). Silent-wrong-result em motor fiscal = dívida crítica invisível.

**Escape hatch:** o token `conditional` tem **avaliação lazy** — só resolve o `stepRef` da branch **matched**. Branches não-matched nunca tocam os steps skipped.

### 3. `conditional` com avaliação lazy

**Decisão:** `conditional` avalia as `TableCondition` das branches **primeiro**; apenas a branch matched tem seu resultado resolvido. Branches não-matched podem referenciar steps skipped sem explodir.

Isso **já é o comportamento esperado** do `conditional`, mas este plano garante e cobre com testes.

### 4. Múltiplos outputs → `outputs: Record<stepId, string | null>`

**Decisão:** `ExecuteResult` ganha `outputs` — record com todos os outputs do engine:
- Chave: `step.id` de todo `Step` com `kind: "output"`.
- Valor: `formatted` (string) se executou com sucesso; `null` se skipped/desabilitado/erro.

`finalValue` **permanece inalterado** (retrocompat): último output executado.

### 5. Ordenação topológica estável + tie-break pela ordem do array

**Decisão:** `execute()` itera sobre uma `executionOrder` calculada via topsort do grafo de dependências (`stepRef` em `expression`, `when`, branches de `conditional`). Forward refs **deixam de ser erro** — o topsort reordena.

**Tie-break estável:** quando dois steps não têm dependência entre si, preserva a ordem de declaração no array `engine.steps`. Determinístico entre execuções (requisito de auditoria fiscal).

**Único erro estrutural que sobra:** ciclo (B.1).

### 6. Sem `compile()` separado, sem `CalcError` formal

**Decisão:** análise estática (ciclo + topsort) roda **dentro de `execute()`**, no começo da função, uma vez por chamada. Não expõe API `compile()` separada — isso é escopo do plano PERFORMANCE (deferido).

Erros novos (`CYCLE_DETECTED`, `STEP_SKIPPED`) usam **prefix `"[CODE] ..."`** no `message` via `throw new Error(...)`. Handler HTTP do app parseia o prefix. Quando `CalcError` aterrissar em PERFORMANCE, será substituição drop-in (handler já faz fallback).

---

## Pré-requisitos

**Nenhum.** Este plano roda direto sobre o `execute()` atual (commit `b677d20`). Itens já concluídos que servem de base:

- ✅ Tipos de UI removidos de `lib/runtime/types.ts`.
- ✅ Type guard `isOp()` em `evaluator.ts`.
- ✅ Suíte de benchmark com fixtures determinísticas + baseline registrado (`lib/runtime/__bench__/baseline/2026-04-20-pre-compile-run.md`).

Se algum desses não estiver no código, pare e rebase antes de continuar.

---

## Escopo de execução

### B.1 — Detecção de ciclo entre steps

**Escopo:**
- Em `execute.ts`, após `EngineSchema.safeParse` bem-sucedido e antes do loop principal, construir grafo de dependências: nós = `stepId`, aresta `A → B` se `A.expression`, `A.when` (B.3), ou qualquer branch de `conditional` dentro de `A.expression` contém `stepRef(B)`.
- Executar DFS com detecção de back-edge. Ciclo detectado → lançar `throw new Error("[CYCLE_DETECTED] Ciclo entre steps A→B→...→A")` com o caminho do ciclo na mensagem.
- **Ciclos condicionais** (ex.: `A.when` referencia `B`, `B.when` referencia `A`): detectar como ciclo normal. Política conservadora — se o autor quer "ciclo aparente mas impossível em runtime", deve refatorar.
- O erro é lançado pelo `execute()` e capturado no `catch` externo (linha 116–118 de `execute.ts`), devolvendo `{ success: false, error: "[CYCLE_DETECTED] ..." }` ao consumidor. **Nunca** cai na branch por-step (`steps[i].error`) — ciclo é erro estrutural, aborta a execução inteira.
- Helper isolado: `lib/runtime/analyze.ts` (novo arquivo) exportando `buildDependencyGraph(engine)` e `detectCycle(graph)`. Mantém `execute.ts` enxuto.

**Arquivos afetados:**
- `lib/runtime/execute.ts` — chamada pós-parse.
- `lib/runtime/analyze.ts` — novo; grafo + detecção.

**Risco:** baixo. Análise estática, executa uma vez por chamada. Performance: O(V + E) sobre a lista de steps.

**Critério de pronto:**
- Engine com `A.expression` usando `stepRef(B)` e `B.expression` usando `stepRef(A)` → `execute()` retorna `{ success: false, error: "[CYCLE_DETECTED] ..." }`.
- Engine válido sem ciclos → continua executando normalmente, zero overhead perceptível no bench médio (< 5%).
- Bruno `bruno/calc/*` verde em engines reais.

---

### B.2 — Ordenação topológica estável (`executionOrder`)

**Escopo:**
- Logo após `B.1` (reusando o mesmo grafo), executar topsort estável: Kahn's algorithm com fila ordenada pela posição original do step no array (`engine.steps.indexOf(stepId)`) para tie-break.
- Resultado: `executionOrder: string[]` — lista de `stepId` na ordem em que devem ser executados.
- `execute.ts` itera sobre `executionOrder.map(id => stepsMap.get(id)!)` em vez de `validEngine.steps` diretamente.
- Construir `stepsMap: Map<string, Step>` uma vez antes do loop para lookup O(1).
- Forward refs **deixam de ser erro** — o topsort reordena. Engines mal ordenados passam a funcionar.
- Engines bem ordenados continuam com a mesma ordem (topsort preserva posição via tie-break).
- Helper: `lib/runtime/analyze.ts` exporta `topologicalSort(graph, stepOrder)` retornando `string[]` ou lançando `"[CYCLE_DETECTED] ..."` se detectar ciclo (reutilizado com B.1 — mesmo algoritmo pode fazer as duas coisas).

**Decisão de implementação:** `buildDependencyGraph` + `topologicalSort` são **um único pipeline**. Se houver ciclo, topsort lança. Se não houver, devolve ordem estável. B.1 e B.2 são entregues juntos no mesmo commit.

**Arquivos afetados:**
- `lib/runtime/execute.ts` — itera sobre `executionOrder`.
- `lib/runtime/analyze.ts` — topsort estável.

**Risco:** médio. Muda a semântica de ordem (antes = array direto, agora = topsort). Mitigação: tie-break estável preserva ordem de engines já corretos; engines mal ordenados são fix, não regressão.

**Critério de pronto:**
- Engine com `stepB` declarado antes de `stepA` mas `stepB.expression` referencia `stepA` → `execute()` executa `stepA` primeiro, então `stepB`, resultado correto.
- Engine sem dependências cruzadas → `executionOrder` = ordem do array (verificável por logs/trace).
- Dois runs do mesmo engine + mesmos inputs → `steps[]` na mesma ordem (determinístico).
- Bruno `bruno/calc/*` verde. Bench médio mostra overhead < 5% do baseline.

---

### B.3 — `Step.when?: TableCondition`

**Escopo:**

**Tipos (`lib/runtime/types.ts`):**
```ts
export interface Step {
  // ... campos existentes
  /**
   * Optional runtime filter. Evaluated before `expression`.
   * If `when` evaluates to false, the step is skipped:
   *  - `stepResults[id]` is not populated
   *  - step appears in `steps[]` with `skipped: true` (reason "when")
   *  - `stepRef(id)` from other steps → throws STEP_SKIPPED (see B.4)
   * `enabled: false` (design-time) has precedence — when is not evaluated if enabled is false.
   */
  when?: TableCondition | null
}
```

**Schema (`lib/runtime/schema.ts`):**
```ts
// StepSchema gains:
when: TableConditionSchema.nullable().optional()
```

**Runtime (`execute.ts`):**
- Dentro do loop, após check de `enabled`:
  ```ts
  if (step.when) {
    const whenResult = evaluateCondition(step.when, ctx)
    if (!whenResult) {
      stepResults[step.id] = null // marker para B.4
      steps.push({ id, name, enabled: true, skipped: true, skipReason: "when", value: null, error: null })
      continue
    }
  }
  ```
- `evaluateCondition` é o mesmo helper que já avalia `TableCondition` no contexto de tabelas de faixas (em `evaluator.ts`). Expor se ainda não estiver exposto; reutilizar.
- `when` pode usar `varRef`, `stepRef` (para steps já executados no `executionOrder`), `number`, `text`. Ou seja, `when` entra no grafo de dependências (B.1/B.2) — step que usa `stepRef(X)` em `when` depende de `X`.
- Ao pular, registrar no trace (se `options.debug`): `{ type: "step-skip", reason: "when=false", detail: "step.when avaliou false" }`.

**Estrutura interna de `stepResults`:**
- Opção escolhida: manter `Record<string, Decimal | null>`, onde `null` significa "skipped ou erro ou disabled". **Mas** introduzir um `Map<string, "disabled" | "skipped" | "error">` paralelo chamado `stepFailures: Map<string, SkipReason>` para o evaluator distinguir os 3 casos quando resolve `stepRef` (usado em B.4).
- Isso evita reescrever o tipo de `stepResults` e preserva a API interna que o evaluator consome hoje.

**`StepResult` (em `execute.ts`):**
```ts
export interface StepResult {
  id: string
  name: string
  enabled: boolean
  value: string | null
  error: string | null
  skipped?: boolean          // NEW — true se when avaliou false
  skipReason?: "when"        // NEW — reservado para extensões futuras
  trace?: StepTrace
}
```

`skipped`/`skipReason` são opcionais; consumidores existentes não quebram.

**Arquivos afetados:**
- `lib/runtime/types.ts` — campo `when` + JSDoc.
- `lib/runtime/schema.ts` — `when` no `StepSchema`.
- `lib/runtime/execute.ts` — loop + `stepFailures` + `StepResult` estendido.
- `lib/runtime/evaluator.ts` — garantir que `evaluateCondition` é exportado/reusado (provavelmente já está internamente).

**Risco:** baixo-médio. Campo opcional → engines atuais continuam funcionando. Complexidade real está em B.4 (integração com `stepRef`).

**Critério de pronto:**
- Teste via engine sintético: step com `when: varX > 10`, input `varX=5` → step aparece com `skipped: true` em `steps[]`, valor `null`.
- Mesmo engine com `varX=20` → step executa normalmente.
- `enabled: false` + `when: true` → step aparece com `enabled: false, skipped: undefined` (enabled tem precedência).
- Trace em debug mode mostra o skip com razão.

---

### B.4 — Política `STEP_SKIPPED` + `conditional` lazy

**Escopo:**

**Fail-loud em `stepRef` direto para skipped:**
- Em `evaluator.ts`, na resolução de `stepRef`:
  ```ts
  const value = stepResults[token.stepId]
  if (value === null) {
    const reason = stepFailures.get(token.stepId)
    if (reason === "skipped") {
      throw new Error(`[STEP_SKIPPED] Step "${token.stepId}" foi pulado (when=false) e não pode ser referenciado diretamente`)
    }
    if (reason === "disabled") {
      throw new Error(`Etapa desabilitada: ${token.stepId}`) // mensagem existente preservada
    }
    // erro previamente registrado — comportamento existente
    throw new Error(`Etapa sem valor: ${token.stepId}`)
  }
  ```
- O erro `STEP_SKIPPED` cai na branch `catch` por-step em `execute.ts` (linha 103–112), populando `steps[i].error` com a mensagem completa `"[STEP_SKIPPED] ..."`. **Não** aborta o engine; outros steps seguem.

**Lazy evaluation do `conditional`:**
- Verificar o código atual de `conditional` em `evaluator.ts`. O comportamento esperado:
  1. Avaliar cada `branch.when` (condition) em ordem.
  2. Para a **primeira** branch matched, resolver `branch.value` (que pode conter `stepRef`).
  3. Se nenhuma bater, resolver `else` (se existir) ou lançar erro.
- **Crítico:** branches **não-matched** NÃO podem ter `branch.value` resolvido. Se o resolve é feito em passada única antes do match, refatorar para lazy.
- Teste de contrato: `conditional` com 2 branches, uma aponta pra step skipped; condição escolhe a outra → OK, não lança. Condição escolhe a branch skipped → lança `STEP_SKIPPED`.

**Contrato de erro via prefix:**
- Introduzir convenção documentada: mensagens com prefix `"[CODE] ..."` são códigos estruturados reconhecíveis. Handler HTTP do app pode parsear.
- Códigos introduzidos neste plano: `CYCLE_DETECTED` (B.1), `STEP_SKIPPED` (B.4). Sem classe `CalcError` por enquanto — isso é escopo de PERFORMANCE.

**Arquivos afetados:**
- `lib/runtime/evaluator.ts` — resolução de `stepRef` + lazy do `conditional`.
- `lib/runtime/execute.ts` — `stepFailures` Map passado como parte do `EvalContext`.
- `lib/runtime/types.ts` — atualizar `EvalContext` (se exportado) com `stepFailures`.

**Risco:** médio — exige garantia de que `conditional` não resolve branches não-matched. Se o código atual resolve tudo eagerly, refator precisa ser cuidadoso.

**Critério de pronto:**
- Teste: `stepRef(S)` direto com S skipped → erro `"[STEP_SKIPPED] Step \"S\" foi pulado ..."`.
- Teste: `conditional` com 2 branches, branch1 → `stepRef(S_skipped)`, branch2 → `number(0)`; condição escolhe branch2 → resultado `0`, sem erro.
- Teste: `conditional` com branch1 → `stepRef(S_skipped)`; condição escolhe branch1 → erro `STEP_SKIPPED`.
- Bruno `bruno/calc/*` verde.

---

### B.5 — `outputs: Record<stepId, string | null>`

**Escopo:**

**Tipo (`execute.ts`):**
```ts
export interface ExecuteResult {
  success: boolean
  steps: StepResult[]
  finalValue: string | null
  outputs: Record<string, string | null>   // NEW
  error?: string
  validationErrors?: { path: (string | number)[]; message: string }[]
}
```

**Population logic em `execute.ts`:**
- Inicializar `const outputs: Record<string, string | null> = {}` antes do loop.
- Pré-popular com todos os steps `kind: "output"` (do engine parsed, não filtrando por enabled), todos inicialmente como `null`:
  ```ts
  for (const step of validEngine.steps) {
    if (step.kind === "output") outputs[step.id] = null
  }
  ```
- Dentro do loop, quando step executa com sucesso **e** `kind === "output"`:
  ```ts
  if (step.kind === "output") {
    outputs[step.id] = formatted
    finalValue = formatted
  }
  ```
- Steps output skipped por `when` ou `enabled` → permanecem como `null` no `outputs` (já pré-populados).
- Steps output com erro → permanecem `null`.

**Decisão de contrato:** output skipped **aparece como `null`** em `outputs`, não é omitido. Permite ao consumidor iterar por todos os outputs conhecidos e saber quais foram skipped (vs ausência no JSON = ambíguo).

**Retrocompatibilidade:**
- `finalValue` **continua sendo** o último output que executou com sucesso. Zero mudança.
- `outputs` é aditivo; consumidores atuais que ignoram o campo não quebram.

**JSDoc atualizado:**
```ts
/**
 * Result of a full engine execution.
 *
 * `finalValue`: last `kind: "output"` step that executed successfully. `null` if none did.
 *              For retrocompat; with branching, prefer `outputs[stepId]`.
 * `outputs`:   record with ALL output steps. Key = step.id, value = formatted string or null.
 *              null means: skipped (when=false), disabled, or errored.
 *              Pre-populated for every output step so consumers can iterate deterministically.
 */
```

**Arquivos afetados:**
- `lib/runtime/execute.ts` — tipo `ExecuteResult` + population.
- `app/api/calc/[...segments]/route.ts` — garantir que o response passa `outputs` adiante (trivial se já faz `return NextResponse.json(result)`).

**Risco:** mínimo (aditivo).

**Critério de pronto:**
- Engine com 3 outputs (`out1`, `out2`, `out3`), 1 skipped por `when` → `outputs` tem 3 chaves; 2 populadas com strings, 1 `null`. `finalValue` é o último dos 2 que rodou.
- Engine sem `when` → `outputs` tem todas as chaves populadas. `finalValue` == `outputs[lastOutputId]`.
- Consumidor antigo que só lê `finalValue` → zero regressão.

---

### B.6 — Cenário de benchmark com branching

**Escopo:**

**Script de fixture (`lib/runtime/__bench__/generate-fixtures.ts`):**
- Adicionar novo cenário "branching":
  - 30 steps, metade com `when` baseado em variável de entrada `tipoRegime` (ex.: `"simples"`, `"lucroReal"`).
  - 5 tabelas × 500 rows.
  - Output steps distribuídos entre os regimes.
- Regenerar fixtures: `yarn bench:fixtures`.

**Bench runner (`lib/runtime/__bench__/engine.bench.ts`):**
- Adicionar novo bench group: `"branching (when filter + conditional routing)"`.
- Variações de input que ativam diferentes caminhos (ex.: `tipoRegime="simples"` vs `"lucroReal"`).
- Medir: `execute()` p99 no cenário branching vs cenário médio atual (sem `when`).

**Meta:**
- Overhead de avaliar `when` + rebuild de grafo + topsort deve ser < 20% do cenário médio baseline (1.792 ms → ≤ 2.15 ms).
- Skip de step quando `when=false` é O(1) após avaliar `when` (não avalia expression).

**Registrar resultado:**
- Adicionar entrada em `RUNTIME_REFACTOR_BRANCHING.md` → [Progresso → Histórico de medições](#histórico-de-medições).
- Comparar com baseline `b677d20` (cenário médio 1.792 ms p99) + cenário médio pós-B.2 (topsort).

**Arquivos afetados:**
- `lib/runtime/__bench__/generate-fixtures.ts` — novo cenário.
- `lib/runtime/__bench__/engine.bench.ts` — novo bench group.
- `lib/runtime/__bench__/baseline/` — opcional: arquivar snapshot pós-branching.

**Risco:** nenhum.

**Critério de pronto:**
- `yarn bench:fixtures && yarn bench` imprime tabela com o novo cenário.
- Resultado dentro da meta (< 20% overhead vs médio).
- Entrada no histórico de medições.

---

### B.7 — Documentação (README + JSDoc)

**Escopo:**

**Criar `lib/runtime/README.md`** (se ainda não existir) com seção dedicada a branching. Conteúdo mínimo (seções completas ficam em PERFORMANCE R3.13 — aqui é só o essencial para branching):

```md
# `lib/runtime/`

## Branching entre steps

### Modelo filter-based (`Step.when`)

Cada step pode declarar um filtro runtime opcional:

    {
      "id": "stepSimples",
      "name": "Cálculo Simples Nacional",
      "when": { "left": { "kind": "varRef", "id": "regime" }, "op": "==", "right": { "kind": "text", "value": "simples" } },
      "expression": [...]
    }

Se `when` avaliar `false`, o step é **skipped**: `stepResults[id] = null`, aparece em `steps[]` com `skipped: true`.

### Roteamento com `conditional`

Para escolher entre branches, combine `when` nos steps-branch com `conditional` no step consumidor:

    // stepSimples tem when: regime == "simples"
    // stepLucroReal tem when: regime == "lucroReal"
    // stepFinal usa conditional para escolher:
    {
      "id": "stepFinal",
      "kind": "output",
      "expression": [{
        "type": "conditional",
        "branches": [
          { "when": { ... regime == "simples" }, "value": { "type": "stepRef", "stepId": "stepSimples" } },
          { "when": { ... regime == "lucroReal" }, "value": { "type": "stepRef", "stepId": "stepLucroReal" } }
        ]
      }]
    }

O `conditional` tem **avaliação lazy**: resolve apenas a branch matched. Branches não-matched podem referenciar steps skipped sem explodir.

### Anti-padrões

- ❌ `stepRef(S)` direto quando `S` pode ser skipped → lança `[STEP_SKIPPED]`.
- ✅ `conditional` com `stepRef(S)` em uma das branches → OK se `when` da branch combina com o `when` do S.

### Múltiplos outputs

`ExecuteResult.outputs: Record<stepId, string | null>` traz **todos** os outputs do engine:
- Executados com sucesso → string formatada.
- Skipped/disabled/erro → `null`.

`finalValue` preserva retrocompat: último output que executou.

### Ordem de execução

`execute()` calcula topologicamente a ordem dos steps com base em dependências (`stepRef` em `expression`, `when`, branches). Autor pode declarar steps em qualquer ordem no JSON. Único erro estrutural: **ciclo** (`[CYCLE_DETECTED]`).

Tie-break estável: steps sem dependência entre si preservam ordem do array (determinístico).
```

**JSDoc atualizado em:**
- `Step.when` — semântica, precedência vs `enabled`, exemplo.
- `StepResult.skipped` / `skipReason` — quando é `true`, valores possíveis.
- `ExecuteResult.outputs` — contrato (pré-populado, `null` para skipped).
- `ExecuteResult.finalValue` — nota de retrocompat recomendando `outputs` para branching.

**Arquivos afetados:**
- `lib/runtime/README.md` — novo (ou seção nova se o arquivo já existir).
- `lib/runtime/types.ts` — JSDoc em `Step.when`.
- `lib/runtime/execute.ts` — JSDoc em `ExecuteResult`, `StepResult`.

**Risco:** nenhum (só doc).

**Critério de pronto:**
- `README.md` existe e cobre o padrão filter-based + `conditional`.
- JSDoc visível via hover em VS Code nos campos novos.
- Exemplo do README é **copiável** — validar manualmente que executa.

---

## Ordem de execução (cronológica)

Cada commit deve ser independente e passar no bruno antes do próximo.

1. **B.1 + B.2 (juntos)** — Ciclo + topsort estável. Mesmo grafo, mesmo algoritmo. Novo arquivo `analyze.ts`. `execute.ts` passa a iterar por `executionOrder`.
   - Verificar: bruno verde, bench médio < +5% vs baseline.
2. **B.3** — `Step.when` + skip loop. Adiciona campo opcional, extende `StepResult` com `skipped`/`skipReason`, mantém retrocompat.
   - Verificar: teste sintético de skip por `when`; bruno verde.
3. **B.4** — `STEP_SKIPPED` + `conditional` lazy. Primeiro garantir/testar lazy do `conditional`, depois introduzir o erro fail-loud.
   - Verificar: testes sintéticos dos 3 cenários (stepRef direto, conditional escolhe skipped, conditional escolhe não-skipped).
4. **B.5** — `outputs` record. Aditivo, zero breaking. Pré-populado com todos os outputs, `null` para skipped.
   - Verificar: response do `/api/calc` inclui `outputs`; bruno snapshot atualizado se houver.
5. **B.6** — Cenário de bench com branching. Registrar medição.
6. **B.7** — README + JSDoc. Último item, consolida a documentação.

**Opcional entre B.5 e B.6:** ajustes no app para consumir `outputs` no calculator/builder (se Barney quiser visibilidade imediata — ver [Atualizações correlatas no app](#atualizações-correlatas-no-app)).

---

## Convenções & contrato de erros

### Erros estruturados via prefix `"[CODE] ..."`

Enquanto `CalcError` formal não existe (escopo PERFORMANCE R1.4), erros novos usam **prefix no `message`**:

| Código | Onde lançar | Captura em `execute.ts` |
|---|---|---|
| `CYCLE_DETECTED` | `analyze.ts → topologicalSort` | `catch` externo → `success: false, error: "[CYCLE_DETECTED] ..."` |
| `STEP_SKIPPED` | `evaluator.ts → resolveStepRef` | `catch` por-step → `steps[i].error` populado |

Handler HTTP do app (em `app/api/calc/[...segments]/route.ts` ou helper dedicado) pode parsear prefix para devolver HTTP status distinto:
- `CYCLE_DETECTED` → 422 (invalid engine structure).
- `STEP_SKIPPED` → 500 ou 200 com erro no step (depende da UX desejada — se vier em `steps[i].error`, já é 200).

Quando PERFORMANCE R1.4 aterrissar:
- Substituir cada `throw new Error("[CODE] ...")` por `throw new CalcError("CODE", "msg", {...})`.
- Handler detecta `instanceof CalcError` com prioridade sobre parse de prefix.
- Migração é drop-in.

### Convenções de commit

- `runtime: B.X descrição` para commits deste plano.
- Um item = um commit (exceto B.1+B.2 que vão juntos por serem o mesmo algoritmo).
- Smoke test via bruno obrigatório antes de cada commit.

### Verificação padrão

Sem suite de unit tests — verificação = **bruno + snapshot manual**:
- `bruno/calc/*` (endpoints de cálculo) + `bruno/flows/calc/*` (fluxos encadeados).
- Snapshot manual de `ExecuteResult` para engines de teste específicos (fixtures em `mocks/`).
- `yarn bench` para regressão de performance.

---

## Critério de saída global

Plano considerado concluído quando:

1. **Funcional:** engine de exemplo com 3 regimes de cálculo (ex.: Simples/Presumido/Lucro Real) roteia via `when` + `conditional` e produz outputs diferentes conforme input. Testado via bruno.
2. **Fail-loud:** `stepRef` direto para step skipped lança `STEP_SKIPPED` em `steps[i].error`. Comportamento idêntico em 3 engines sintéticos de teste.
3. **Retrocompat:** engines atuais (sem `when`) continuam funcionando sem mudança. **Verificação obrigatória:** bruno `bruno/calc/*` verde + smoke test staging com 5 engines aleatórios do Supabase (APP.G.1) executando sem edição de dados.
4. **Topsort:** engines com steps em ordem arbitrária executam corretamente. Ciclos abortam com `CYCLE_DETECTED`.
5. **Outputs:** `ExecuteResult.outputs` populado com todos os outputs conhecidos (valor ou `null`).
6. **Performance:** bench cenário branching < 20% overhead vs cenário médio baseline.
7. **Docs:** `lib/runtime/README.md` cobre o padrão filter-based + `conditional` + antirpadrões.

---

## Atualizações correlatas no app

Estas mudanças **entram depois que o runtime (B.1–B.7) estiver concluído e commitado**. Não são pré-requisito para a entrega do runtime — são as adaptações necessárias para expor/consumir os campos novos (`when`, `skipped`, `outputs`) nas camadas app (builder, calculator, API handler, schemas). Todas são **aditivas** — engines e consumidores atuais continuam funcionando sem elas.

### UI do builder — depois do runtime

- **`app/builder/components/StepCard/`** (`APP.B.4`): adicionar editor opcional de `Step.when` (reusa componente de `TableCondition` que já existe para linhas de tabelas de faixas).
- **`app/calc/components/Calculator/`** (`APP.B.5` + `APP.A.2`): renderizar `steps[i].skipped` com badge visual distinto de `!enabled`; mostrar `outputs` (record) em vez de só `finalValue` quando houver múltiplos outputs.

### API handler — depois do runtime

- **`app/api/calc/[...segments]/route.ts`** (`APP.A.3-ponte`): parsear prefix `[CYCLE_DETECTED]` e devolver HTTP 422 em vez de 500. Outros prefixes (`[STEP_SKIPPED]`) vêm embutidos em `steps[i].error`, não precisam de handling especial. Nome espelha a "versão ponte" de `A.3` do `RUNTIME_REFACTOR_APP.md` — quando `CalcError` formal aterrissar (escopo PERFORMANCE), essa ponte vira `instanceof CalcError`.

### Schema do contrato API — obrigatório junto com as adaptações app

- **`schemas/api.ts`** (`APP.E.2`): atualizar `CalcResponseSchema` adicionando `outputs: z.record(z.string(), z.string().nullable())` e estender `StepResultSchema` com `skipped: z.boolean().optional()` + `skipReason: z.enum(["when"]).optional()`. Sem isso, `z.object` faz **strip** dos campos novos silenciosamente — Calculator via `CalcResponseSchema.parse()` ou Bruno com schema validation vão perder `outputs`/`skipped` antes de chegar ao cliente tipado. Esse item é aditivo mas **sincronizado**: se adotar qualquer item app, adote este junto.

### State & retrocompat — depois do runtime

- **`stores/engineStore.ts` + `hooks/useEngineState.ts` herdam automaticamente** via import direto: ambos importam `Step`/`EngineState` de `@/libs/runtime`, logo `AppState.engine` e `EngineRecord.engine` ganham `when?` sem patch manual. O item `APP.D.4` exige **smoke check de round-trip**: editar `when` no builder, salvar no store, recarregar, confirmar que o valor persiste.
- **`stores/requestStore.ts` — não aplicável.** Checagem direta do arquivo (13 linhas) mostrou que o store só guarda contador de requests em andamento; não armazena a response da calc. O item "`F.2` requestStore consome novo response shape" que aparece no `RUNTIME_REFACTOR_APP.md` Fase A4 é **obsoleto vs código real** — nada a fazer aqui.
- **Smoke test de retrocompat em staging** (`APP.G.1`): carregar 5 engines existentes aleatórios do Supabase e rodar `execute()` contra cada um. Resultado esperado: zero erro, sem edição dos dados persistidos. Sem esse check, o critério "retrocompat" cai em "confia que funciona".

Esses itens **não** bloqueiam a entrega do plano de runtime — ficam para depois. Listados no [Progresso](#progresso) como "app (pós-runtime)".

---

## Progresso

> Bloco embutido neste arquivo (padrão do projeto — segue o modelo de `RUNTIME_REFACTOR_PERFORMANCE.md`). Atualizar conforme executar.

### Overview

- **Última atualização:** 2026-04-20 (2ª validação cruzada — ajustes APP.E.2, rename APP.A.1→A.3-ponte, nota F.2 não-aplicável)
- **Status global:** 🔴 não iniciado
- **Total de itens (runtime):** 7 (B.1 + B.2 contam como 1 commit, mas 2 checkboxes)
- **Itens (app — pós-runtime):** 7

### Sequência de entrega

1. **Runtime primeiro** (B.1–B.7) — entregue e commitado antes de tocar qualquer item APP.*.
2. **App depois** — só faz sentido com o runtime devolvendo os campos novos. APP.E.2 é o único "sincronizado": se rodar qualquer APP.*, rode APP.E.2 junto.

### Checklist — runtime

- [ ] **B.1** Detecção de ciclo entre steps
- [ ] **B.2** Ordenação topológica estável (`executionOrder`)
- [ ] **B.3** `Step.when?: TableCondition` (skip loop + `StepResult.skipped`)
- [ ] **B.4** `STEP_SKIPPED` fail-loud + `conditional` lazy
- [ ] **B.5** `outputs: Record<stepId, string | null>` em `ExecuteResult` (🟡 parcial — versão endpoint-only keyada por `name` entregue em 2026-04-20; runtime-level pendente. Ver Changelog.)
- [ ] **B.6** Cenário de bench com branching
- [ ] **B.7** `README.md` + JSDoc do branching

### Checklist — app (pós-runtime)

- [ ] **APP.B.4** Editor de `Step.when` no `StepCard`
- [ ] **APP.B.5** Render de `steps[i].skipped` no `Calculator`
- [ ] **APP.A.2** Renderização de `outputs` (múltiplos) no `Calculator`
- [ ] **APP.A.3-ponte** Parse de prefix `[CYCLE_DETECTED]` no handler HTTP (422). Nome espelha "versão ponte" de `A.3` em `RUNTIME_REFACTOR_APP.md`.
- [ ] **APP.D.4** Smoke check: `AppState` + `engineStore` preservam `when` via re-export (round-trip manual — editar, salvar, recarregar)
- [ ] **APP.E.2** Atualizar `CalcResponseSchema` + `StepResultSchema` em `schemas/api.ts` para incluir `outputs`, `skipped`, `skipReason` (obrigatório-junto-com qualquer APP.*; sem isso `z.object` faz strip e consumidores tipados perdem os campos novos)
- [ ] **APP.G.1** Smoke test staging: 5 engines existentes aleatórios do Supabase rodam `execute()` sem edição de dados

### Contadores

| Camada | Total | Feitos | % |
|---|---|---|---|
| Runtime (B.1–B.7) | 7 | 0 | 0% |
| App (pós-runtime) | 7 | 0 | 0% |
| **Total** | **14** | **0** | **0%** |

### Histórico de medições

| Data | Commit/ref | Cenário | `execute()` p99 | Notas |
|---|---|---|---|---|
| 2026-04-20 | `b677d20` (baseline) | Pequeno | 0.896 ms | baseline, pré-branching |
| 2026-04-20 | `b677d20` (baseline) | Médio | 1.792 ms | baseline, pré-branching |
| 2026-04-20 | `b677d20` (baseline) | Grande | 13.952 ms | baseline, pré-branching |

> Após B.2 (topsort), preencher linha "médio pós-topsort" — meta: regressão < 5%. Após B.6, preencher linha "branching" — meta: < 20% vs médio baseline (≤ 2.15 ms).

---

## Changelog

- **2026-04-20** — Documento criado. Consolida em um único arquivo self-contained todo o plano de branching (antes distribuído em múltiplos docs agora obsoletos). Decisões já batidas em 2026-04-19 (modelo filter-based, STEP_SKIPPED fail-loud, `conditional` lazy, `outputs` aditivo, topsort estável) entram aqui como **fato no corpo** — não estão mais abertas a debate. Erros usam prefix `[CODE]` no `message`; `CalcError` formal fica em `RUNTIME_REFACTOR_PERFORMANCE.md`.
- **2026-04-20** — Checklist "App (opcional)" expandida com **APP.D.4** (smoke check de round-trip — `AppState` + stores preservam `when`/`outputs` via re-export automático de `@/libs/runtime`) e **APP.G.1** (smoke test staging contra 5 engines reais). Critério de saída "Retrocompat" reforçado com verificação obrigatória do APP.G.1. Sem essas duas checks, "retrocompat" fica no "confia que funciona".
- **2026-04-20** — Segunda validação cruzada (BRANCHING vs `RUNTIME_REFACTOR_PLAN.md` / `RUNTIME_REFACTOR_APP.md` / `RUNTIME_REFACTOR_PROGRESS.md` / `RUNTIME_PROMPT_FASE_4.md`). 3 ajustes aplicados: (a) **APP.E.2 adicionado** ao checklist app — `CalcResponseSchema` + `StepResultSchema` em `schemas/api.ts` precisam ganhar `outputs`/`skipped`/`skipReason`; sem isso `z.object` faz strip silencioso e consumidores tipados perdem os campos novos. Marcado como obrigatório-junto-com qualquer APP.*. (b) **APP.A.1 renomeado para APP.A.3-ponte** — alinha com a "versão ponte" de `A.3` descrita em `RUNTIME_REFACTOR_APP.md`; evita colisão com `A.1` de lá, que é migração para `compile()+run()` (escopo deferido em PERFORMANCE). (c) **`stores/requestStore.ts` declarado não-aplicável** — auditoria do arquivo real (13 linhas, só contador de requests em andamento) mostrou que `F.2` do APP.md antigo ("requestStore consome novo response shape") é obsoleto vs código. Também reorganização: seção "Atualizações correlatas no app", checklist e Progresso deixam explícito que **app é pós-runtime** (não mais "opcional em paralelo"), conforme instrução de Barney — *"eh para ser executado separado, app so depois do runtime ter sido resolvido"*. Contador app 6→7; total 13→14.
- **2026-04-20** — **B.5 parcial entregue endpoint-only** (fora de ordem, pedido direto de Barney). Escopo: mudar o contrato público do `/api/calc/:engineId` sem tocar `lib/runtime/`. Entregue: (a) `app/api/calc/[...segments]/route.ts` — GET schema keyada por variable `name` (não `id`); POST aceita `inputs` keyados por `name` e faz remap `name → id` antes de chamar `execute()`; response padrão passa a ser `{ success, finalValue, outputs, errors? }` com `outputs` keyados por step `name` e `errors` (opcional) só para output steps falhos; `steps[]` cru só aparece quando `debug: true`. (b) `schemas/api.ts` — `CalcResponseSchema` espelha o novo contrato (`outputs: z.record(z.string(), z.string().nullable())`, `errors: z.record(z.string(), z.string()).optional()`, `steps: z.array(StepResultSchema).optional()`). (c) `app/calc/components/Calculator/index.tsx` — state de `values` keyado por `name` (defaults, input binding e preview de `inputsPayload`). (d) Bruno docs atualizados (`calculate.bru` com docs de always-on vs debug-only; `get-schema.bru` e flows migrados para variáveis com nome real).
  **Divergência vs spec B.5 original:** o plano diz `outputs: Record<stepId, string | null>` no `ExecuteResult` do runtime. Esta entrega **não toca `lib/runtime/`** — é tradução no boundary da API, keyada por `name` em vez de `id`, igual à estratégia usada para `inputs`. Runtime continua usando `id` internamente. B.5 completo (campo `outputs` no `ExecuteResult` keyado por `id`) ainda é pendente e vai junto com o resto do bundle branching (B.1–B.7). Sanitização de `name` para steps (rejeitar espaços/maiúsculas/special chars) fica para depois.

