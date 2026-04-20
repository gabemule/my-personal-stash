# Runtime Refactor — App (Next.js)

> Plano complementar ao [`RUNTIME_REFACTOR_PLAN.md`](./RUNTIME_REFACTOR_PLAN.md), cobrindo **o lado aplicação Next.js**: API routes, builder, calculator, tipos/stores compartilhados, schemas, migração de dados.
>
> **Enquanto o PLAN cobre mudanças internas da `lib/runtime/`**, este documento cobre tudo que o app precisa adaptar para acompanhar essas mudanças (e tirar proveito delas).
>
> **Convenção:** cada item tem racional (“Por quê”), arquivos afetados, risco, referência ao(s) item(ns) do PLAN que o dispara, e critério de pronto. Itens marcados `- [ ]` pendente / `- [x]` concluído. Mudanças de escopo vão no **Changelog** no fim.
>
> **Progresso macro:** vive em [`RUNTIME_REFACTOR_PROGRESS.md`](./RUNTIME_REFACTOR_PROGRESS.md) — Parte 2 (App). **Não duplicar contadores aqui.**

---

## Sumário

- [Contexto](#contexto)
- [Camada A — API server-side](#camada-a--api-server-side)
- [Camada B — Cliente builder](#camada-b--cliente-builder)
- [Camada C — Cliente calc](#camada-c--cliente-calc)
- [Camada D — Tipos & shared state](#camada-d--tipos--shared-state)
- [Camada E — Schemas & contratos API](#camada-e--schemas--contratos-api)
- [Camada F — Stores & client state](#camada-f--stores--client-state)
- [Camada G — Data migration & compat](#camada-g--data-migration--compat)
- [Fases de execução (App)](#fases-de-execução-app)
- [Convenções gerais](#convenções-gerais)
- [Changelog](#changelog)

---

## Contexto

Hoje o app Next.js consome a `lib/runtime/` em 4 pontos principais:

1. **API route** `app/api/calc/[...segments]/route.ts` — chama `execute(engine, inputs, { debug })` por request, carregando o engine do Supabase a cada chamada.
2. **Builder** (`app/builder/components/EngineBuilder/index.tsx`) — usa `createDecimalFactory` e `evaluateExpression` direto (API de baixo nível) para o test runner inline.
3. **StepCard** (`app/builder/components/StepCard/index.tsx`) — consome `validateParens`.
4. **Calculator** (`app/calc/components/Calculator/index.tsx`) — consome o `ExecuteResult` do fetch para `/api/calc/:id`.

Em paralelo, `lib/types.ts` re-exporta tipos do runtime **e** define tipos puramente de UI (`UIState`, `AppState`, `TestResult`, `EditingNumber`) que hoje moram em `lib/runtime/types.ts` — contaminação que bloqueia a extração (item 1.1 do PLAN).

Os schemas de contrato de API (`schemas/api.ts`, `schemas/endpoints.ts`) importam `EngineSchema` direto da lib; stores (`stores/engineStore.ts`, `stores/requestStore.ts`) e `lib/exportState.ts` completam o acoplamento.

A refatoração da lib (compile/run, CalcError, z.infer, Step.when, outputs) **implica mudanças coordenadas em todos esses pontos**. Este documento organiza essas mudanças em 7 camadas (A–G) e 4 fases (A1–A4) que espelham as fases do PLAN.

---

## Camada A — API server-side

Escopo: `app/api/calc/[...segments]/route.ts` (endpoint principal de execução). Essa é a camada com maior ganho de performance no app — migrar o endpoint para `compile()+run()` com cache é o item âncora.

### A.1 Migrar handler para `compile()+run()` com cache

> Depende de: **runtime 1.2** (compile/run separados).

- [ ] Declarar `export const runtime = "nodejs"` explicitamente na rota. Cache em `Map` module-scope **não funciona em edge runtime** (cada invocação é um isolate novo). Ver `RUNTIME_REFACTOR_PLAN.md` seção 1.2.d.
- [ ] Introduzir `Map<engineId, CompiledEngine>` em module scope (vivo enquanto o processo Node vive).
- [ ] Função `getCompiled(engineId)` encapsula lookup + compile-on-miss.
- [ ] Handler do endpoint passa a: (a) buscar `compiled` do cache, (b) chamar `run(compiled, inputs, opts)`, (c) serializar `ExecuteResult`.
- [ ] Manter log de cache hit/miss em dev para validação.

**Por quê:** hoje cada request paga 2–10ms de validação Zod + construções. Com cache, só a primeira request por processo paga; demais servem em <1ms.

**Arquivos afetados:** `app/api/calc/[...segments]/route.ts`, possivelmente um novo `lib/runtime/cache.ts` (ou módulo no app) para encapsular o `Map`.

**Risco:** médio. O cache precisa ser invalidado corretamente (ver A.2) — cache stale servido após save do engine é bug crítico silencioso. Em serverless (Vercel/Lambda), cold start reseta cache — aceitável, cada instância paga `compile` uma vez por engine.

**Como verificar:** duas requests seguidas para o mesmo engineId → logs mostram miss + hit; response JSON idêntico ao antes; latência p99 cai dramaticamente na segunda em diante.

---

### A.2 Invalidação do cache no save/activate do engine

> Depende de: **A.1**.

- [ ] Identificar todos os endpoints/ações que modificam um engine (save, activate, delete).
- [ ] Em cada um, invalidar `compiledCache.delete(engineId)` após persistência bem-sucedida.
- [ ] Considerar invalidação em lote (ex.: admin deleta categoria com N engines) — API interna se necessário.
- [ ] Documentar no código do cache que a invalidação é **explícita** (sem TTL).

**Por quê:** sem invalidação explícita, admin salva um engine novo e o próximo request ainda usa a versão compilada antiga. Cache stale em motor de cálculo fiscal = bug crítico.

**Arquivos afetados:** endpoints de persistência (provavelmente em `app/api/engines/...`), módulo de cache.

**Risco:** médio. Esquecer de invalidar em algum ponto = bug silencioso.

**Como verificar:** teste manual: salvar engine com mudança visível (ex.: trocar valor de constante) → próximo `/api/calc/:id` reflete a mudança.

---

### A.3 Handler estruturado de `CalcError` → HTTP status + código

> Depende de: **runtime 1.4**.

- [ ] Criar helper `handleCalcError(err: unknown): NextResponse` que:
  - Se `err instanceof CalcError`: mapeia `err.code` para HTTP status (ex.: `INVALID_ENGINE` → 422, `RESOURCE_LIMIT_EXCEEDED` → 413, demais execução → 200 com `success: false`).
  - Caso contrário: 500 com log.
- [ ] Retornar body JSON com `{ error: { code, message, context? } }` padronizado.
- [ ] Usar no endpoint `/api/calc/...` e em qualquer outro handler que chama `compile()`/`run()`.

**Por quê:** hoje qualquer erro vira string no JSON sem diferenciação. Cliente não consegue rotear (ex.: mostrar toast para "INVALID_INPUT", modal para "RESOURCE_LIMIT_EXCEEDED").

**Arquivos afetados:** novo `lib/server/handleCalcError.ts` (ou similar), `app/api/calc/[...segments]/route.ts`.

**Risco:** baixo.

**Como verificar:** teste disparando cada tipo de erro (input inválido, engine inválido, limite excedido) retorna status/código correto.

---

### A.4 Pré-aquecimento opcional no boot

> Depende de: **A.1**.

- [ ] Função `warmupCache(engineIds: string[])` que roda `getCompiled` em paralelo.
- [ ] Invocar no boot do servidor (ex.: no `instrumentation.ts` do Next, ou primeira request).
- [ ] Critério para escolher quais engines pré-aquecer: `is_active = true` + uso recente (log/tracking).
- [ ] Tornar opcional via env var (`WARMUP_ENABLED=true`).

**Por quê:** cold start do primeiro request por engine paga o compile. Para engines críticos/hot, pré-aquecer elimina esse pico.

**Arquivos afetados:** `instrumentation.ts` (ou equivalente), módulo de cache.

**Risco:** baixo. Feature opcional.

**Como verificar:** em dev, com warmup ligado, primeira request ao engine pré-aquecido tem latência igual ao cache hit.

---

### A.5 Expor `outputs` no response JSON

> Depende de: **runtime 4.3**.

- [ ] Quando `ExecuteResult` ganha `outputs: Record<stepId, string | null>`, propagar campo no JSON do endpoint.
- [ ] Se o response hoje tem shape custom (não `ExecuteResult` direto), atualizar.
- [ ] Documentar no schema de response (ver E.2).

**Por quê:** cliente com múltiplos outputs (após Camada 4 do runtime) precisa de query por ID, não só `finalValue`.

**Arquivos afetados:** `app/api/calc/[...segments]/route.ts`, schemas em `schemas/`.

**Risco:** mínimo (aditivo).

**Como verificar:** endpoint retorna `outputs` no JSON; cliente antigo que só lê `finalValue` continua funcionando.

---

### A.6 Política de `onInvalidInput` no endpoint e consumidores

> Depende de: **runtime 3.1** (fallback silencioso substituído por `throw CalcError("INVALID_INPUT")`).

- [ ] Decidir política default do endpoint `/api/calc/:id`. **Recomendação:** propagar o throw do runtime (fail-loud). Aceitar override via body: `{ inputs, debug, onInvalidInput?: "throw" | "zero" | "default" }`.
- [ ] Em `respond()` (ou equivalente), passar `onInvalidInput` para `execute()`/`run()` via `RunOptions`.
- [ ] `CalcError("INVALID_INPUT")` deve ser mapeado em A.3 para HTTP 400 com body `{ error: { code: "INVALID_INPUT", message, context: { varId, rawValue } } }`.
- [ ] **Test runner do builder (B.1):** quando o usuário digita valor inválido num input, hoje não quebra; após 3.1 vai lançar. Exibir erro inline no campo do TestPanel em vez de deixar a UI explodir.
- [ ] **Calculator (C.1):** consumir o HTTP 400 estruturado, exibir mensagem amigável ao usuário apontando qual variável está com valor inválido.

**Por quê:** sem contraparte explícita no app, runtime 3.1 quebra silenciosamente três superfícies (endpoint, builder, calculator). Este item amarra as três pontas.

**Arquivos afetados:** `app/api/calc/[...segments]/route.ts`, `app/builder/components/TestPanel/*` (ou EngineBuilder), `app/calc/components/Calculator/index.tsx`, `schemas/endpoints.ts` (body aceita `onInvalidInput` opcional).

**Risco:** médio. É breaking de comportamento — cliente externo que hoje envia input vazio/inválido e recebia 0 passa a receber 400. Documentar na mudança de contrato.

**Como verificar:**
- POST com `inputs: { x: "abc" }` → 400 com `error.code === "INVALID_INPUT"`.
- POST com `inputs: { x: "abc" }, onInvalidInput: "zero"` → 200 com `x` tratado como 0 (comportamento legado disponível sob opt-in).
- TestPanel com input inválido: campo destacado, sem crash da página.
- Calculator com input inválido: toast/mensagem apontando a variável, sem tela branca.

---

## Camada B — Cliente builder

Escopo: `app/builder/components/EngineBuilder/index.tsx`, `StepCard/index.tsx`, `TestPanel`.

### B.1 Migrar test runner do EngineBuilder para `compile()+run()`

> Depende de: **runtime 1.2**.

- [ ] Hoje o builder usa `createDecimalFactory` + `evaluateExpression` direto para cada step isoladamente (dev loop rápido).
- [ ] Migrar para: `compile(currentEngine)` memorizado (`useMemo` dependente da identidade do engine) + `run(compiled, inputs)` a cada mudança de input.
- [ ] Benefício: builder valida estrutura do engine enquanto o usuário edita (forward refs, ciclos, recursos — itens 1.5/3.2/3.3 do PLAN).
- [ ] Se `compile()` falha (ex.: ciclo), renderizar erro amigável inline apontando os steps envolvidos (usar `CalcError.context`).

**Por quê:** uniformizar o test runner do builder com a API canônica garante que o autor vê no builder exatamente o que a API de produção retornaria. Hoje existe risco de divergência.

**Arquivos afetados:** `app/builder/components/EngineBuilder/index.tsx`, possivelmente um novo hook `useCompiledEngine`.

**Risco:** médio. `compile()` pode ser "caro" em cada keystroke — memorização + debounce são obrigatórios.

**Como verificar:** editar engine no builder, ver trace idêntico ao que `/api/calc/:id` retorna para o mesmo input.

---

### B.2 Reapontar imports de `validateParens`

> Depende de: refactor interno do PLAN que mova `validateParens` de lugar (se acontecer).

- [ ] Auditar se `validateParens` continua exportado em `lib/runtime/index.ts` após a Fase 1/2 do PLAN.
- [ ] Se mudar de caminho, atualizar import em `StepCard/index.tsx`.

**Por quê:** mudança trivial de manutenção; só listada para não quebrar o build.

**Arquivos afetados:** `app/builder/components/StepCard/index.tsx`.

**Risco:** nenhum.

**Como verificar:** build verde.

---

### B.3 UI de `paramRef` com tipo explícito (`number` | `text`)

> Depende de: **runtime 3.7**.

- [ ] No builder, onde o autor define parâmetros de uma tabela, adicionar seletor de tipo (`number` | `text`) por parâmetro.
- [ ] Default: `number` (compat com forma antiga).
- [ ] Mostrar aviso quando uma tabela antiga (`string[]`) é carregada — sugere conversão.

**Por quê:** hoje o tipo é inferido por try/catch (magia). Explicitar no UI é mais honesto e evita bugs de comparação.

**Arquivos afetados:** componentes do builder para edição de tabela (descobrir arquivo específico ao executar).

**Risco:** baixo (UI apenas).

**Como verificar:** criar tabela parametrizada com param `text`, conferir que a condition compara como string no run.

---

### B.4 UI para configurar `Step.when`

> Depende de: **runtime 4.1**.

- [ ] No `StepCard`, adicionar seção "Executar quando (opcional)" — campo que aceita uma `TableCondition` (reusar componente já existente do TableRow editor se possível).
- [ ] Preview inline: "Este step só executa se <resumo da condição>". Se `when` vazio, preview "Sempre executa".
- [ ] Validação no builder: campo `when` não pode referenciar steps declarados depois (já vai falhar no `compile()` do item 3.3 do PLAN; mas UI deve avisar antes de salvar).

**Por quê:** sem UI, o usuário não tem como usar branching. Ter UI é a diferença entre feature viva e feature fantasma.

**Arquivos afetados:** `app/builder/components/StepCard/index.tsx` (ou arquivo equivalente que edita Step).

**Risco:** médio. A UI precisa acomodar todos os tipos de `TableConditionSide` (varRef, stepRef, number, text).

**Como verificar:** criar engine de 3 regimes (ex.: Simples/Lucro Real/Presumido) no builder inteiro sem precisar editar JSON manualmente.

---

### B.5 Render de `STEP_SKIPPED` / skip reason no trace

> Depende de: **runtime 4.1** e **4.2**.

- [ ] No TestPanel/trace do builder, quando um step é skipped, mostrar linha diferenciada (ex.: fonte apagada, ícone "⏭️") com `reason: "skipped" | "disabled" | "error"`.
- [ ] No error flow (step refere outro skipped e `STEP_SKIPPED` dispara): mostrar erro inline no step origem apontando o step alvo.

**Por quê:** debugging de branching sem visibilidade do skip é adivinhação. Trace explícito reduz o loop de debug.

**Arquivos afetados:** TestPanel no builder.

**Risco:** nenhum (UI apenas).

**Como verificar:** engine com `when` condicional — trocar input que ativa/desativa branch, ver o trace mudar.

---

## Camada C — Cliente calc

Escopo: `app/calc/components/Calculator/index.tsx`.

### C.1 Consumir `outputs: Record<stepId, string | null>` do response

> Depende de: **A.5** e **runtime 4.3**.

- [ ] Atualizar tipo do response (via schema em E.2) para incluir `outputs`.
- [ ] Decidir UX: por padrão continuar exibindo `finalValue` (retrocompat); para engines com múltiplos outputs, exibir tabela `id → valor`.
- [ ] Engines sem branching continuam funcionando idênticos (outputs tem 1 chave, finalValue = esse único valor).

**Por quê:** sem consumir `outputs`, o Calculator só mostra o último output — o benefício da Camada 4 do runtime fica invisível ao usuário final.

**Arquivos afetados:** `app/calc/components/Calculator/index.tsx`.

**Risco:** baixo.

**Como verificar:** engine com 3 outputs (via `when`) — Calculator exibe os 3 resultados (ou o ativo do branch).

---

### C.2 Exibir steps pulados no debug JSON

- [ ] Quando `debug: true` é enviado ao `/api/calc/:id`, o response inclui trace com skips (já implementado em B.5 no builder; aqui é o lado calc/public).
- [ ] Renderizar o trace de forma legível (toggle "Mostrar detalhes" expande JSON).

**Por quê:** usuário avançado ou QA precisa ver por que um output não apareceu. Sem o trace, é caixa preta.

**Arquivos afetados:** `app/calc/components/Calculator/index.tsx`.

**Risco:** nenhum.

**Como verificar:** debug mode em engine com branching mostra trace com entradas tipo `{ type: "step-skip", reason: "when=false" }`.

---

## Camada D — Tipos & shared state

Escopo: `lib/types.ts`, `hooks/useEngineState.ts`, `lib/runtime/types.ts` (lado app).

### D.1 Limpar `lib/types.ts` ~~(no-op)~~

> **Revisão 2026-04-20:** este item é **no-op**. Auditoria mostrou que `lib/types.ts` **não re-exporta** nenhum dos 4 tipos UI do runtime — ele define `TestResult`, `EditingNumber`, `UIState`, `AppState` localmente. Os únicos consumidores (`hooks/useEngineState.ts`) já importam de `@/lib/types`. Nenhuma mudança necessária aqui quando runtime 1.1 for aplicado.

- [x] Confirmado: `lib/types.ts` não precisa de mudança.

**Por quê (histórico):** temia-se duplicação após remoção do runtime 1.1, mas a duplicação já existe hoje e é funcional — `lib/types.ts` é a casa canônica dos tipos UI.

---

### D.2 Remover tipos UI de `lib/runtime/types.ts` ~~(coberto por runtime 1.1)~~

> **Revisão 2026-04-20:** este item é **o mesmo que runtime 1.1** sob outro nome. Marcar como coberto por 1.1; sem trabalho próprio no app.

- [x] Coordenado com runtime 1.1. Sem arquivos adicionais no app — nenhum consumidor importa esses tipos de `@/lib/runtime`.

**Arquivos afetados:** nenhum do app (runtime 1.1 cuida de `lib/runtime/types.ts`).

**Risco:** nenhum.

**Como verificar:** idem runtime 1.1.

---

### D.3 Propagar mudança de `z.infer` chain nos consumidores

> Depende de: **runtime 3.9**.

- [ ] Quando a lib muda para `z.infer` como fonte única, os tipos exportados podem ter diferenças sutis (opcional vs `undefined` explícito, etc.).
- [ ] Rodar `tsc --noEmit` no app após o runtime 3.9 — corrigir imports/usos que quebrarem.
- [ ] Documentar diferenças em `CHANGELOG.md` geral do projeto.

**Por quê:** migração estrutural da lib reflete em todos os consumidores tipados.

**Arquivos afetados:** potencialmente amplo — qualquer arquivo que importa `EngineState`, `Step`, `Variable`, etc.

**Risco:** médio — mudanças podem ser muitas, mas o TS acusa todas.

**Como verificar:** `tsc --noEmit` verde; smoke test do app ok.

---

### D.4 Acomodar `Step.when` no `AppState`/`UIState` do app

> Depende de: **runtime 4.1**.

- [ ] Se `AppState` ou `UIState` embutem cópia de `Step`, adicionar `when?` conforme o tipo do runtime.
- [ ] Validar com o app rodando que a serialização/desserialização do estado local preserva `when`.

**Por quê:** sem acomodar, UI de edição do `when` (B.4) não consegue persistir.

**Arquivos afetados:** `lib/types.ts`, `stores/*` (provavelmente coberto em F.1).

**Risco:** baixo.

**Como verificar:** editar `when` no builder, salvar, recarregar, valor preservado.

---

## Camada E — Schemas & contratos API

Escopo: `schemas/api.ts`, `schemas/endpoints.ts`.

### E.1 Revisar `EngineSchema` / api.ts

> Depende de: **runtime 3.9** e **3.10**.

- [ ] Verificar que `api.ts` e `endpoints.ts` continuam importando `EngineSchema` corretamente após a migração para `z.infer`.
- [ ] Se os schemas de API reutilizam partes do `EngineSchema` via `.pick()`, `.omit()`, `.extend()`, garantir que continuem válidos.

**Por quê:** mudança estrutural no schema canônico pode invalidar derivações sem erro explícito.

**Arquivos afetados:** `schemas/api.ts`, `schemas/endpoints.ts`.

**Risco:** baixo.

**Como verificar:** testes de parse dos schemas de request/response passam.

---

### E.2 Adicionar schema de response com `outputs`

> Depende de: **runtime 4.3** e **A.5**.

- [ ] Schema de response do `/api/calc/:id` (em `endpoints.ts`) ganha `outputs: z.record(z.string().nullable())`.
- [ ] Opcional: também incluir campos de trace/debug como schema tipado.

**Por quê:** contrato API tipado = cliente e servidor não podem divergir silenciosamente.

**Arquivos afetados:** `schemas/endpoints.ts`.

**Risco:** mínimo (aditivo).

**Como verificar:** parse bem-sucedido de response simulado com e sem `outputs` populado.

---

### E.3 Padronizar shape de erro no contrato API

> Depende de: **runtime 1.4** e **A.3**.

- [ ] Schema de erro: `{ error: { code: z.string(), message: z.string(), context: z.record(z.unknown()).optional() } }`.
- [ ] Reutilizar em todas as rotas.

**Por quê:** cliente precisa tipar os erros para rotear/exibir. Shape unificado evita ifs mágicos.

**Arquivos afetados:** `schemas/api.ts` (ou novo `schemas/errors.ts`).

**Risco:** baixo.

**Como verificar:** handler A.3 + schema parse confirmam compatibilidade.

---

## Camada F — Stores & client state

Escopo: `stores/engineStore.ts`, `stores/requestStore.ts`, `lib/exportState.ts`.

### F.1 `engineStore` aceita campo `when` em steps

> Depende de: **runtime 4.1**.

- [ ] Se o store define próprio tipo de step (ou reexpõe do runtime), adicionar `when?`.
- [ ] Actions que criam/editam step devem aceitar/preservar `when`.

**Por quê:** sem isso, a UI de `when` (B.4) não consegue persistir localmente.

**Arquivos afetados:** `stores/engineStore.ts`.

**Risco:** baixo.

**Como verificar:** ação que edita step preserva `when` após round-trip store.

---

### F.2 `requestStore` consome novo response shape

> Depende de: **runtime 4.3** e **E.2**.

- [ ] Tipo de response armazenado no store ganha `outputs`.
- [ ] Selectors/derivações que hoje leem `finalValue` continuam funcionando; novos selectors para `outputs` por ID.

**Por quê:** o Calculator (C.1) consome do store; este é o plumbing.

**Arquivos afetados:** `stores/requestStore.ts`.

**Risco:** mínimo (aditivo).

**Como verificar:** Calculator renderiza `outputs` via selector.

---

### F.3 `exportState` usa `compile()` para validação forte

> Depende de: **runtime 1.2**.

- [ ] Na importação JSON (`exportState.importXxx` ou similar), rodar `compile()` em vez de só `EngineSchema.parse`.
- [ ] `compile()` captura erros estruturais (ciclos, forward refs, recursos) — imports que passariam no Zod mas quebrariam em runtime agora falham cedo.
- [ ] Mensagens de erro amigáveis baseadas em `CalcError.code`/`context`.

**Por quê:** import silencioso de engine quebrado é péssima UX. Validação forte pré-import evita pesadelos depois.

**Arquivos afetados:** `lib/exportState.ts`.

**Risco:** médio — pode rejeitar imports que antes "passavam" mas não rodavam. Considerar flag de override ("importar mesmo assim").

**Como verificar:** importar engine com ciclo → erro claro; importar engine válido → passa.

---

## Camada G — Data migration & compat

### G.1 Compatibilidade Supabase: engines sem `when`

> Depende de: **runtime 4.1**.

- [ ] `when` é opcional (`z.nullable().optional()`), então engines sem o campo continuam válidos automaticamente.
- [ ] Documentar que **não há migração obrigatória** — apenas engines que quiserem usar branching precisam ser editados.
- [ ] Smoke test: carregar engine existente do Supabase → `compile()` OK → `run()` OK.

**Por quê:** retrocompatibilidade é não-negociável.

**Arquivos afetados:** documentação; teste de integração.

**Risco:** nenhum, se a opcionalidade for respeitada.

**Como verificar:** carregar 5 engines aleatórios existentes no ambiente de staging; todos rodam sem erro.

---

### G.2 Script de migração para quebras potenciais

> Depende de: **runtime 3.7** (paramRef tipado) ou **3.10** (defaults explícitos) se forem breaking.

- [ ] Auditar, quando os itens 3.7/3.10 do PLAN forem aplicados, se engines salvos precisam de migração.
- [ ] Se sim, escrever script standalone (ex.: `scripts/migrate-engines.ts`) que itera pelo Supabase, aplica a transformação, persiste.
- [ ] Executar em staging primeiro; dry-run mode obrigatório.

**Por quê:** mudanças breaking sem migração = engines quebrados em produção.

**Arquivos afetados:** novo script em `scripts/`.

**Risco:** alto (operação sobre dados de produção). Sempre dry-run + backup antes.

**Como verificar:** dry-run reporta N engines afetados; execução real em staging + smoke test confirma sucesso.

---

### G.3 Validação forte no JSON import

> Depende de: **F.3**.

- [ ] Na UI de import (se houver upload de JSON), usar `compile()` além do schema parse.
- [ ] Exibir lista de erros estruturados (`CalcError[]`) para o usuário corrigir.

**Por quê:** complementa F.3 do lado do usuário.

**Arquivos afetados:** componente de import no builder/admin.

**Risco:** baixo.

**Como verificar:** upload de JSON inválido mostra erros claros; válido importa.

---

## Fases de execução (App)

As fases do App acompanham as do PLAN (Runtime). Cada fase do App só faz sentido após a fase correspondente do Runtime estar avançada o suficiente para expor a nova API.

### Fase A1 — Pré-produção

**Pré-requisito:** Fase 1 do PLAN em andamento. Ver ordem cronológica em `RUNTIME_REFACTOR_PLAN.md` → "Fase 1 — Ordem de execução recomendada". Os itens A.1–A.3 vêm **depois** dos runtime 1.1, 2.7 (baseline), 2.2, 1.2, 3.2/3.3, 1.5 estarem prontos — só faz sentido migrar o endpoint quando a API `compile()+run()` existe.

**Objetivo:** app compilando e rodando sobre o novo `compile/run` sem regressão funcional.

**Ordem de execução recomendada (cronológica):**

1. **D.1 + D.2** — já marcados como concluídos (no-op após revisão 2026-04-20).
2. **A.1** — migrar handler para `compile()+run()` com cache + `runtime = "nodejs"`. Depende de runtime 1.2 finalizado.
3. **A.2** — invalidação do cache nos endpoints de persistência de engine. Depende de A.1 pronto; só aí descobre onde plugar o `compiledCache.delete()`.
4. **A.3** — handler de `CalcError`. Tecnicamente depende de runtime 1.4 (que é Fase 2), mas o envelope `{ error: { code, message } }` pode ser desenhado já em A.1/A.2 com `code` aberto pra receber depois os códigos formais. Implementar versão mínima aqui, completar quando Fase 2 do runtime aterrissar.

- [x] D.1 — no-op (ver D.1 revisado)
- [x] D.2 — coberto por runtime 1.1 (ver D.2 revisado)
- [ ] A.1 — compile+run + cache na API (com `runtime = "nodejs"` explícito)
- [ ] A.2 — Invalidação do cache
- [ ] A.3 — Handler de `CalcError` no endpoint

**Critério de saída:** API `/api/calc/:id` responde no mesmo shape atual; cache validado manualmente (logs hit/miss, bruno `bruno/calc/calculate.bru` retornando 200); app Next rodando normalmente; nenhum UI type residual em `lib/runtime/`.

---

### Fase A2 — Pré-extração lib

**Pré-requisito:** Fase 2 do PLAN em andamento.

**Objetivo:** eliminar qualquer uso que impediria a extração da lib; propagar mudanças de contrato.

- [ ] A.6 — Política de `onInvalidInput` no endpoint + consumidores (par com runtime 3.1)
- [ ] D.3 — Propagar `z.infer` chain
- [ ] B.1 — Migrar test runner do builder para compile+run
- [ ] B.2 — Reapontar imports de `validateParens` (se necessário)
- [ ] E.1 — Revisar `EngineSchema` / api.ts
- [ ] F.3 — `exportState` usa `compile()`

**Critério de saída:** nenhum arquivo de `lib/runtime/` importa código de UI; builder e test runner usam a mesma API canônica; contratos de API atualizados; comportamento de input inválido alinhado entre API/builder/calculator.

---

### Fase A3 — Otimização guiada

**Pré-requisito:** Fase 3 do PLAN em andamento + benchmark runtime estabelecido.

**Objetivo:** observabilidade e UX refinada — visibility para skip/outputs.

- [ ] B.3 — UI de `paramRef` tipado
- [ ] B.5 — Render de skip/STEP_SKIPPED no trace
- [ ] A.5 — Expor `outputs` no response (se ainda não feito)
- [ ] C.1 — Consumir `outputs` no Calculator
- [ ] C.2 — Exibir skips no debug JSON

**Critério de saída:** debug mode mostra trace completo incluindo skips; consumidor do `/api/calc` pode escolher output por ID via UI.

---

### Fase A4 — Branching

**Pré-requisito:** Fase 4 do PLAN concluída. **Exige Fase A1 concluída** (depende de compile/run + CalcError).

**Objetivo:** feature de branching exposta no UI, com migração transparente de engines antigos.

- [ ] B.4 — UI para configurar `Step.when`
- [ ] D.4 — Acomodar `when` no `AppState`
- [ ] E.2 — Schema de response com `outputs`
- [ ] F.1 — `engineStore` aceita `when`
- [ ] F.2 — `requestStore` novo response shape
- [ ] G.1 — Compat Supabase para engines sem `when`

**Critério de saída:** engine de exemplo com 3 regimes de cálculo rodando end-to-end (builder → API → calculator); migração transparente (engines antigos continuam funcionando sem mudança de dados).

---

## Convenções gerais

- Commits referenciam o item: `app: A.1 migrar /api/calc para compile+run`.
- Breaking changes visíveis ao usuário → registrar no Changelog aqui **e** no `CHANGELOG.md` geral do projeto (se houver).
- Progresso macro é trackeado em [`RUNTIME_REFACTOR_PROGRESS.md`](./RUNTIME_REFACTOR_PROGRESS.md) — Parte 2 (App). **Não duplicar contadores aqui.**
- Cada item App deve apontar para o(s) item(ns) do PLAN que o dispara (tag "Depende de" no corpo).
- Desvios de plano → atualizar este documento (Changelog) **antes** de executar.

---

## Changelog

> Registro de decisões, desvios, e descobertas durante a execução.

- **2026-04-19** — Documento criado como complemento ao `RUNTIME_REFACTOR_PLAN.md`, organizando o impacto da refatoração do runtime sobre o app Next.js.
  - Mapeados 4 pontos de acoplamento existentes: API route, EngineBuilder, StepCard, Calculator.
  - 7 camadas definidas (A–G) com ~25 itens e 4 fases (A1–A4) espelhando as do PLAN.
  - Cada item referencia o(s) item(ns) do PLAN que o dispara.
  - Progresso macro consolidado em `RUNTIME_REFACTOR_PROGRESS.md` (Parte 2), sem arquivo de progresso próprio.

- **2026-04-20** — **Ordem de execução explícita na Fase A1.** Adicionada sequência cronológica (D.1/D.2 já `[x]` → A.1 → A.2 → A.3) + cross-ref pro bloco correspondente em `RUNTIME_REFACTOR_PLAN.md`. Motivação: alinhar com a nova ordem da Fase 1 do runtime — app não consegue migrar pra `compile()+run()` antes da lib expor essas funções.

- **2026-04-20** — Revisão crítica pré-execução:
  - **D.1 / D.2 marcados como no-op.** Auditoria mostrou que `lib/types.ts` já é a casa canônica dos 4 tipos UI (`UIState`, `AppState`, `TestResult`, `EditingNumber`) e nenhum consumidor importa esses tipos de `@/lib/runtime`. Runtime 1.1 só precisa apagar as linhas mortas em `lib/runtime/types.ts`; nenhum trabalho recai sobre o app.
  - **A.1 ganhou checkbox `runtime = "nodejs"`.** Cache `Map` module-scope depende disso; edge runtime recria isolate e invalida cache silenciosamente. Ver PLAN 1.2.d.
  - **Novo A.6 — Política de `onInvalidInput`.** Runtime 3.1 muda default para `throw CalcError("INVALID_INPUT")`; endpoint/builder/calculator precisam tratar explicitamente (antes estava sem item correspondente). Item entra em Fase A2.
  - Contadores da Parte 2 do PROGRESS atualizados: Camada A passa de 5 para 6 itens.
