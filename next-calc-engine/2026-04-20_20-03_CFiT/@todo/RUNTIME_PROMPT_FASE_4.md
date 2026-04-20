# Runtime Refactor — Prompt Fase 4 (Branching & features)

Preciso executar a **Fase 4 do runtime + Fase A4 do app** do roadmap de refactor. Esta fase é P1 e habilita fluxos condicionais entre steps (ex.: engine com 3 regimes Simples / Lucro Real / Lucro Presumido).

**Pré-requisito OBRIGATÓRIO:** Fase 1+A1 concluídas (precisa de `compile()` do item 1.2 e `CalcError` do item 1.4 — `STEP_SKIPPED` é novo código). Fases 2 e 3 são recomendadas mas não bloqueantes para Fase 4.

## Docs mestres (leitura obrigatória ANTES de começar)

**Leia os 3 arquivos completos.** O corpo de cada doc já reflete a solução final e é a fonte de verdade para implementação; os Changelogs ao final existem apenas para contexto histórico de como se chegou às decisões atuais (inclusive as de 2026-04-19 sobre o modelo filter-based) — consulte-os para entender o racional original, nunca como guia do que implementar:

- `@todo/RUNTIME_REFACTOR_PLAN.md` — plano runtime (4 camadas, 31 itens)
- `@todo/RUNTIME_REFACTOR_APP.md` — plano app (7 camadas A–G, 26 itens)
- `@todo/RUNTIME_REFACTOR_PROGRESS.md` — dashboard unificado (Parte 1 runtime + Parte 2 app)

Seções específicas desta fase:
- `RUNTIME_REFACTOR_PLAN.md` → seção "Camada 4 — Branching & features" + "Fase 4 — Branching & features"
- `RUNTIME_REFACTOR_APP.md` → seção "Fase A4 — Branching"
- `RUNTIME_REFACTOR_PROGRESS.md` → "Camada 4 — Branching & features [0/5]" e "Fase 4 — Branching & features [0/5]" (Parte 1), "Fase A4 — Branching" (Parte 2)

## Objetivo

Habilitar fluxos condicionais entre steps via campo opcional `Step.when?: TableCondition`. Engine de exemplo com 3 regimes de cálculo rodando end-to-end (builder → API → calculator), com migração transparente de engines antigos.

## Decisões-chave já tomadas (não rediscutir)

Registradas no Changelog do PLAN (2026-04-19):

1. **Modelo:** _filter-based_ — cada step ganha campo opcional `when: TableCondition`. **Não** criar grafo explícito com arestas. Reusa `TableCondition` que já existe, retrocompatível.
2. **Política de `stepRef` para step skipped:** fail-loud. `CalcError("STEP_SKIPPED", { stepId })` por padrão. Padrão recomendado: combinar `when` nos steps-branch + `conditional` token no step consumidor para rotear.
3. **`conditional` token faz lazy evaluation:** só resolve a branch matched. Branches não-matched não são resolvidas (evita `STEP_SKIPPED` espúrio).
4. **Múltiplos outputs:** `outputs: Record<stepId, string | null>` em `ExecuteResult` (já preparado na Fase 2, item 3.14). `finalValue` permanece como "último output executado" (retrocompat).
5. **Precedência:** `enabled: false` (design-time) tem precedência sobre `when` — se enabled=false, `when` nem é avaliado.

## Itens

### Runtime (`lib/runtime/`)

1. **4.1** — Estender `Step` com `when?: TableCondition`:
   - `types.ts`: adicionar campo opcional `when?: TableCondition | null`
   - `schema.ts`: `StepSchema` ganha `when: TableConditionSchema.nullable().optional()`
   - `compile.ts`: análise de grafo considera `when` (dependências adicionais de `varRef`/`stepRef` dentro de `when` entram no topsort do item 3.3)
   - `run.ts`: **antes** de avaliar `step.expression`, avaliar `step.when` se existir. Se `when` avaliar `false`, pular o step (marca `stepResults[id] = { value: null, reason: "skipped" }`)
   - `when` executa no mesmo contexto da expression: pode usar `varRef`, `stepRef` (para steps já executados), `number`, `text`
   - Trace em debug: `{ type: "step-skip", reason: "when=false", detail: "..." }`
   - JSDoc completo em `Step.when` explicando semântica, precedência vs `enabled`, exemplos
   - Engines sem `when` continuam funcionando idênticos

