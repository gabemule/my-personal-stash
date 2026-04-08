# Feature Spec: Tabelas Parametrizadas (Parameterized Lookup Tables)

## 1. Motivação

### Problema Atual
Quando múltiplas variáveis precisam usar a mesma lógica de ranges (ex: 70 faixas de valores), temos que:
- Duplicar tabelas inteiras (uma para cada variável) → viola DRY
- Ou usar conditional tokens com N branches referenciando linhas fixas → lógica repetitiva

### Solução Proposta
Tabelas que aceitam **parâmetros** (como funções), permitindo:
- Definir ranges UMA vez
- Reusar a mesma tabela com diferentes inputs
- Passar variáveis, steps, ou valores literais como argumentos

### Casos de Uso
1. **Faixas de valores duplicadas**: LMI e LMI_Agravo usando mesmas 70 faixas
2. **Tabelas genéricas**: Tabela de alíquotas que recebe "categoria" como parâmetro
3. **Composição**: Step calcula valor intermediário → passa como argumento para tabela

---

## 2. Schema Changes

### 2.1. LookupTable Type

**Antes:**
```typescript
interface LookupTable {
  id: string
  name: string
  rowLabelHeader?: string
  columns: TableColumn[]
  rows: TableRow[]
}
```

**Depois:**
```typescript
interface LookupTable {
  id: string
  name: string
  rowLabelHeader?: string
  parameters?: string[]           // NOVO: lista de nomes de parâmetros
  columns: TableColumn[]
  rows: TableRow[]
}
```

### 2.2. TableConditionSide Type

**Antes:**
```typescript
type TableConditionSide =
  | { kind: "number"; value: string }
  | { kind: "varRef"; target: string }
  | { kind: "stepRef"; target: string }
  | { kind: "text"; value: string }
```

**Depois:**
```typescript
type TableConditionSide =
  | { kind: "number"; value: string }
  | { kind: "varRef"; target: string }
  | { kind: "stepRef"; target: string }
  | { kind: "text"; value: string }
  | { kind: "paramRef"; target: string }   // NOVO: referência a parâmetro da tabela
```

### 2.3. ExpressionToken (tableRef)

**Antes:**
```typescript
{
  type: "tableRef"
  tableId: string
  columnId: string | null
  rowId?: string | null
}
```

**Depois:**
```typescript
{
  type: "tableRef"
  tableId: string
  columnId: string | null
  rowId?: string | null
  arguments?: Record<string, TableConditionSide>  // NOVO: mapa param → valor
}
```

### 2.4. ScalarToken (tableRef)

**Antes:**
```typescript
{
  type: "tableRef"
  tableId: string
  columnId: string | null
  rowId?: string | null
}
```

**Depois:**
```typescript
{
  type: "tableRef"
  tableId: string
  columnId: string | null
  rowId?: string | null
  arguments?: Record<string, TableConditionSide>  // NOVO: mapa param → valor
}
```

---

## 3. Runtime Implementation

### 3.1. Contexto de Avaliação

**Criar novo tipo interno:**
```typescript
interface EvaluationContext {
  variables: Record<string, string>
  stepResults: Record<string, string>
  tableParams?: Record<string, string>  // NOVO: parâmetros resolvidos da tabela
}
```

### 3.2. Resolver TableConditionSide com paramRef

**Em `evaluator.ts`, função `resolveSide()`:**

```typescript
function resolveSide(side: TableConditionSide, ctx: EvaluationContext): string {
  switch (side.kind) {
    case "number":
      return side.value
    case "text":
      return side.value
    case "varRef":
      return ctx.variables[side.target] ?? "0"
    case "stepRef":
      return ctx.stepResults[side.target] ?? "0"
    case "paramRef":  // NOVO
      if (!ctx.tableParams) {
        throw new Error(`Parâmetro "${side.target}" usado fora de contexto de tabela parametrizada`)
      }
      if (!(side.target in ctx.tableParams)) {
        throw new Error(`Parâmetro "${side.target}" não fornecido`)
      }
      return ctx.tableParams[side.target]
  }
}
```

### 3.3. Avaliar tableRef com argumentos

**Em `evaluator.ts`, função `evaluateTableRef()`:**

