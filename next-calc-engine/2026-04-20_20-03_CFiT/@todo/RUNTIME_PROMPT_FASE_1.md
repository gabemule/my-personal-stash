# Runtime Refactor — Prompt Fase 1 (Pré-produção)

Preciso executar a **Fase 1 do runtime + Fase A1 do app** do roadmap de refactor. Esta fase é P0 e é pré-requisito de todas as outras.

## Docs mestres (leitura obrigatória ANTES de começar)

**Leia os 3 arquivos completos.** O corpo de cada doc já reflete a solução final e é a fonte de verdade para implementação; os Changelogs ao final existem apenas para contexto histórico de como se chegou à decisão atual — consulte-os para entender o racional original, nunca como guia do que implementar:

- `@todo/RUNTIME_REFACTOR_PLAN.md` — plano runtime (4 camadas, 31 itens)
- `@todo/RUNTIME_REFACTOR_APP.md` — plano app (7 camadas A–G, 26 itens)
- `@todo/RUNTIME_REFACTOR_PROGRESS.md` — dashboard unificado (Parte 1 runtime + Parte 2 app)

Seções específicas desta fase:
- `RUNTIME_REFACTOR_PLAN.md` → seção "Fase 1 — Pré-produção"
- `RUNTIME_REFACTOR_APP.md` → seção "Fase A1 — Pré-produção"
- `RUNTIME_REFACTOR_PROGRESS.md` → "Fase 1 — Pré-produção [0/9]" (Parte 1) e "Fase A1 — Pré-produção" (Parte 2)

## Objetivo

Tornar o runtime apto para carga moderada no Next sem regressão, migrando o endpoint `/api/calc` para `compile()+run()` com cache em memória.

## Ordem cronológica obrigatória

**Não é ordem numérica.** Seguir à risca:

### Runtime (`lib/runtime/`)

1. **1.1** — Remover 4 tipos UI mortos (`UIState`, `AppState`, `TestResult`, `EditingNumber`) de `lib/runtime/types.ts`. Delete puro, 18 linhas. D.1/D.2 do APP já estão `[x]` (no-op após auditoria 2026-04-20).

2. **3.11** — Type guards em `ResolvedItem` em `lib/runtime/evaluator.ts` (remover cast na linha ~287).

3. **2.7** — **BASELINE OBRIGATÓRIO.** Instalar `vitest` + `tsx` como devDeps (`vitest` usa `tinybench` por baixo via `vitest bench` e já destrava unit tests futuros — evita dependências paralelas; `tsx` roda o script de fixtures em TS sem build step). Criar:

   - `lib/runtime/__bench__/generate-fixtures.ts` — script gerador determinístico dos 3 cenários (pequeno/médio/grande)
   - `lib/runtime/__bench__/engine.bench.ts` — suite no formato `vitest bench` (usa `bench(...)` + `describe(...)` do vitest)
   - Fixtures geradas em `lib/runtime/__bench__/fixtures/*.json` **gitignored**
   - Scripts npm:
     - `bench:fixtures` → `tsx lib/runtime/__bench__/generate-fixtures.ts` (gera fixtures determinísticas)
     - `bench` → `vitest bench --run` (roda a suite)
   - Rodar `yarn bench:fixtures && yarn bench` **antes de qualquer otimização** contra a lib pré-refactor
   - Registrar números brutos em `RUNTIME_REFACTOR_PROGRESS.md` → "Histórico de medições"
   
   **Sem baseline gravado, parar aqui.** Otimização sem baseline é chute.

4. **2.2** — Cache de `Decimal.clone` por `(precision, rounding)` em `lib/runtime/decimalFactory.ts`. `Map<string, DecimalConstructor>` com chave `` `${precision}|${rounding}` ``. Re-rodar bench, comparar com baseline.

5. **1.2** — Marco central. Criar:
   - `lib/runtime/compile.ts` — exporta `compile(engine: unknown): CompiledEngine` + tipo `CompiledEngine`
   - `lib/runtime/run.ts` — exporta `run(compiled, inputs, options?): ExecuteResult`
   - Adaptar `lib/runtime/execute.ts` como facade: `execute(engine, inputs, opts) = run(compile(engine), inputs, opts)` — assinatura pública 100% compatível
   - Exportar `compile`, `run`, `CompiledEngine` em `index.ts`
   
   **`CompiledEngine` na Fase 1 carrega APENAS:** `{ engine, config, tablesMap: Map, variablesMap, stepsMap, D, executionOrder, meta }`. **NÃO incluir:**
   - Pré-compute de literais Decimal (item 2.3 — Fase 3)
   - Indexação de tabelas (item 2.4 — Fase 3)
   
   Inclui **2.6** (`tablesMap` como `Map`) automaticamente.
   
   Re-rodar bench comparando `execute()` facade vs `compile()+run()×N`.