2. **4.2** — Política de `stepRef` / `when` referenciando step skipped:
   - Estrutura interna de `stepResults`: `{ value: string | null, reason: "ok" | "skipped" | "disabled" | "error" }`
   - `evaluator.ts` ao resolver `stepRef` para alvo com `reason === "skipped"`: **lançar `CalcError("STEP_SKIPPED", { stepId })`**
   - Steps desabilitados (enabled: false) mantêm comportamento atual: `CalcError("STEP_DISABLED")`
   - **Escape hatch obrigatório:** garantir que `conditional` token faz **lazy evaluation** — só resolve o `stepRef` da branch matched. A branch não matched **não** é resolvida (evita `STEP_SKIPPED` espúrio ao usar `conditional` para rotear)
   - Adicionar `STEP_SKIPPED` ao enum `CalcErrorCode` (Fase 2, item 1.4)
   - **Não implementar agora:** flag `RunOptions.onSkippedStepRef: "throw" | "null"` — abrir issue se demanda aparecer depois

3. **4.3** — Expor `outputs: Record<stepId, string | null>` em `ExecuteResult`:
   - Se não feito na Fase 2 (item 3.14), implementar agora
   - Populado com todo step `kind: "output"` que executou com sucesso; chave = `step.id`, valor = `formatted` (string)
   - Steps output skipped/erro: **valor = `null`** (aparecem no objeto, permite consumidor iterar por todos os outputs conhecidos)
   - `finalValue` permanece inalterado: último output executado
   - JSDoc detalhado explicando relação `outputs` vs `finalValue`
   - Teste: engine com 3 outputs, 1 skipped por `when` → `outputs` tem 2 chaves com valor + 1 com null; `finalValue` é o último dos 2 que rodou

4. **4.4** — Documentar branching no `README.md` (complementa item 3.13 da Fase 2):
   - Nova seção "Branching entre steps":
     - Explicação conceitual do modelo `when`
     - **Exemplo completo:** engine com 3 regimes de cálculo (ex.: Simples / Lucro Presumido / Lucro Real), selecionado por variável `tipoEmpresa`
     - Padrão recomendado: `when` nos steps-branch + `conditional` token no step consumidor para rotear
     - **Anti-padrões:** `stepRef` direto para step com `when` (vai quebrar se condição falhar)
     - Política de erro (`STEP_SKIPPED`) e como lidar
     - Trace em debug mode exibindo step-skips

5. **4.5** — Cenário de benchmark com branching (complementa item 2.7):
   - Adicionar cenário "branching intenso" em `lib/runtime/__bench__/engine.bench.ts`:
     - Engine com 30+ steps, metade tendo `when` baseado em variável de entrada
     - Variações de input que ativam diferentes caminhos
   - Medir overhead de avaliar `when` vs não ter `when` (baseline)
   - Confirmar que skip de step é **O(1)** após avaliar `when` (não avalia expression)
   - **Meta:** overhead de `when` < 50μs por step (comparável a `conditional` simples)

### App (Next.js)

6. **B.4** — UI para configurar `Step.when` no `StepCard`:
   - Adicionar seção "Executar quando (opcional)" — campo que aceita uma `TableCondition`
   - **Reusar componente** já existente do TableRow editor se possível
   - Preview inline: "Este step só executa se <resumo da condição>". Se `when` vazio: "Sempre executa"
   - Validação no builder: `when` não pode referenciar steps declarados depois (topsort do runtime 3.3 vai reordenar, mas UI deve avisar cedo)
   - Acomodar todos os tipos de `TableConditionSide` (varRef, stepRef, number, text)

7. **D.4** — Acomodar `Step.when` no `AppState`/`UIState`:
   - Se `AppState` ou `UIState` (em `lib/types.ts`) embutem cópia de `Step`, adicionar `when?` conforme tipo do runtime
   - Validar que serialização/desserialização do estado local preserva `when`
   - Editar `when` no builder → salvar → recarregar → valor preservado