```typescript
function evaluateTableRef(
  token: { tableId: string; columnId: string | null; rowId?: string | null; arguments?: Record<string, TableConditionSide> },
  ctx: EvaluationContext,
  config: EngineConfig,
  tables: LookupTable[]
): Decimal {
  const table = tables.find(t => t.id === token.tableId)
  if (!table) throw new Error(`Tabela não encontrada: ${token.tableId}`)

  // NOVO: Resolver argumentos
  let paramContext = ctx
  if (token.arguments) {
    const resolvedParams: Record<string, string> = {}
    
    // Validar que todos os parâmetros obrigatórios foram fornecidos
    const requiredParams = table.parameters ?? []
    for (const param of requiredParams) {
      if (!(param in token.arguments)) {
        throw new Error(`Parâmetro obrigatório "${param}" não fornecido para tabela "${table.name}"`)
      }
    }

    // Resolver cada argumento
    for (const [paramName, side] of Object.entries(token.arguments)) {
      resolvedParams[paramName] = resolveSide(side, ctx)
    }

    // Criar novo contexto com parâmetros resolvidos
    paramContext = {
      ...ctx,
      tableParams: resolvedParams
    }
  }

  // Resolver linha (usando paramContext para condições)
  let matchedRow: TableRow | undefined
  if (token.rowId != null) {
    matchedRow = table.rows.find(r => r.id === token.rowId)
    if (!matchedRow) throw new Error(`Linha não encontrada: ${token.rowId}`)
  } else {
    for (const row of table.rows) {
      if (row.condition === null || evaluateCondition(row.condition, paramContext)) {
        matchedRow = row
        break
      }
    }
  }

  if (!matchedRow) throw new Error(`Nenhuma linha correspondente na tabela "${table.name}"`)

  // ... resto da lógica de resolução de coluna (inalterado)
}
```

### 3.4. Validações

**Adicionar em `evaluateTableRef()`:**

1. ✅ Tabela sem parâmetros + arguments fornecidos → **warning** (ignorar arguments)
2. ✅ Tabela com parâmetros + arguments ausentes → **error**
3. ✅ Tabela com parâmetros + arguments parciais → **error** (listar faltantes)
4. ✅ `paramRef` usado em condição mas tabela não tem parâmetros → **error**
5. ✅ `paramRef` referencia parâmetro inexistente → **error**

---

## 4. UI Implementation

### 4.1. LookupTablesPanel - Definir Parâmetros

**Adicionar seção após o nome da tabela:**

```typescript
// Em LookupTablesPanel/index.tsx
<div className="flex flex-col gap-2">
  <div className="flex items-center gap-2">
    <label className="text-xs text-[var(--color-muted)]">Parâmetros:</label>
    <button 
      className="text-xs px-2 py-0.5 rounded border"
      onClick={() => {
        const newParam = `param_${(table.parameters?.length ?? 0) + 1}`
        dispatch({
          type: "UPDATE_TABLE",
          id: table.id,
          patch: { parameters: [...(table.parameters ?? []), newParam] }
        })
      }}
    >
      + Adicionar Parâmetro
    </button>
  </div>
  
  {(table.parameters ?? []).length > 0 && (
    <div className="flex flex-col gap-1">
      {table.parameters.map((param, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            className="text-xs px-2 py-1 border rounded flex-1"
            value={param}
            onChange={(e) => {
              const newParams = [...table.parameters!]
              newParams[idx] = e.target.value
              dispatch({
                type: "UPDATE_TABLE",
                id: table.id,
                patch: { parameters: newParams }
              })
            }}
            placeholder="nome_parametro"
          />
          <button
            className="text-xs text-[var(--color-red)] hover:underline"
            onClick={() => {
              const newParams = table.parameters!.filter((_, i) => i !== idx)
              dispatch({
                type: "UPDATE_TABLE",
                id: table.id,
                patch: { parameters: newParams.length > 0 ? newParams : undefined }
              })
            }}
          >
            Remover
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

### 4.2. ConditionEditor - Adicionar opção paramRef

**Em `StepCard/index.tsx`, dentro do `ConditionEditor`:**

```typescript
// No select de left/right side:
<select className={s} value={cond.left.kind} onChange={(e) => {
  const k = e.target.value as TableConditionSide["kind"]
  const left = k === "number" ? { kind: "number" as const, value: "0" }
    : k === "text" ? { kind: "text" as const, value: "" }
    : k === "varRef" ? { kind: "varRef" as const, target: variables[0]?.id ?? "" }
    : k === "paramRef" ? { kind: "paramRef" as const, target: availableParams[0] ?? "" }  // NOVO
    : { kind: "stepRef" as const, target: priorSteps[0]?.id ?? "" }
  onChange({ ...cond, left })
}}>
  <option value="number">Number</option>
  <option value="text">Text</option>
  {variables.length > 0 && <option value="varRef">Variável</option>}
  {priorSteps.length > 0 && <option value="stepRef">Etapa</option>}
  {availableParams.length > 0 && <option value="paramRef">Parâmetro</option>}  {/* NOVO */}
