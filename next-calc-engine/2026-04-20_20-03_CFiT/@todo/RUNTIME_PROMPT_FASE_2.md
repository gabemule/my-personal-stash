# Runtime Refactor — Prompt Fase 2 (Pré-extração como lib)

Preciso executar a **Fase 2 do runtime + Fase A2 do app** do roadmap de refactor. Esta fase é P0 e prepara o runtime para extração como pacote independente (consumível por serviço HTTP Express/Fastify).

**Pré-requisito:** Fase 1 + A1 concluídas (ver `@todo/RUNTIME_PROMPT_FASE_1.md`).

## Docs mestres (leitura obrigatória ANTES de começar)

**Leia os 3 arquivos completos.** O corpo de cada doc já reflete a solução final e é a fonte de verdade para implementação; os Changelogs ao final existem apenas para contexto histórico de como se chegou à decisão atual — consulte-os para entender o racional original, nunca como guia do que implementar:

- `@todo/RUNTIME_REFACTOR_PLAN.md` — plano runtime (4 camadas, 31 itens)
- `@todo/RUNTIME_REFACTOR_APP.md` — plano app (7 camadas A–G, 26 itens)
- `@todo/RUNTIME_REFACTOR_PROGRESS.md` — dashboard unificado (Parte 1 runtime + Parte 2 app)

Seções específicas desta fase:
- `RUNTIME_REFACTOR_PLAN.md` → seção "Fase 2 — Pré-extração como lib"
- `RUNTIME_REFACTOR_APP.md` → seção "Fase A2 — Pré-extração lib"
- `RUNTIME_REFACTOR_PROGRESS.md` → "Fase 2 — Pré-extração como lib [0/12]" (Parte 1) e "Fase A2 — Pré-extração lib" (Parte 2)

## Objetivo

Permitir extração limpa de `lib/runtime/` como pacote independente. Expor `CalcError` estruturado, unificar tipos via `z.infer`, eliminar fallbacks silenciosos, e documentar a API pública com JSDoc + README.

## Itens

### Runtime (`lib/runtime/`)

1. **1.4** — Criar `lib/runtime/errors.ts`:
   - Classe `CalcError extends Error` com propriedades: `code: CalcErrorCode`, `context?: Record<string, unknown>`, `message: string` (PT-BR default)
   - Union `CalcErrorCode` com os ~24 códigos listados em `RUNTIME_REFACTOR_PLAN.md` item 1.4 (ex.: `INVALID_ENGINE`, `VAR_NOT_FOUND`, `STEP_NOT_FOUND`, `DIV_BY_ZERO`, `CYCLE_DETECTED`, `RESOURCE_LIMIT_EXCEEDED`, `INVALID_INPUT`, etc.)
   - Substituir **TODOS** os `throw new Error(...)` em `evaluator.ts`, `execute.ts`, `decimalFactory.ts`, `compile.ts`, `run.ts` por `throw new CalcError(CODE, msg, ctx)`
   - **Colapsa os prefixes** `"[CYCLE_DETECTED] ..."` / `"[RESOURCE_LIMIT_EXCEEDED] ..."` da Fase 1 em `instanceof CalcError`
   - Em `execute()`/`run()`: serializar `CalcError` em `StepResult.error` preservando `code` (campo `errorCode?: CalcErrorCode` em `StepResult`)
   - Exportar `CalcError` e `CalcErrorCode` em `index.ts`
   - Nenhum `throw new Error` remanescente em `lib/runtime/` (validar via grep)

2. **3.1** — Eliminar fallback silencioso em input inválido:
   - Introduzir `RunOptions.onInvalidInput: "throw" | "zero" | "default"`, default `"throw"`
   - `"throw"` → `throw new CalcError("INVALID_INPUT", ...)`
   - `"zero"` → comportamento atual (silencioso → 0), com warning no trace se `debug`
   - `"default"` → tenta `defaultValue`, falha → lança
   - **Breaking change** — documentar no Changelog do PLAN + no README

3. **3.4** — `.min(1)` em `branches` no `ExpressionTokenSchema` (conditional). Mensagem de erro atualizada.

4. **3.8** — Extrair `TableRefToken` compartilhado:
   ```ts
   export interface TableRefToken {
     type: "tableRef"
     tableId: string
     columnId: string | null
     rowId?: string | null
     arguments?: Record<string, TableConditionSide>
   }
   ```
   Reutilizar em `ScalarToken` e `ExpressionToken` em `types.ts` e `schema.ts`.

5. **3.9** — Unificar tipos via `z.infer` (fonte única de verdade):
   - **Opção A (recomendada):** Zod schema é canônico; `types.ts` exporta `z.infer<typeof XxxSchema>` + unions derivados
   - Migrar todos os tipos de domínio: `EngineState`, `EngineConfig`, `Variable`, `LookupTable`, `Step`, `TableCondition`, etc.
   - `tsc --noEmit` verde; diff dos tipos inferidos revisado manualmente

