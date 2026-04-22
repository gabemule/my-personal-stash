# Name Sanitization — Plano completo

> Plano **self-contained** para sanitizar `Variable.name` e `Step.name` diretamente (sem campo `slug` separado) e travar o formato via schema + migração one-shot. `name` continua sendo a chave pública da API `/api/calc/:engineId` em `inputs`, `outputs` e `errors`. Runtime intocado: expressões continuam referenciando por `id` interno.

---

## Sumário

- [Contexto](#contexto)
- [Decisões-chave (já batidas)](#decisões-chave-já-batidas)
- [Regras de formato](#regras-de-formato)
- [Helper `lib/sanitize.ts`](#helper-libsanitizets)
- [Checklist por camada](#checklist-por-camada)
  - [S.1 — Helper + schema validation](#s1--helper--schema-validation)
  - [S.2 — Script de migração TS (one-shot)](#s2--script-de-migração-ts-one-shot)
  - [S.3 — UI do builder](#s3--ui-do-builder)
  - [S.4 — API boundary (`/api/calc`)](#s4--api-boundary-apicalc)
  - [S.5 — Docs Bruno](#s5--docs-bruno)
- [Ordem de execução](#ordem-de-execução)
- [Critério de saída global](#critério-de-saída-global)
- [Decisões diferidas](#decisões-diferidas)
- [Progresso](#progresso)
- [Changelog](#changelog)

---

## Contexto

O contrato público do `/api/calc/:engineId` já é keyado por `Variable.name` / `Step.name` (em `inputs` do request, `outputs` e `errors` do response). O que falta:

1. **Zero validação de formato.** `z.string()` cru em `VariableSchema.name` e `StepSchema.name` (`lib/runtime/schema.ts`) aceita qualquer coisa: `""`, `"Anos Sem Sinistro"`, `"Área %"`, emoji. Tudo vira chave JSON — feio e frágil.
2. **Colisão silenciosa.** Duas variables com `name` igual: o `remapNamesToIds` em `app/api/calc/[...segments]/route.ts` faz **first-wins** sem avisar. O consumidor não percebe que perdeu input.
3. **Ergonomia do consumidor.** Chave `"Anos Sem Sinistro"` força bracket notation (`inputs["Anos Sem Sinistro"]`); `anos_sem_sinistro` permite dot (`inputs.anos_sem_sinistro`).

Hoje não temos **nenhuma** sanitização nem deduplicação — confirmado via `search_files`. `ADD_VARIABLE` já gera `"var_${id}"` (válido), mas `ADD_STEP`/`INSERT_STEP` em `hooks/useEngineState.ts` geram `"Etapa N"` (**inválido** — maiúscula + espaço). `UPDATE_VARIABLE`/`UPDATE_STEP` passam `e.target.value` cru do input. A única `sanitize*` existente (`sanitizeConditionOp`) é pra operador de `TableCondition`, sem relação.

---

## Decisões-chave (já batidas)

Entram como fato, não estão mais abertas a debate:

1. **Sem campo `slug` separado.** `name` é a chave pública, ponto. YAGNI — se algum dia precisarmos de rótulo humano livre, adicionamos `label?: string` opcional como addon.
2. **Helper em `lib/sanitize.ts`** (não `lib/slug.ts`). Exporta `sanitizeName(name, fallbackPrefix)` e `ensureUnique(base, used)`.
3. **Migração via script TypeScript** (não SQL). Single source of truth: `sanitizeName` vive em um lugar só. `supabase.from("engines").update(...)`.
4. **Sanitização na UI ocorre no `onBlur`.** Permite digitar `"Anos Sem Sinistro"` e ver virar `anos_sem_sinistro` ao sair do campo. `onChange` travaria o cursor no meio da digitação.
5. **Aplicar em `Variable` e todos os `Step`** (inclusive `kind: "internal"` — vão virar chave em `debug.steps[]` eventualmente).
6. **Não aplicar em `LookupTable.name`, `Engine.name`, `TableColumn.label`, `TableRow.label`.** Nenhum desses vira chave JSON do contrato público — são rótulos cosméticos.
7. **Namespaces de unicidade separados.** `name` único dentro de `variables[]` e dentro de `steps[]`. Uma variable e um step **podem** ter o mesmo nome entre si (`inputs.x` vs `outputs.x` — chaves JSON diferentes).
8. **Runtime intocado.** `lib/runtime/execute.ts` e `evaluator.ts` continuam consumindo `id` interno. Sanitização é só no boundary da UI/API.

---

## Regras de formato

- **Regex:** `^[a-z][a-z0-9_]*$`
  - Começa com letra minúscula (evita `_foo`, `1foo`)
  - Contém apenas `[a-z0-9_]`
- **Algoritmo `sanitizeName(name, fallbackPrefix)`**:
  1. Normalize Unicode (`.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`) — remove acento.
  2. `toLowerCase()`.
  3. Substituir qualquer run de `[^a-z0-9]+` por `_`.
  4. Trim `_` das pontas.
  5. Se resultado vazio → retorna `fallbackPrefix`.
  6. Se começa com dígito → prefixa `${fallbackPrefix}_`.
- **Dedup (`ensureUnique(base, used)`):**
  - Se `base` não está em `used` → retorna `base`.
  - Senão tenta `base_2`, `base_3`, … até achar livre.
- **Namespace de unicidade:**
  - `variables[*].name` único entre variables do mesmo engine.
  - `steps[*].name` único entre steps do mesmo engine.
  - Variable e Step **podem** compartilhar name entre si.

---

## Helper `lib/sanitize.ts`

```ts
// lib/sanitize.ts — novo arquivo

/**
 * Sanitize a user-provided name into the canonical API key format:
 * `^[a-z][a-z0-9_]*$`. Strips accents, lowercases, replaces non-alnum runs
 * with `_`, trims edges. Falls back to `fallbackPrefix` on empty input and
 * prefixes it when result starts with a digit.
 */
export function sanitizeName(name: string, fallbackPrefix = "item"): string {
  const stripped = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  let slug = stripped.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  if (!slug) return fallbackPrefix
  if (/^[0-9]/.test(slug)) slug = `${fallbackPrefix}_${slug}`
  return slug
}

/**
 * Returns `base` if unused, otherwise appends `_2`, `_3`, … until unique.
 */
export function ensureUnique(base: string, used: Set<string>): string {
  if (!used.has(base)) return base
  let i = 2
  while (used.has(`${base}_${i}`)) i++
  return `${base}_${i}`
}
```

---

## Checklist por camada

### S.1 — Helper + schema validation

**Objetivo:** criar o helper e travar o formato via Zod.

**Arquivos:**
- `lib/sanitize.ts` — **novo** (ver acima).
- `lib/runtime/schema.ts`:
  - `VariableSchema.name`: `z.string().regex(/^[a-z][a-z0-9_]*$/, "nome inválido: use [a-z0-9_], começando com letra")`.
  - `StepSchema.name`: idem.
  - `EngineSchema`: adicionar `.superRefine(...)` (ou `.refine(...)`) verificando unicidade de `variables[*].name` e `steps[*].name` (namespaces separados), citando o nome duplicado na mensagem.

**Critério de pronto:**
- `EngineSchema.safeParse` rejeita engine com `variable.name === "Anos Sem Sinistro"` com mensagem acionável.
- Rejeita engine com dois steps de mesmo `name`.
- Aceita variable e step compartilhando `name` entre si.
- `sanitizeName("Anos Sem Sinistro")` → `"anos_sem_sinistro"`.
- `sanitizeName("Área %")` → `"area"`.
- `sanitizeName("123 abc", "var")` → `"var_123_abc"`.
- `sanitizeName("", "var")` → `"var"`.
- `ensureUnique("x", new Set(["x", "x_2"]))` → `"x_3"`.

---

### S.2 — Script de migração TS (one-shot)

**Objetivo:** sanitizar todos os engines existentes no banco antes de S.1 entrar em prod.

**Arquivos:**
- `scripts/migrations/2026-04-21-sanitize-names.ts` — **novo**. Entrypoint `tsx` / `ts-node`.
- `scripts/migrations/README.md` — **novo** (se não existir). Documentar como rodar.

**Comportamento:**
- Lê env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Busca todos os registros da tabela `engines` (`select id, engine`).
- Pra cada registro:
  - `engine.variables`: pra cada variable, se `name` já obedece a regex, mantém; senão aplica `sanitizeName(name, "var")`. Dedup via `ensureUnique` contra os `name` já atribuídos no array.
  - `engine.steps`: idem com fallback `"etapa"`.
  - Se houve qualquer mudança, atualiza via `supabase.from("engines").update({ engine }).eq("id", id)`.
- **Flags:**
  - Default: `--dry-run` (imprime diff por engine, não grava).
  - `--apply`: grava no banco.
  - `--engine <id>`: restringe a um engine (útil pra teste manual).
- Imprime resumo: `X engines processados, Y names sanitizados, Z colisões resolvidas, W engines atualizados`.

**Importante:** o script **usa o mesmo `sanitizeName`/`ensureUnique` de `lib/sanitize.ts`** via import. Zero duplicação de lógica.

**Idempotência:**
- Roda 2x sem efeito colateral: name já válido é preservado; `ensureUnique` só toca em colisões reais.
- Se operador editar name manualmente no banco depois de rodar, próxima execução não toca em names já válidos.

**Critério de pronto:**
- Dry-run em staging mostra transformação esperada pra pelo menos 5 engines.
- `--apply` em staging: todos os engines passam no `EngineSchema.safeParse` estrito (S.1).
- Segunda execução de `--apply` mostra `0 engines atualizados`.

---

### S.3 — UI do builder

**Objetivo:** garantir que a UI só produz names válidos.

**Arquivos:**
- `hooks/useEngineState.ts`:
  - Imports: `sanitizeName`, `ensureUnique` de `@/lib/sanitize`.
  - `ADD_VARIABLE`: já gera `"var_${id}"` (válido), manter. Como guarda-chuva, aplicar `ensureUnique(base, usedVarNames)` — caso o id colida com um name editado manualmente.
  - `ADD_STEP` / `INSERT_STEP`: **bug atual** — geram `"Etapa ${N}"` (inválido). Trocar por `ensureUnique(sanitizeName("etapa", "etapa") + "_" + N, usedStepNames)` ou similar. Decisão concreta: gerar `etapa_${N}` e aplicar `ensureUnique` contra `engine.steps`.
  - `UPDATE_VARIABLE`: se `patch.name !== undefined`, aplicar:
    ```ts
    const used = new Set(engine.variables.filter(x => x.id !== action.id).map(x => x.name))
    patch.name = ensureUnique(sanitizeName(patch.name, "var"), used)
    ```
  - `UPDATE_STEP`: idem com fallback `"etapa"` e `engine.steps`.

- `app/builder/components/VariablesPanel/index.tsx`:
  - Input continua com `value={v.name}` e `onChange={(e) => dispatch({ type: "UPDATE_VARIABLE", id: v.id, patch: { name: e.target.value } })}`.
  - **Problema:** hoje o `onChange` já dispara o reducer, que (pós-S.3) vai sanitizar no mesmo instante → trava o cursor.
  - **Solução:** controlled local state pro input + dispatch só no `onBlur`:
    ```tsx
    const [draft, setDraft] = useState(v.name)
    useEffect(() => setDraft(v.name), [v.name])
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== v.name) dispatch({ type: "UPDATE_VARIABLE", id: v.id, patch: { name: draft } }) }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
    />
    ```
  - Extrair esse padrão pra um pequeno hook `useSanitizedNameInput(v.name, onCommit)` se a repetição em `StepCard` doer; caso contrário, duplicar inline (YAGNI).

- `app/builder/components/StepCard/index.tsx`:
  - Mesma mudança no input de `step.name`.

**Critério de pronto:**
- Criar uma variável nova: aparece com `name: "var_7"` (válido).
- Criar um step novo: aparece com `name: "etapa_1"` (válido — antes era `"Etapa 1"`).
- Editar `name` de variable pra `"Anos Sem Sinistro"` e tirar o foco: vira `anos_sem_sinistro`.
- Editar pra um name que gere colisão: vira `anos_sem_sinistro_2` automaticamente.
- Salvar engine via `engineStore.updateEngine` → `EngineSchema.safeParse` passa.

---

### S.4 — API boundary (`/api/calc`)

**Objetivo:** aproveitar a garantia de unicidade dada pelo schema (S.1).

**Arquivos:**
- `app/api/calc/[...segments]/route.ts`:
  - Remover o comentário/fallback de first-wins em `remapNamesToIds` (se houver) — schema estrito agora garante unicidade na entrada. Se duas variables tiverem mesmo `name`, a engine nem chega a essa função: `EngineSchema.safeParse` rejeita antes.
  - JSDoc (opcional): mencionar que o `name` obedece regex `^[a-z][a-z0-9_]*$` no contrato público.

**Breaking behavior (intencional):**
- Cliente externo que enviava `inputs["Anos Sem Sinistro"]` passa a ver esse valor como chave desconhecida (ignorada ou erro, dependendo de como `inputSchema()` trata `unknownKeys`). Migração no lado do banco (S.2) garante que o `Variable.name` persistido é `anos_sem_sinistro`.
- Documentar no Changelog.

**Critério de pronto:**
- `POST /api/calc/:engineId` com body legado `{ "Anos Sem Sinistro": "10" }` → valor ignorado / erro; a variável usa default.
- Body novo `{ "anos_sem_sinistro": "10" }` → funciona.
- Engine com names duplicados é rejeitado no POST antes de chegar ao runtime.

---

### S.5 — Docs Bruno

**Objetivo:** micro-update documentando o formato.

**Arquivos:**
- `bruno/calc/calculate.bru`: adicionar uma linha na doc: "O campo `name` (chave de `inputs` e `outputs`) obedece `^[a-z][a-z0-9_]*$` — letras minúsculas, dígitos e underscore."
- `bruno/calc/get-schema.bru`: idem.
- `bruno/flows/calc/*`: idem onde fizer sentido.

Bodies de exemplo já estão em snake_case (após B.5 parcial). Sem mudança de payload.

**Critério de pronto:**
- Bruno `calc/*` passa verde.
- Docs citam o formato explicitamente.

---

## Ordem de execução

1. **S.2** — Script + `lib/sanitize.ts` (o helper em si, sem alterar schema ainda). Commit isolado.
   - `--dry-run` staging → `--apply` staging → smoke nos engines → `--dry-run` prod → `--apply` prod.
2. **S.1** — Regex + refine no schema. Commit pequeno, só é mergeado depois que S.2 rodou em prod.
   - Se algum engine escapar (novo criado entre S.2 e S.1), vai falhar no `safeParse` com mensagem clara; roda o script de novo.
3. **S.3** — UI sanitiza `onBlur`; reducer aplica `sanitizeName` + `ensureUnique`. Commit isolado.
4. **S.4 + S.5** — Commit pequeno junto ou logo depois de S.1.

---

## Critério de saída global

- [ ] `sanitizeName("Anos Sem Sinistro")` → `"anos_sem_sinistro"`.
- [ ] `sanitizeName("Área %")` → `"area"`.
- [ ] `sanitizeName("123 abc", "var")` → `"var_123_abc"`.
- [ ] `sanitizeName("", "var")` → `"var"`.
- [ ] `ensureUnique("x", new Set(["x","x_2"]))` → `"x_3"`.
- [ ] `EngineSchema.safeParse` rejeita `name` inválido e `name` duplicado dentro de variables ou steps.
- [ ] Script `2026-04-21-sanitize-names.ts` é idempotente (`--apply` duas vezes = `0 engines atualizados` na segunda).
- [ ] Builder UI: criar/editar variable/step gera sempre `name` válido; blur sanitiza input livre.
- [ ] POST `/api/calc/:engineId` com body em snake_case funciona; com chaves antigas é ignorado/erro.
- [ ] Bruno `calc/*` verde com docs atualizadas.
- [ ] Smoke staging: 5 engines aleatórios carregam + executam pós-migração sem erro.

---

## Decisões diferidas

- **Campo `label?: string` opcional em `Variable`/`Step`.** Pra exibir rótulo humano livre no builder/calc sem afetar a chave JSON. Só fazemos se alguém reclamar de UX. Fora da v1.
- **Sanitização em `LookupTable.name` / `Engine.name`.** Só vira necessário se algum dia esses campos virarem chave JSON de API. Hoje são cosméticos. Fora da v1.
- **Mensagem de erro específica no POST quando chave do request é desconhecida.** Hoje `inputSchema()` pode simplesmente ignorar; se quisermos "chave `Anos Sem Sinistro` não existe — você quis dizer `anos_sem_sinistro`?", é mudança no `inputSchema` com `.strict()` + catch. Fora da v1.

---

## Progresso

- **Última atualização:** 2026-04-21 (documento reescrito — abandonado o plano de `slug`)
- **Status global:** 🔴 não iniciado
- **Total de itens:** 5 commits principais (S.1 a S.5)

### Checklist

- [ ] **S.1** Helper `lib/sanitize.ts` + regex/refine em `VariableSchema`/`StepSchema`/`EngineSchema`
- [ ] **S.2** Script `scripts/migrations/2026-04-21-sanitize-names.ts` + dry-run/apply em staging e prod
- [ ] **S.3** UI do builder: reducer sanitiza em `ADD_*`/`UPDATE_*`; inputs commitam no `onBlur`
- [ ] **S.4** `/api/calc`: remover fallback first-wins; atualizar JSDoc
- [ ] **S.5** Bruno docs citam formato `^[a-z][a-z0-9_]*$`

---

## Changelog

- **2026-04-21 (v2)** — Documento **reescrito do zero** após discussão de YAGNI. Abandonado o plano de adicionar campo `slug` separado coexistindo com `name` livre. Novo plano: **`name` é a chave pública e única**, sanitizada diretamente via `sanitizeName` (helper em `lib/sanitize.ts`). Migração one-shot via **script TS** (não SQL) usando `supabase-js` + service role, compartilhando a função de sanitização com o runtime (single source of truth). UI sanitiza no `onBlur` de inputs de `Variable.name` e `Step.name`. Schema Zod ganha regex `^[a-z][a-z0-9_]*$` e `.refine()` de unicidade. Runtime intocado. Motivação concreta: Barney sinalizou overengineering no plano de `slug` — `"eh mais jogo simplesmente santizar o name, passar um script sanitizando tudo de name q tivermos no banco q nao esteja no formato certo, e reforçar a validacao para so aceitar o novo formato de agora em diante"`.
- **2026-04-21 (v1 — obsoleto)** — Primeira versão propunha campo `slug` separado, preview mono abaixo do input, migração one-shot populando `slug`. Rejeitado por overengineering: adicionava camada redundante (dois campos: um livre + um derivado) sem necessidade real — se o consumidor da API já teria que usar o derivado, mais simples sanitizar o próprio `name` e pronto.