</select>

{/* NOVO: Select para paramRef */}
{cond.left.kind === "paramRef" && (
  <select 
    className={s} 
    value={(cond.left as {kind:"paramRef";target:string}).target} 
    onChange={(e) => onChange({ ...cond, left: { kind: "paramRef", target: e.target.value } })}
  >
    {availableParams.map((p) => <option key={p} value={p}>{p}</option>)}
  </select>
)}
```

**Nota:** `availableParams` precisa ser passado via props quando editando condição de tabela parametrizada.

### 4.3. StepCard - Editar argumentos do tableRef

**Quando mode === "tableRef", adicionar UI para arguments:**

```typescript
{/* Após selecionar tabela, coluna, linha */}
{tableRefState.tableId && tbl?.parameters && tbl.parameters.length > 0 && (
  <div className="flex flex-col gap-2 w-full mt-2 p-2 border border-[var(--color-border)] rounded">
    <span className="text-xs font-semibold text-[var(--color-muted)]">Argumentos:</span>
    {tbl.parameters.map((param) => (
      <div key={param} className="flex flex-col gap-1">
        <span className="text-[10px] text-[var(--color-muted)]">{param}:</span>
        <div className="flex items-center gap-2">
          <select
            className={selCls}
            value={tableRefState.arguments?.[param]?.kind ?? "number"}
            onChange={(e) => {
              const k = e.target.value as TableConditionSide["kind"]
              const side = k === "number" ? { kind: "number" as const, value: "0" }
                : k === "text" ? { kind: "text" as const, value: "" }
                : k === "varRef" ? { kind: "varRef" as const, target: variables[0]?.id ?? "" }
                : { kind: "stepRef" as const, target: priorSteps[0]?.id ?? "" }
              setTableRefState((s) => ({
                ...s,
                arguments: { ...s.arguments, [param]: side }
              }))
            }}
          >
            <option value="number">Número</option>
            <option value="text">Texto</option>
            {variables.length > 0 && <option value="varRef">Variável</option>}
            {priorSteps.length > 0 && <option value="stepRef">Etapa</option>}
          </select>
          
          {/* Inputs específicos por tipo */}
          {tableRefState.arguments?.[param]?.kind === "number" && (
            <input
              className={selCls}
              value={(tableRefState.arguments[param] as any).value ?? "0"}
              onChange={(e) => setTableRefState((s) => ({
                ...s,
                arguments: { ...s.arguments, [param]: { kind: "number", value: e.target.value } }
              }))}
            />
          )}
          {/* ... outros tipos */}
        </div>
      </div>
    ))}
  </div>
)}
```

---

## 5. Exemplo Completo

### Configuração

```json
{
  "variables": [
    { "id": "lmi", "name": "LMI", "defaultValue": "0" },
    { "id": "lmi_agravo", "name": "LMI Agravo", "defaultValue": "0" },
    { "id": "classe", "name": "Classe", "defaultValue": "A", "valueType": "text" }
  ],
  "tables": [
    {
      "id": "faixas_lmi",
      "name": "Faixas LMI (Parametrizada)",
      "parameters": ["valor_entrada"],
      "rows": [
        {
          "id": "faixa_1",
          "condition": {
            "left": { "kind": "paramRef", "target": "valor_entrada" },
            "op": "<=",
            "right": { "kind": "number", "value": "5000" }
          },
          "values": { "taxa": "0.05", "multa": "100" }
        },
        {
          "id": "faixa_2",
          "condition": {
            "left": { "kind": "paramRef", "target": "valor_entrada" },
            "op": "<=",
            "right": { "kind": "number", "value": "10000" }
          },
          "values": { "taxa": "0.08", "multa": "200" }
        },
        {
          "id": "faixa_default",
          "condition": null,
          "values": { "taxa": "0.12", "multa": "500" }
        }
      ],
      "columns": [
        { "id": "taxa", "label": "Taxa" },
        { "id": "multa", "label": "Multa" }
      ]
    },
    {
      "id": "descontos_classe",
      "name": "Descontos por Classe (Parametrizada)",
      "parameters": ["classe_cliente"],
      "rows": [
        {
          "id": "classe_a",
          "condition": {
            "left": { "kind": "paramRef", "target": "classe_cliente" },
            "op": "==",
            "right": { "kind": "text", "value": "A" }
          },
          "values": { "desconto": "0.10" }
        },
        {
          "id": "classe_b",
          "condition": {
            "left": { "kind": "paramRef", "target": "classe_cliente" },
            "op": "==",
            "right": { "kind": "text", "value": "B" }
          },
          "values": { "desconto": "0.05" }
        },
        {
          "id": "classe_default",
          "condition": null,
          "values": { "desconto": "0" }
        }
      ],
      "columns": [
        { "id": "desconto", "label": "Desconto" }
      ]
    }
  ],
  "steps": [
    {
      "id": "step_taxa_lmi",
      "name": "Taxa LMI",
      "enabled": true,
      "expression": [
        {
          "type": "tableRef",
          "tableId": "faixas_lmi",
          "columnId": "taxa",
          "arguments": {
            "valor_entrada": { "kind": "varRef", "target": "lmi" }
          }
        }
      ]
    },
    {
      "id": "step_taxa_agravo",
      "name": "Taxa Agravo",
      "enabled": true,
      "expression": [
        {
          "type": "tableRef",
          "tableId": "faixas_lmi",
          "columnId": "taxa",
          "arguments": {
            "valor_entrada": { "kind": "varRef", "target": "lmi_agravo" }
          }
        }
      ]
    },
    {
      "id": "step_desconto",
      "name": "Desconto por Classe",
      "enabled": true,
      "expression": [
        {
          "type": "tableRef",
          "tableId": "descontos_classe",
          "columnId": "desconto",
          "arguments": {
            "classe_cliente": { "kind": "varRef", "target": "classe" }
          }
        }
      ]
    },
    {
      "id": "step_valor_final",
      "name": "Valor Final",
      "enabled": true,
      "expression": [
        { "type": "stepRef", "target": "step_taxa_lmi" },
        { "type": "op", "value": "+" },
        { "type": "stepRef", "target": "step_taxa_agravo" },
        { "type": "op", "value": "-" },
        { "type": "stepRef", "target": "step_desconto" }
      ]
    }
  ]
}
```

### Execução

**Input:**
```json
{
  "lmi": "7500",
  "lmi_agravo": "12000",
  "classe": "A"
}
```

**Resolução:**

1. `step_taxa_lmi`:
   - Resolve argumento `valor_entrada` → `7500` (lmi)
   - Avalia tabela `faixas_lmi` com param `valor_entrada = 7500`
   - Condição `7500 <= 5000`? ❌
   - Condição `7500 <= 10000`? ✅ → Retorna `0.08`

2. `step_taxa_agravo`:
   - Resolve argumento `valor_entrada` → `12000` (lmi_agravo)
   - Avalia tabela `faixas_lmi` com param `valor_entrada = 12000`
   - Condição `12000 <= 5000`? ❌
   - Condição `12000 <= 10000`? ❌
   - Condição `null` (default) → Retorna `0.12`

3. `step_desconto`:
   - Resolve argumento `classe_cliente` → `"A"` (classe)
   - Avalia tabela `descontos_classe` com param `classe_cliente = "A"`
   - Condição `"A" == "A"`? ✅ → Retorna `0.10`

4. `step_valor_final`:
   - `0.08 + 0.12 - 0.10` = `0.10`

---

## 6. Edge Cases & Validações

### 6.1. Validações em Import/Save

```typescript
// Em validation logic
function validateTable(table: LookupTable, allTables: LookupTable[]): string[] {
  const errors: string[] = []
  
  // Validar que parâmetros têm nomes únicos
  if (table.parameters) {
    const duplicates = table.parameters.filter((p, i) => table.parameters!.indexOf(p) !== i)
    if (duplicates.length > 0) {
      errors.push(`Parâmetros duplicados: ${duplicates.join(", ")}`)
    }
  }
  
  // Validar que paramRef em condições referencia parâmetro existente
  for (const row of table.rows) {
    if (row.condition) {
      const leftParam = row.condition.left.kind === "paramRef" ? row.condition.left.target : null
      const rightParam = row.condition.right.kind === "paramRef" ? row.condition.right.target : null
      
      if (leftParam && !table.parameters?.includes(leftParam)) {
        errors.push(`Linha "${row.id}": parâmetro "${leftParam}" não existe`)
      }
      if (rightParam && !table.parameters?.includes(rightParam)) {
        errors.push(`Linha "${row.id}": parâmetro "${rightParam}" não existe`)
      }
    }
  }
  
  return errors
}