6. **3.10** — Defaults explícitos no schema:
   - `Variable.kind` → `.default("input")`
   - `Variable.valueType` → `.default("number")`
   - `Step.kind` → `.default("output")` — **fix do bug silencioso** documentado no PLAN 2026-04-20 (comentário já dizia "output if omitted" mas `execute.ts:102` testa literal)
   - `Step.clamp` → `.default(false)`
   - Remover `?? "default"` redundantes em `evaluator.ts`/`execute.ts`
   - Registrar no Changelog como **correção de comportamento**, não breaking

7. **3.5 + 3.6** — Documentar semântica:
   - **3.5 Rounding:** JSDoc em `Step`, `EngineConfig.precision`, `evaluateExpression` explicitando que operações intermediárias usam `precision + 10`, resultado final de cada step é arredondado para `config.precision`, steps downstream consomem valor já arredondado. Exemplo de acumulação de arredondamentos.
   - **3.6 Clamp:** Auditar `execute.ts:92` — hoje clamp é display-only (`stepResults[step.id] = val` armazena não-clampado). **Decidir explicitamente** entre Opção A (manter display-only) ou Opção B (clamp afeta valor armazenado). Documentar decisão no JSDoc de `Step.clamp`.

8. **1.3 + 3.12** — JSDoc completo em toda API pública:
   - `index.ts`: cada `export` com `@param`, `@returns`, `@throws`, `@example`
   - `execute()`: formato de `engine`, contrato de `inputs`, semântica de retorno, `finalValue`, efeito de `options.debug`
   - `compile()` / `run()`: contrato de imutabilidade de `CompiledEngine`, thread-safety, quando preferir cada um, custo típico em ms, padrão de cache, aviso de não-serializabilidade
   - `createDecimalFactory()` / `DecimalFactory`: semântica de cada método + `precision + 10`
   - `evaluateExpression()` / `EvalContext`: documentar como API de baixo nível (uso avançado)
   - `EngineSchema`: `@example` com engine mínimo válido
   - Tipos de domínio: JSDoc em cada campo com semântica e restrições
   - `CalcError`: `@example` de tratamento no consumidor

9. **3.14** — Documentar `finalValue`:
   - JSDoc de `ExecuteResult.finalValue`: "valor do último step com `kind: 'output'` que executou com sucesso (não skipped por `when`). Steps `kind: 'internal'` ignorados. Se nenhum output executou, é `null`."
   - Adicionar `outputs: Record<stepId, string | null>` em `ExecuteResult` (**preparação para Fase 4** — aditivo, zero breaking)
   - Exemplo explícito: engine com múltiplos outputs

10. **3.13** — Criar `lib/runtime/README.md` com seções:
    - **Visão geral:** o que o runtime faz
    - **Conceitos:** Engine, Steps, Variables, Tables, Tokens, Conditions
    - **API pública:** `execute`, `compile`, `run`, `EngineSchema`, `CalcError`
    - **Semântica importante:** rounding, clamp, order-of-execution (topsort da Fase 1), output step, text vs number variables
    - **Exemplos:** (1) cálculo simples 2-3 steps sem tabela, (2) tabela 1D, (3) tabela 2D, (4) tabela parametrizada, (5) uso de `debug: true` + interpretação do trace
    - **Tratamento de erro:** `CalcError.code` + como rotear
    - **Performance:** quando preferir `compile()+run()` vs `execute()`, padrão de cache em memória, pré-aquecimento, imutabilidade
    - **Migração:** breaking changes da Fase 2 (`onInvalidInput`, `z.infer` se aplicável)
    - **Roadmap:** referência ao `RUNTIME_REFACTOR_PLAN.md`

### App (Next.js)

11. **A.3 completa** — Atualizar `lib/server/handleCalcError.ts`:
    - Ramo 1: `if (err instanceof CalcError)` lê `err.code` direto → mapeia para HTTP status (`INVALID_ENGINE`/`INVALID_INPUT` → 400, `RESOURCE_LIMIT_EXCEEDED` → 413, demais → 200 com `success: false`)
    - Ramos 1 e 2 da Fase 1 colapsam em um único bloco
    - Fallback `UNKNOWN` permanece como rede de segurança
    - Body JSON padronizado: `{ error: { code, message, context? } }`

12. **A.6** — Política de `onInvalidInput` nos 3 consumidores:
    - **Endpoint `/api/calc/:id`:** propagar throw do runtime por default (fail-loud). Aceitar override via body: `{ inputs, debug, onInvalidInput?: "throw" | "zero" | "default" }`. `CalcError("INVALID_INPUT")` → 400 com `{ error: { code, message, context: { varId, rawValue } } }`
    - **TestPanel do builder:** exibir erro inline no campo (campo destacado, sem crash da página)
    - **Calculator:** consumir HTTP 400 estruturado, exibir toast/mensagem apontando qual variável está com valor inválido
    - Breaking de comportamento — cliente externo que enviava input inválido e recebia 0 agora recebe 400. Documentar

