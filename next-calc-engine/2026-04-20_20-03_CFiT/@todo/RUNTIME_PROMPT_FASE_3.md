# Runtime Refactor — Prompt Fase 3 (Otimização guiada por benchmark)

Preciso executar a **Fase 3 do runtime + Fase A3 do app** do roadmap de refactor. Esta fase é P1 e traz ganhos incrementais de performance baseados em medição — **não em chute**.

**Pré-requisito:** Fases 1+A1 e 2+A2 concluídas (ver `@todo/RUNTIME_PROMPT_FASE_1.md` e `@todo/RUNTIME_PROMPT_FASE_2.md`). Baseline de bench já registrado em `RUNTIME_REFACTOR_PROGRESS.md`.

## Docs mestres (leitura obrigatória ANTES de começar)

**Leia os 3 arquivos completos.** O corpo de cada doc já reflete a solução final e é a fonte de verdade para implementação; os Changelogs ao final existem apenas para contexto histórico de como se chegou à decisão atual — consulte-os para entender o racional original, nunca como guia do que implementar:

- `@todo/RUNTIME_REFACTOR_PLAN.md` — plano runtime (4 camadas, 31 itens)
- `@todo/RUNTIME_REFACTOR_APP.md` — plano app (7 camadas A–G, 26 itens)
- `@todo/RUNTIME_REFACTOR_PROGRESS.md` — dashboard unificado (Parte 1 runtime + Parte 2 app)

Seções específicas desta fase:
- `RUNTIME_REFACTOR_PLAN.md` → seção "Fase 3 — Otimização guiada por benchmark"
- `RUNTIME_REFACTOR_APP.md` → seção "Fase A3 — Otimização guiada"
- `RUNTIME_REFACTOR_PROGRESS.md` → "Fase 3 — Otimização guiada por benchmark [0/5]" (Parte 1) e "Fase A3 — Otimização guiada" (Parte 2)

## Objetivo

Ganhos incrementais de performance (`run()` hot-path) + UX refinada no app (visibility de skip/outputs, paramRef tipado).

**Princípio fundamental:** cada item roda com `yarn bench` antes/depois. **Se a otimização não melhorar (ou piorar), reverter com nota no Changelog explicando por quê.**

## Itens

### Runtime (`lib/runtime/`)

1. **2.1** — Cache de parse Zod por engine (via facade `execute()`):
   - `WeakMap<object, CompiledEngine>` em `execute.ts` — se mesma referência JS passada, retorna compilado cacheado
   - **Alternativa** (engine vem como JSON novo a cada request): hash estável via `fast-json-stable-stringify` + `LRU<hash, CompiledEngine>` tamanho configurável (ex.: 32)
   - JSDoc em `execute()` documenta que para serviço HTTP, `compile()` explícito é preferível
   - Bench: `execute()` repetido com mesma referência ≈ `run()` puro

2. **2.3** — Pré-computar `Decimal` de literais no `compile()`:
   - Percorrer todas expressões/condições transformando:
     - `{ type: "number", value: "1.5" }` → adicionar campo `decimal: D.from("1.5")` no token compilado
     - `{ kind: "number", value: "1000" }` em `TableConditionSide` idem
     - `defaultValue` das variáveis (pré-parseado)
     - `config.min`/`config.max` (usados no clamp)
     - Todos os valores literais de `TableRow.values` (por coluna)
   - Criar tipos internos `CompiledExpressionToken`, `CompiledConditionSide` (não exportados)
   - Adaptar `evaluator.ts` para consumir forma compilada — **eliminar `ctx.D.from(token.value)` no hot-path**
   - Bench: redução visível no tempo de `run()`; snapshot de resultados idêntico

3. **2.4** — Indexar tabelas de faixas numéricas (busca binária):
   - Durante `compile()`, detectar tabelas "de faixas" via heurística:
     - Todas as linhas (exceto possível default na última) têm `condition` com mesmo `left` (varRef/stepRef), ops em `<`/`<=`/`>=`/`>`, `right` tipo `number`
   - Pré-ordenar linhas pelo valor numérico + construir estrutura de busca binária
   - `evaluateTableRef` usa índice quando disponível; **fallback linear sempre existe**
   - Marcar tabelas indexadas em `CompiledEngine.meta.indexedTables: ReadonlySet<string>`
   - Teste unitário sintético com 500 linhas mostrando ganho O(log n) vs O(n)

4. **2.5** — **SÓ SE BENCH MOSTRAR GANHO.** Fundir `resolve + shunting-yard` em uma passada em `evaluator.ts`:
   - Hoje: 3 passadas (`map(resolveToken)` → shunting-yard → RPN evaluate)
   - Reescrever para passada única: resolver token e empurrar direto no stack/RPN conforme tipo
   - Manter legibilidade (funções nomeadas internamente)
   - Se bench não melhorar: **reverter** e registrar no Changelog

5. **3.7** — Tipagem explícita para `paramRef`:
   - Hoje `resolveConditionSide` em `paramRef` tenta `D.from(value)` e cai pra string no catch (magia)
   - Estender `LookupTable.parameters`: `string[]` → `Array<{ name: string; type: "number" | "text" }>`
   - Ajustar `schema.ts` + código que consome `parameters`
   - Em `resolveConditionSide`, usar tipo declarado em vez de inferir por try/catch
   - **Camada de compat:** aceitar forma antiga (`string[]`) por período, convertendo implícito para `{ name, type: "number" }` com warning (G.2 pode ser necessário)

### App (Next.js)