6. **3.2 + 3.3** — Análise de grafo no `compile()`:
   - Construir grafo de dependências (expressões + `when` + `conditional` branches)
   - Detecção de ciclo via DFS → lança `Error` com prefix `"[CYCLE_DETECTED] ..."` (CalcError formal é Fase 2)
   - Ordenação topológica estável com tie-break pela ordem do array de steps
   - Expor `CompiledEngine.executionOrder: readonly string[]`
   - `run()` itera por `compiled.executionOrder` (não por `compiled.engine.steps`)
   - **Forward refs deixam de ser erro** — topsort reordena
   
7. **1.5** — Guards de recursos:
   - `maxSteps`/`maxTables`/`maxRowsPerTable` — validados em `compile()`, lançam `Error` com prefix `"[RESOURCE_LIMIT_EXCEEDED] ..."`
   - `maxTokensPerExpression` — validado per-step em `run()` (preserva semântica atual de erro-por-step: `steps[i].error` populado, outros steps seguem)
   - Defaults generosos (não quebrar engines existentes)

### App (Next.js)

8. **A.1** — Migrar `app/api/calc/[...segments]/route.ts`:
   - Criar `lib/server/compiledCache.ts` com `Map<engineId, CompiledEngine>` module-scope + helper `getCompiled(engineId, loader)`
   - **Declarar `export const runtime = "nodejs"` explicitamente** na rota — edge runtime recria isolate e invalida cache silenciosamente
   - Handler: `getCompiled()` → `run(compiled, inputs, opts)` → serializar
   - Log de cache hit/miss em dev para validação

9. **A.2** — Invalidação explícita do cache:
   - `PATCH /api/engines/:id` → `compiledCache.delete(engineId)` sempre que succeede (cobre mudança de `engine`, `name`, `project_id`)
   - `DELETE /api/engines/:id` → invalidar
   - **NÃO invalidar** em `POST /api/engines/:id/activate` (só muta `is_active`, engine não muda, `/api/calc/:id` não filtra por `is_active`)
   - **NÃO invalidar** em `POST /api/engines` (engine novo nunca esteve no cache)

10. **A.3 mínima** — Criar `lib/server/handleCalcError.ts` com 3 ramos em ordem:
    1. `if (err instanceof ZodError)` → **422** com shape `{ error: "Invalid engine config", validationErrors: [{ path, message }] }` — preserva 1-pra-1 o response atual, zero regressão para bruno/flows
    2. parse do prefix `^\[([A-Z_]+)\]\s*(.*)$` em `err.message` → `CYCLE_DETECTED` → 422, `RESOURCE_LIMIT_EXCEEDED` → 413, body `{ error: { code, message } }`
    3. fallback → **500** `{ error: { code: "UNKNOWN", message } }`
    
    Na Fase 2, ramos 1 e 2 colapsam em `if (err instanceof CalcError)` lendo `err.code` direto.

### Itens já concluídos (no trabalhar)

- **D.1** `[x]` no-op (ver revisão 2026-04-20 em `RUNTIME_REFACTOR_APP.md`)
- **D.2** `[x]` coberto por runtime 1.1 (nenhum trabalho adicional no app)

## Critério de saída

- Cenário médio < 1ms p99, grande < 5ms p99 no `yarn bench`
- Smoke test via bruno passando: `bruno/calc/*` e `bruno/flows/calc/*`
  - (Não há unit tests no projeto — verificação padrão é bruno + snapshot manual de JSON)
- App Next rodando normalmente
- Baseline **e** resultado pós-refactor registrados em `RUNTIME_REFACTOR_PROGRESS.md` → "Histórico de medições"

## Regras

- **Ler os 3 docs mestres completos** (PLAN + APP + PROGRESS) + Changelogs **antes** de escrever qualquer linha de código
- **Baseline bench (2.7) é pré-requisito absoluto** — não pular ordem, não otimizar sem baseline gravado
- **`CompiledEngine` escopo restrito** — apenas o que a Fase 1 precisa; pré-compute e indexação são Fase 3
- **`runtime = "nodejs"` na rota `/api/calc/[...segments]`** é obrigatório
- **Verificar cada item com:** `yarn build` + `yarn lint` + bruno smoke (quando aplicável) + `yarn bench` (após 2.7)
- **Commits separados por item** seguindo o padrão:
  - Runtime: `runtime: X.Y <descrição curta>` (ex.: `runtime: 1.2 separar compile de run`)
  - App: `app: X.Y <descrição curta>` (ex.: `app: A.1 migrar /api/calc para compile+run`)
- **Atualize `RUNTIME_REFACTOR_PROGRESS.md`** (contadores Parte 1 + Parte 2, tabelas de camada/fase, status) ao concluir cada item
- **Marque os checkboxes `[x]`** dentro de `RUNTIME_REFACTOR_PLAN.md` e `RUNTIME_REFACTOR_APP.md` conforme implementa
- **Qualquer desvio do plano** (mudança de escopo, decisão técnica): atualizar primeiro o Changelog do doc correspondente, só então executar
- **`CompiledEngine` é imutável em memória** — nunca serializar em disco, nunca tentar cross-process via Redis (não-serializável por design)