13. **D.3** — Propagar mudança de `z.infer` chain:
    - Rodar `tsc --noEmit` no app após runtime 3.9
    - Corrigir imports/usos que quebrarem (potencialmente amplo: `EngineState`, `Step`, `Variable`, etc.)
    - Documentar diferenças no Changelog

14. **B.1** — Migrar test runner do `EngineBuilder`:
    - Hoje usa `createDecimalFactory + evaluateExpression` direto (API de baixo nível)
    - Migrar para: `compile(currentEngine)` memoizado via `useMemo` (dep = identidade do engine) + `run(compiled, inputs)` a cada mudança de input
    - Debounce obrigatório (compile em cada keystroke é caro)
    - Se `compile()` falha (ex.: ciclo): render erro amigável inline usando `CalcError.context`
    - Novo hook `useCompiledEngine` se ajudar

15. **B.2** — Reapontar imports de `validateParens` em `StepCard` se mudou de lugar na Fase 1/2 do runtime.

16. **E.1** — Revisar `schemas/api.ts` e `schemas/endpoints.ts`:
    - Verificar que imports de `EngineSchema` continuam válidos após runtime 3.9/3.10
    - Se há `.pick()`/`.omit()`/`.extend()` derivados, confirmar validade

17. **F.3** — `lib/exportState.ts` usa `compile()`:
    - Na importação JSON, rodar `compile()` em vez de só `EngineSchema.parse`
    - `compile()` captura erros estruturais (ciclos, recursos) que passariam no Zod mas quebrariam em runtime
    - Mensagens de erro amigáveis via `CalcError.code`/`context`
    - Considerar flag de override ("importar mesmo assim") se quiser permitir import de engine quebrado para edição

18. **E.3** — Padronizar shape de erro no contrato API:
    - Criar schema em `schemas/api.ts` (ou novo `schemas/errors.ts`): `{ error: { code: z.string(), message: z.string(), context: z.record(z.unknown()).optional() } }`
    - Reutilizar em todas as rotas que retornam erro estruturado (incluindo `/api/calc/:id` do item A.6)
    - Par natural de A.3 completa (item 11) — ambos entregam o novo shape unificado
    - Cliente HTTP (Calculator, TestPanel) passa a ler `error.code` em vez de string solta

19. **G.3** — Validação forte no JSON import:
    - UI de import (builder/admin) usa `compile()` além de `EngineSchema.parse` — reaproveita F.3 (item 17) no lado UX
    - Exibir lista de erros estruturados (`CalcError[]` ou iterar erros coletados) para o usuário corrigir antes de salvar
    - Destacar no formulário (ou modal) qual step/variável/tabela causou cada erro via `CalcError.context`
    - Complementa F.3 — F.3 garante que `compile()` roda no import; G.3 garante que a UI expõe o resultado de forma acionável

## Critério de saída


- Consumidor externo (script isolado) consegue importar de `lib/runtime/` sem arrastar código do Next
- Nenhum `throw new Error` remanescente em `lib/runtime/`
- `CalcError` exposto e testado via bruno + testes manuais dos cenários
- JSDoc completo (hover em VS Code mostra doc em cada export)
- `lib/runtime/README.md` criado e referenciado
- Comportamento de input inválido alinhado entre API/builder/calculator
- Smoke test via bruno passando: `bruno/calc/*` e `bruno/flows/calc/*`
- `yarn build` + `yarn lint` verdes

## Regras

- **Ler os 3 docs mestres completos** (PLAN + APP + PROGRESS) + Changelogs **antes** de escrever qualquer linha de código
- **Ordem recomendada:** 1.4 (`CalcError`) primeiro — destrava os demais itens que usam `instanceof CalcError`. Depois 3.1, 3.4, 3.8, 3.9, 3.10 (mudanças estruturais). Em seguida A.3 completa + A.6 no app. Finalizar com JSDoc (1.3/3.12), documentação semântica (3.5/3.6), `finalValue` (3.14), README (3.13), e itens restantes do app (D.3, B.1, B.2, E.1, F.3)
- **`CalcError` formal substitui in-place os prefixes da Fase 1** — `handleCalcError` detecta `instanceof CalcError` com prioridade, ramos 1 e 2 colapsam
- **Breaking changes explícitos** (3.1 `onInvalidInput`, 3.9 `z.infer`, 3.10 defaults) ganham entrada no Changelog do PLAN + seção de migração no README
- **Verificar cada item com:** `yarn build` + `yarn lint` + bruno smoke + `tsc --noEmit` (após 3.9)
- **Commits separados por item** seguindo o padrão:
  - Runtime: `runtime: X.Y <descrição curta>`
  - App: `app: X.Y <descrição curta>`
- **Atualize `RUNTIME_REFACTOR_PROGRESS.md`** (contadores Parte 1 + Parte 2) ao concluir cada item
- **Marque os checkboxes `[x]`** dentro de `RUNTIME_REFACTOR_PLAN.md` e `RUNTIME_REFACTOR_APP.md` conforme implementa
- **Qualquer desvio do plano:** atualizar primeiro o Changelog do doc correspondente