6. **B.3** — UI de `paramRef` no builder com tipo explícito:
   - Onde o autor define parâmetros de uma tabela, adicionar seletor de tipo (`number` | `text`) por parâmetro
   - Default: `number` (compat com forma antiga)
   - Mostrar aviso quando tabela antiga (`string[]`) é carregada — sugere conversão
   - Criar tabela parametrizada com param `text`, conferir que condition compara como string no `run()`

7. **B.5** — Render de skip/`STEP_SKIPPED` no trace do TestPanel (preparação para Fase 4):
   - Quando step é skipped, mostrar linha diferenciada (ex.: fonte apagada, ícone "⏭️") com `reason: "skipped" | "disabled" | "error"`
   - Em error flow (step refere outro skipped → `STEP_SKIPPED` dispara): mostrar erro inline no step origem apontando step alvo
   - Este item é preparação — o conteúdo efetivo só aparece quando Fase 4 (`Step.when`) for implementada

8. **A.5** — Expor `outputs` no response JSON do `/api/calc/:id`:
   - Se ainda não feito no item 3.14 da Fase 2, propagar `outputs: Record<stepId, string | null>` do `ExecuteResult` no JSON
   - Atualizar schema de response (se não coberto em E.2 da Fase 4)
   - Cliente antigo que só lê `finalValue` continua funcionando

9. **C.1** — `Calculator` consome `outputs`:
   - Atualizar tipo do response (via schema) para incluir `outputs`
   - UX default: continuar exibindo `finalValue` (retrocompat); engines com múltiplos outputs → exibir tabela `id → valor`
   - Engines sem branching: `outputs` tem 1 chave, `finalValue` = esse único valor

10. **C.2** — Exibir steps pulados no debug JSON:
    - Quando `debug: true` enviado ao `/api/calc/:id`, response inclui trace com skips
    - Renderizar trace de forma legível (toggle "Mostrar detalhes" expande JSON)
    - Complementa B.5 — lado público/calc

11. **A.4** — Pré-aquecimento opcional no boot do servidor:
    - Flag `WARMUP_ENABLED` (env var) — default `false`
    - Quando ligada, no boot: listar engines ativas no Supabase + chamar `compile()` para popular o cache em memória
    - Log estruturado de quantas engines foram aquecidas + tempo total
    - Útil em deploys com poucas engines muito usadas; desligar em deploys grandes (cold-boot mais lento)
    - Documentar tradeoff no README do app

12. **G.2** — Script de migração de engines (se 3.7/3.10 exigirem backfill):
    - Criar `scripts/migrate-engines.ts` (tsx) que:
      - Lê todas engines do Supabase
      - Aplica transformação idempotente (ex.: `parameters: string[]` → `Array<{ name, type: "number" }>`)
      - Valida via `EngineSchema.parse` + `compile()` após transformação
      - Dry-run por default; flag `--apply` para persistir
    - Só executar se 3.7 ou 3.10 mostrarem que a camada de compat não cobre casos reais no banco
    - Registrar no Changelog do APP quando rodado em produção

## Critério de saída


- Cada otimização runtime medida + comparada com baseline + resultado pós-refactor registrados em `RUNTIME_REFACTOR_PROGRESS.md` → "Histórico de medições"
- Itens revertidos (ex.: 2.5 se não melhorar) têm entrada explícita no Changelog explicando por quê
- Debug mode no Calculator mostra trace completo incluindo skips
- Consumidor do `/api/calc` pode escolher output por ID via UI (B.3) ou dados (C.1)
- Smoke test via bruno passando: `bruno/calc/*` e `bruno/flows/calc/*`
- `yarn build` + `yarn lint` verdes

## Regras

- **Ler os 3 docs mestres completos** (PLAN + APP + PROGRESS) + Changelogs **antes** de escrever qualquer linha de código
- **Bench é autoridade final** — cada item de runtime (2.1, 2.3, 2.4, 2.5) só fica no código se o bench mostrar ganho. 2.5 em particular foi marcado no PLAN como "só vale se benchmark mostrar"
- **Ordem recomendada:**
  1. Rodar `yarn bench` para revalidar baseline pós-Fase 2 (sanidade)
  2. Runtime: 2.1 → 2.3 → 2.4 → 2.5 (nesta ordem; 2.5 só se bench autorizar)
  3. Runtime: 3.7 (estrutural, não perf — pode ser feito em paralelo)
  4. App: A.5 → C.1 → C.2 (outputs end-to-end), depois B.3 (paramRef), depois B.5 (prep para Fase 4)
- **Reversão é obrigatória** se otimização não melhorar — código mais complexo sem ganho = dívida gratuita
- **Verificar cada item com:** `yarn build` + `yarn lint` + `yarn bench` (runtime) ou bruno smoke (app)
- **Commits separados por item** seguindo o padrão:
  - Runtime: `runtime: X.Y <descrição curta>`
  - App: `app: X.Y <descrição curta>`
- **Atualize `RUNTIME_REFACTOR_PROGRESS.md`** (contadores Parte 1 + Parte 2, tabela "Histórico de medições") ao concluir cada item
- **Marque os checkboxes `[x]`** dentro de `RUNTIME_REFACTOR_PLAN.md` e `RUNTIME_REFACTOR_APP.md` conforme implementa
- **Qualquer desvio do plano** (item revertido, escopo alterado): registrar no Changelog do doc correspondente
- **3.7 pode ser breaking** para engines com tabelas parametrizadas antigas — camada de compat é obrigatória, considerar G.2 (script de migração) da Fase 4 se necessário
