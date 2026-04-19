# Runtime Refactor Plan

> Plano de execução detalhado da refatoração e endurecimento da `lib/runtime/` antes de:
> (1) subir sob carga em produção e (2) extrair o pacote como lib independente para ser consumida por um serviço HTTP leve (Express/Fastify) separado da aplicação Next.
>
> **Convenção:** cada item tem checkboxes granulares, racional (“Por quê”), arquivos afetados, risco estimado, e critério de pronto (“Como verificar”). Itens são marcados `- [ ]` pendente e `- [x]` concluído. Mudanças de escopo ou decisões importantes durante a execução vão no **Changelog** no fim deste documento.
>
> **Documento irmão:** [`REFACTOR_PROGRESS.md`](./REFACTOR_PROGRESS.md) — dashboard macro para visão rápida de andamento.

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

- [ ] Identificar todos os consumidores de `UIState`, `AppState`, `TestResult`, `EditingNumber` no app (Next).
- [ ] Criar novo arquivo fora da lib (ex.: `app/state/ui-types.ts` ou `lib/ui/types.ts`) e mover os tipos para lá.
- [ ] Atualizar imports nos consumidores.
- [ ] Remover as interfaces de `lib/runtime/types.ts`.
- [ ] Verificar `lib/runtime/index.ts` — garantir que esses tipos **não** são re-exportados pela lib.
- [ ] `tsc --noEmit` verde + app compilando e rodando.

**Por quê:** a `lib/runtime/` precisa ser agnóstica ao UI. Um consumidor Node/Express não deve arrastar tipos de modal, editing state, test results da UI. Esse acoplamento bloqueia extração como pacote.

**Arquivos afetados:** `lib/runtime/types.ts`, `lib/runtime/index.ts`, consumidores no app (stores, componentes).

**Risco:** baixo. Apenas movimentação de tipos; TS acusa imediatamente qualquer import quebrado.

**Como verificar:** `grep -r "from.*lib/runtime.*UIState\|AppState\|TestResult\|EditingNumber"` não retorna nada; build do app passa; testes (se houver) continuam passando.

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
  - `FORWARD_REF` (item 3.3)
  - `INVALID_INPUT` (item 3.1)
  - `RESOURCE_LIMIT_EXCEEDED` (item 1.5)
- [ ] Substituir `throw new Error("...")` dentro de `evaluator.ts`, `execute.ts`, `decimalFactory.ts`, `compile.ts`, `run.ts` por `throw new CalcError(CODE, msg, context)`.
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
  - `maxTokensPerExpression` (default ex.: `1000`)
  - `maxRowsPerTable` (default ex.: `10_000`)
  - `maxSteps` (default ex.: `500`)
  - `maxTables` (default ex.: `100`)
- [ ] Validar limites em `compile()` (estrutural) e em `run()` (por expressão) lançando `CalcError("RESOURCE_LIMIT_EXCEEDED", ...)`.
- [ ] JSDoc explicando a motivação e defaults.
- [ ] Teste unitário cobrindo cada limite.

**Por quê:** quando virar serviço HTTP público ou compartilhado, engines maliciosos/acidentalmente gigantes podem travar CPU. Guards explícitos > timeouts implícitos.

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

### 2.7 Suíte de benchmark (tinybench)

- [ ] Adicionar `tinybench` (ou `vitest bench`) como devDependency.
- [ ] Criar `lib/runtime/__bench__/engine.bench.ts` (ou equivalente).
- [ ] Cenários:
  - **Pequeno:** 5 steps, 0 tabelas.
  - **Médio:** 20 steps, 3 tabelas de 30 linhas.
  - **Grande:** 50 steps, 10 tabelas, algumas com 500+ linhas.
- [ ] Medir: `execute()` (atual), `compile()` isolado, `run()` isolado, `execute()` repetido (mostra overhead repetido).
- [ ] Definir e documentar metas de p99:
  - Pequeno: < 0.2ms
  - Médio: < 1ms
  - Grande: < 5ms
- [ ] Script npm `bench` que roda e exibe tabela comparativa.
- [ ] Registrar baseline (antes das otimizações) e target (depois) em `REFACTOR_PROGRESS.md`.