8. **E.2** — Schema de response com `outputs`:
   - Schema de response do `/api/calc/:id` em `schemas/endpoints.ts` ganha `outputs: z.record(z.string().nullable())`
   - Opcional: incluir campos de trace/debug como schema tipado também

9. **F.1** — `engineStore` aceita `when`:
   - Se o store define tipo próprio de step (ou reexpõe do runtime), adicionar `when?`
   - Actions de criar/editar step aceitam e preservam `when`
   - Round-trip store preserva o campo

10. **F.2** — `requestStore` consome novo response shape:
    - Tipo de response armazenado ganha `outputs`
    - Selectors/derivações atuais que leem `finalValue` continuam funcionando
    - Novos selectors para `outputs` por ID (consumido pelo `Calculator` em C.1 se ainda não feito na Fase 3)

11. **G.1** — Compatibilidade Supabase:
    - `when` é opcional (`z.nullable().optional()`) — engines sem o campo continuam válidos automaticamente
    - Documentar: **não há migração obrigatória**. Apenas engines que quiserem usar branching precisam ser editados
    - Smoke test em staging: carregar 5 engines existentes aleatórios do Supabase → `compile()` OK → `run()` OK

## Critério de saída

- Engine de exemplo com 3 regimes de cálculo rodando end-to-end (builder → API → calculator), escolhido por variável `tipoEmpresa`
- Testes cobrindo edge-cases de `stepRef` para skipped:
  - `stepRef(S)` direto com S skipped → erro `STEP_SKIPPED`
  - `conditional` com 2 branches, uma aponta pra step skipped, condição escolhe a outra → OK, não lança
  - `conditional` que escolhe branch com step skipped → lança `STEP_SKIPPED`
- Bench mostra overhead de `when` dentro do orçamento (< 50μs por step)
- Migração transparente: 5 engines antigos sem `when` funcionam sem edição em staging
- Smoke test via bruno passando: `bruno/calc/*` e `bruno/flows/calc/*`
- `yarn build` + `yarn lint` verdes

## Regras

- **Ler os 3 docs mestres completos** (PLAN + APP + PROGRESS) + Changelogs **antes** de escrever qualquer linha de código
- **Pré-requisito absoluto:** Fase 1+A1 concluídas. **Não** começar Fase 4 sem `compile()` + `CalcError` prontos
- **Decisões de 2026-04-19 estão travadas** — não rediscutir modelo (filter-based), política (fail-loud + `STEP_SKIPPED`), lazy evaluation do `conditional`, ou múltiplos outputs
- **Ordem recomendada:**
  1. Runtime: 4.1 (campo `when` + avaliação) → 4.2 (política `STEP_SKIPPED` + lazy `conditional`) → 4.3 (`outputs` se não feito) → 4.5 (bench)
  2. App (em paralelo conforme runtime libera): E.2 (schema) → F.1 (store) → F.2 (requestStore) → D.4 (state) → B.4 (UI do `when`) → G.1 (smoke test staging)
  3. Runtime: 4.4 (README) por último — precisa de código estabilizado pra escrever exemplos
- **Retrocompatibilidade é não-negociável** — engines existentes sem `when` devem funcionar sem mudança de dados
- **`conditional` lazy evaluation é crítico** — teste rigoroso aqui. Se a branch não-matched for avaliada, `STEP_SKIPPED` dispara espúrio e quebra o padrão recomendado inteiro
- **Verificar cada item com:** `yarn build` + `yarn lint` + bruno smoke + `yarn bench` (runtime 4.5) + smoke test em staging (G.1)
- **Commits separados por item** seguindo o padrão:
  - Runtime: `runtime: 4.X <descrição curta>`
  - App: `app: X.Y <descrição curta>`
- **Atualize `RUNTIME_REFACTOR_PROGRESS.md`** (contadores Parte 1 Camada 4 / Fase 4 + Parte 2 Fase A4) ao concluir cada item
- **Marque os checkboxes `[x]`** dentro de `RUNTIME_REFACTOR_PLAN.md` e `RUNTIME_REFACTOR_APP.md` conforme implementa
- **Qualquer desvio do plano:** atualizar primeiro o Changelog do doc correspondente, só então executar