function validateTableRef(token: ExpressionToken & { type: "tableRef" }, tables: LookupTable[]): string[] {
  const errors: string[] = []
  const table = tables.find(t => t.id === token.tableId)
  
  if (!table) {
    errors.push(`Tabela não encontrada: ${token.tableId}`)
    return errors
  }
  
  // Validar argumentos obrigatórios
  const requiredParams = table.parameters ?? []
  const providedParams = Object.keys(token.arguments ?? {})
  
  for (const param of requiredParams) {
    if (!providedParams.includes(param)) {
      errors.push(`Parâmetro obrigatório "${param}" não fornecido`)
    }
  }
  
  // Validar argumentos extras
  for (const param of providedParams) {
    if (!requiredParams.includes(param)) {
      errors.push(`Parâmetro "${param}" não existe na tabela "${table.name}"`)
    }
  }
  
  return errors
}
```

### 6.2. Mensagens de Erro Runtime

```typescript
// Mensagens claras e acionáveis
throw new Error(`Parâmetro obrigatório "valor_entrada" não fornecido para tabela "Faixas LMI"`)
throw new Error(`Parâmetro "valor_entrada" referenciado em condição mas tabela "Faixas LMI" não define parâmetros`)
throw new Error(`Argumento "param_invalido" fornecido mas tabela "Faixas LMI" não possui esse parâmetro`)
```

### 6.3. Backward Compatibility

✅ **100% backward compatible**:
- `parameters` é opcional → tabelas antigas continuam funcionando
- `arguments` é opcional → tableRef sem arguments funciona como antes
- `paramRef` só é válido em tabelas parametrizadas → erro claro se usado incorretamente

---

## 7. Migration Path

### Para usuários existentes:

1. **Nenhuma ação necessária** - configurações antigas continuam funcionando
2. **Opt-in gradual** - pode adicionar parâmetros em tabelas específicas
3. **Refactoring tool** (futuro) - detectar duplicação e sugerir parametrização

### Exemplo de refactoring:

**Antes (2 tabelas):**
```json
{
  "tables": [
    {
      "id": "faixas_lmi",
      "rows": [
        { "condition": { "left": { "kind": "varRef", "target": "lmi" }, "op": "<=", "right": { "kind": "number", "value": "5000" } }, "values": { "taxa": "0.05" } }
      ]
    },
    {
      "id": "faixas_agravo",
      "rows": [
        { "condition": { "left": { "kind": "varRef", "target": "lmi_agravo" }, "op": "<=", "right": { "kind": "number", "value": "5000" } }, "values": { "taxa": "0.05" } }
      ]
    }
  ]
}
```

**Depois (1 tabela parametrizada):**
```json
{
  "tables": [
    {
      "id": "faixas",
      "parameters": ["valor"],
      "rows": [
        { "condition": { "left": { "kind": "paramRef", "target": "valor" }, "op": "<=", "right": { "kind": "number", "value": "5000" } }, "values": { "taxa": "0.05" } }
      ]
    }
  ]
}
```

---

## 8. Questões em Aberto

1. **Limite de parâmetros por tabela?** Sugestão: sem limite, mas warning se > 5
2. **Suportar parâmetros opcionais com default?** Exemplo: `parameters: [{ name: "x", default: "0" }]`
3. **Permitir paramRef em valores das células?** Ex: `{ "taxa": "[paramRef:fator] * 0.05" }`
4. **UI para duplicar tabela e parametrizar automaticamente?**

---

## 9. Implementation Checklist

### Phase 1: Schema & Types
- [ ] Update `lib/runtime/types.ts`:
  - [ ] Add `parameters?: string[]` to `LookupTable`
  - [ ] Add `{ kind: "paramRef"; target: string }` to `TableConditionSide`
  - [ ] Add `arguments?: Record<string, TableConditionSide>` to tableRef tokens

### Phase 2: Runtime
- [ ] Update `lib/runtime/evaluator.ts`:
  - [ ] Add `tableParams?: Record<string, string>` to evaluation context
  - [ ] Create/update `resolveSide()` to handle `paramRef`
  - [ ] Update `evaluateTableRef()` to resolve arguments
  - [ ] Update `evaluateCondition()` to use paramContext
  - [ ] Add validation for missing/invalid parameters

### Phase 3: UI - Tables Panel
- [ ] Update `app/builder/components/LookupTablesPanel/index.tsx`:
  - [ ] Add parameters section in table editor
  - [ ] Add button to add parameters
  - [ ] Add inputs to edit parameter names
  - [ ] Add button to remove parameters
  - [ ] Show badge/indicator when table has parameters

### Phase 4: UI - Condition Editor
- [ ] Update `app/builder/components/StepCard/index.tsx`:
  - [ ] Update `ConditionEditor` to accept `availableParams` prop
  - [ ] Add "Parâmetro" option in side kind select
  - [ ] Add paramRef value editor (select from available params)
  - [ ] Pass available params when editing table row conditions

### Phase 5: UI - Step Card
- [ ] Update `app/builder/components/StepCard/index.tsx`:
  - [ ] Update tableRef state to include arguments
  - [ ] Add arguments editor section when table has parameters
  - [ ] For each parameter, show kind selector + value editor
  - [ ] Validate all params provided before adding token
  - [ ] Update tokenLabel to show arguments in display

### Phase 6: Validation & Error Handling
- [ ] Create validation utilities:
  - [ ] Validate table parameters are unique
  - [ ] Validate paramRef references existing parameter
  - [ ] Validate tableRef provides all required arguments
  - [ ] Validate no extra arguments provided
- [ ] Add clear error messages for all validation failures

### Phase 7: Documentation
- [ ] Update `SPEC.md` with parameterized tables section
- [ ] Add examples to documentation
- [ ] Update README if needed
- [ ] Add migration guide for existing users

---

## 10. Files to Modify

### Core Types & Runtime
- `lib/runtime/types.ts` - Schema changes
- `lib/runtime/evaluator.ts` - Evaluation logic
- `lib/runtime/index.ts` - Re-exports if needed

### UI Components
- `app/builder/components/LookupTablesPanel/index.tsx` - Parameter editor
- `app/builder/components/StepCard/index.tsx` - Arguments editor + ConditionEditor updates

### State Management
- `hooks/useEngineState.ts` - Actions for table parameter updates (if needed)

### Utilities
- `lib/stateUtils.ts` - Validation utilities
- `lib/conditionUtils.ts` - Helper functions for paramRef handling

### Documentation
- `SPEC.md` - Feature documentation
- `README.md` - Update if needed

---

## 11. Next Steps

1. **Review this spec** - Ensure all requirements are captured
2. **Get approval** - Confirm approach and priority
3. **Start implementation** - Follow checklist phase by phase
4. **Test manually (MVP)** - Validate solution with real use cases
5. **Create automated tests** - After MVP validation, add comprehensive test suite
6. **Document as you go** - Update SPEC.md with learnings

---

**Status:** 📋 Specification Complete - Ready for Implementation

**Estimated Effort:** Medium-Large (affects schema, runtime, and multiple UI components)

**Risk Level:** Low (fully backward compatible, well-scoped changes)

**Value:** High (enables DRY for complex tables, major UX improvement)