**Por quê:** sem benchmark, “otimização” é chute. Este item é guard-rail pra regressão e evidência pra decidir quando parar.

**Arquivos afetados:** `package.json`, novo diretório `__bench__/`.

**Risco:** nenhum.

**Como verificar:** `npm run bench` executa e imprime resultados.

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

- [ ] Em `compile()`, construir grafo de dependências: nós = stepIds, aresta `A → B` se expressão de `A` contém `{ type: "stepRef", target: B }`.
- [ ] **Incluir também arestas provenientes do campo `when` (ver Camada 4 — 4.1)**: se `A.when` referencia `B`, adicionar aresta `A → B`.
- [ ] Executar DFS/topsort; ciclo → `CalcError("CYCLE_DETECTED", { cycle: [...] })`.
- [ ] Adicionar tipo `CompiledEngine.executionOrder: string[]` (topsort), útil para garantir ordem correta.
- [ ] Decidir: manter a ordem do array como semântica oficial **ou** passar a executar em ordem topológica. **Recomendação:** manter ordem do array (respeita intenção do autor) e apenas validar ausência de ciclo + forward refs (item 3.3).
- [ ] **Ciclos condicionais** (ex.: `A.when = B > 10` e `B.when = A > 10`): detectar como ciclo normal — política conservadora; se o autor quer "ciclo aparente mas impossível em runtime", deve refatorar.

**Por quê:** hoje ciclo quebra em runtime com "Etapa não encontrada" — mensagem enganosa e detecção tardia.

**Arquivos afetados:** `compile.ts`, `errors.ts`.

**Risco:** baixo.

**Como verificar:** teste com engine contendo A→B→A falha no `compile()` com `CYCLE_DETECTED`.

---

### 3.3 Validar ordem de declaração (forward refs)

- [ ] Em `compile()`, após topsort: para cada step S, verificar se todos os `stepRef` que S referencia estão declarados **antes** de S no array.
- [ ] Se não, `CalcError("FORWARD_REF", { stepId, referenced })`.
- [ ] **Aplicar a mesma validação ao campo `when` (ver Camada 4 — 4.1)**: o `when` de um step S só pode referenciar variáveis e steps já declarados antes de S.

**Por quê:** hoje o evaluator acusa "Etapa não encontrada" em runtime quando a ordem está errada. Movendo para o compile, o erro é reportado ao salvar/carregar o engine — UX 10x melhor.

**Arquivos afetados:** `compile.ts`, `errors.ts`.

**Risco:** baixo.

**Como verificar:** teste com step1 referenciando step2 (declarado depois) falha no compile.

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

**Arquivos afetados:** `schema.ts`, `types.ts` (se derivado via `z.infer`), `evaluator.ts`, `execute.ts`.

**Risco:** baixo.

**Como verificar:** teste verifica que `parse({ ..., variables: [{ id, name, defaultValue }] })` retorna variável com `kind: "input"`, `valueType: "number"`.

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
  - **Roadmap:** referência ao `REFACTOR_PLAN.md` e estado atual.

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

Cada fase tem um critério de entrada (o que precisa estar feito) e um critério de saída (o que precisa estar comprovado). A cada fase, atualizar `REFACTOR_PROGRESS.md`.

### Fase 1 — Pré-produção (prioridade máxima)

**Objetivo:** tornar o runtime apto para carga moderada no Next sem regressão.

- [ ] 1.1 — Remover tipos de UI de `types.ts`
- [ ] 1.2 — Separar `compile()` de `run()`
- [ ] 1.5 — Guards de recursos
- [ ] 2.2 — Cache de `Decimal.clone`
- [ ] 2.6 — `tablesMap` como `Map` (feito junto de 1.2)
- [ ] 2.7 — Suíte de benchmark (baseline registrado)
- [ ] 3.2 — Detecção de ciclo
- [ ] 3.3 — Validação de forward refs
- [ ] 3.11 — Type guards em `ResolvedItem`

**Critério de saída:** benchmark do cenário médio < 1ms p99, grande < 5ms p99; testes existentes todos verdes; app Next rodando normalmente.

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
- Testes novos acompanham cada item (exceto doc-only).
- Antes de começar qualquer item, revisitar o racional do item — se mudou de ideia, atualizar este documento + Changelog primeiro.

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
