# Design Doc — Tabela Unificada com Seleção de Coluna por Condição

## Contexto

O modelo atual suporta lookup 1D: condição por linha, coluna fixa em design time. O problema é o lookup 2D — ex: prêmio por faixa de renda × gênero. A distinção entre 1D e 2D não é de *tipo de tabela*, mas de *como a coluna é selecionada*:

- **1D**: coluna escolhida em design time pelo autor do motor
- **2D**: coluna resolvida em runtime por condição (igual ao que já fazemos com linhas)

Solução: **colunas também ganham condição opcional**. Um único tipo de tabela, um único token, um único modelo mental.

---

## O que muda

```
Antes — dois conceitos separados:
  LookupTable: condição por linha, coluna por ID (1D)
  MatrixTable: condição por linha E por coluna (2D) — tipo novo (descartado)

Depois — um único conceito:
  LookupTable: condição por linha, coluna por ID OU por condição
```

---

## Exemplos

### Caso 1D — igual ao hoje

```
Tabela "Alíquotas"
┌──────────────┬──────────┬─────────────┐
│ Linha        │ Alíquota │ Descrição   │  ← colunas sem condição
├──────────────┼──────────┼─────────────┤
│ renda < 1000 │ 0.05     │ "Faixa 1"   │
│ (padrão)     │ 0.15     │ "Faixa 3"   │
└──────────────┴──────────┴─────────────┘

token A: tableRef(Alíquotas, columnId: "col_aliquota")  → 0.05
token B: tableRef(Alíquotas, columnId: "col_descricao") → "Faixa 1"
```

Comportamento idêntico ao atual. Nenhum engine existente precisa ser alterado.

### Caso 2D — novo

```
Tabela "Prêmios"
┌──────────────┬────────────────────┬───────────────────┐
│ Linha        │ cond: genero == 1  │ cond: padrão      │  ← colunas COM condição
│              │ "Masculino"        │ "Feminino"        │
├──────────────┼────────────────────┼───────────────────┤
│ renda < 1000 │ 120                │ 110               │
│ renda < 5000 │ 200                │ 180               │
│ (padrão)     │ 350                │ 310               │
└──────────────┴────────────────────┴───────────────────┘

token: tableRef(Prêmios, columnId: null) → resolve linha e coluna em runtime
```

A linha é resolvida pela condição da linha (como sempre). A coluna é resolvida pela condição da coluna (novo). A célula na interseção é retornada.

### Caso misto — mesma tabela, dois modos

Uma tabela pode ter colunas com e sem condição simultaneamente:

```
Tabela "Fatores"
┌──────────────┬──────────────────┬────────────────────┬───────────────────┐
│ Linha        │ Base (sem cond.) │ cond: genero == 1  │ cond: padrão      │
│              │ "Fator Base"     │ "Masc"             │ "Fem"             │
├──────────────┼──────────────────┼────────────────────┼───────────────────┤
│ renda < 1000 │ 1.00             │ 1.05               │ 0.98              │
│ (padrão)     │ 1.00             │ 1.10               │ 1.02              │
└──────────────┴──────────────────┴────────────────────┴───────────────────┘

token 1D: tableRef(Fatores, columnId: "col_base")  → pega a coluna "Base" por ID
token 2D: tableRef(Fatores, columnId: null)        → resolve entre "Masc" e "Fem" por condição
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `lib/runtime/types.ts` | `TableColumn` ganha `condition?: TableCondition \| null`; token `tableRef` muda `columnId` de `string` para `string \| null` |
| `lib/runtime/schema.ts` | `TableColumnSchema` ganha `condition` opcional; `tableRef` schema aceita `columnId: z.string().nullable()` |
| `lib/runtime/evaluator.ts` | `evaluateTableRef` bifurca: `columnId != null` → comportamento atual; `columnId === null` → varredura de coluna por condição |
| `app/builder/components/TableEditModal/index.tsx` | Cada coluna ganha toggle "Coluna condicional" + editor de condição (mesmo `ConditionSideInput` das linhas) |
| `app/builder/components/StepCard/index.tsx` | Ao inserir `tableRef`: se tabela tem colunas condicionais, oferece modo 2D (sem seleção de coluna); senão, seleção de coluna como hoje |

---

## 1. Tipos — `lib/runtime/types.ts`

```typescript
export interface TableColumn {
  id: string
  label: string
  condition?: TableCondition | null
  // undefined  → sem condição — coluna selecionada por ID no token (comportamento atual)
  // null       → coluna padrão — else do eixo de colunas (2D)
  // Condition  → condição runtime — primeira coluna verdadeira vence (2D)
}

// ExpressionToken e ScalarToken — tableRef passa a aceitar columnId nulo:
// | { type: "tableRef"; tableId: string; columnId: string | null }
//
// columnId: string → coluna escolhida em design time (1D, atual)
// columnId: null   → coluna resolvida em runtime pela condição (2D, novo)
```

`LookupTable`, `TableRow` e `EngineState` **não mudam**.

---

## 2. Schema Zod — `lib/runtime/schema.ts`

```typescript
export const TableColumnSchema = z.object({
  id: z.string(),
  label: z.string(),
  condition: TableConditionSchema.nullable().optional(),  // ← novo campo
})

// No ExpressionTokenSchema e ScalarTokenSchema — tableRef:
z.object({
  type: z.literal("tableRef"),
  tableId: z.string(),
  columnId: z.string().nullable(),  // era z.string()
})
```

> **Retrocompat total**: tokens existentes têm `columnId: string` → path atual inalterado. Colunas sem `condition` → selecionadas por ID como sempre.

---

## 3. Avaliador — `lib/runtime/evaluator.ts`

```typescript
function evaluateTableRef(
  tableId: string,
  columnId: string | null,   // ← era só string
  ctx: EvalContext
): { val: Decimal; rowIndex: number; rowLabel: string; colLabel?: string } {
  const table = ctx.tables[tableId]
  if (!table) throw new Error(`Tabela não encontrada: ${tableId}`)

  // Resolve linha — igual ao comportamento atual
  let matchedRow: TableRow | null = null
  let matchedRowIdx = 0
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i]
    if (row.condition === null || evaluateCondition(row.condition, ctx)) {
      matchedRow = row
      matchedRowIdx = i + 1
      break
    }
  }
  if (!matchedRow)
    throw new Error(`Nenhuma condição correspondente na tabela: ${table.name}`)

  if (columnId !== null) {
    // Caminho 1D — coluna por ID (comportamento atual, zero mudança)
    const col = table.columns.find((c) => c.id === columnId)
    if (!col) throw new Error(`Coluna não encontrada: ${columnId} na tabela ${table.name}`)
    const val = matchedRow.values[columnId]
    if (val === undefined) throw new Error(`Valor ausente para coluna "${col.label}" na tabela ${table.name}`)
    return { val: ctx.D.from(val), rowIndex: matchedRowIdx, rowLabel: matchedRow.label ?? `linha ${matchedRowIdx}` }
  } else {
    // Caminho 2D — coluna por condição (novo)
    let matchedCol: TableColumn | null = null
    for (const col of table.columns) {
      if (col.condition === undefined) continue  // colunas sem condição não participam do 2D
      if (col.condition === null || evaluateCondition(col.condition, ctx)) {
        matchedCol = col
        break
      }
    }
    if (!matchedCol)
      throw new Error(`Nenhuma coluna correspondente na tabela: ${table.name}`)
    const val = matchedRow.values[matchedCol.id]
    if (val === undefined)
      throw new Error(`Célula vazia: "${matchedRow.label ?? `linha ${matchedRowIdx}`}" × "${matchedCol.label}" na tabela ${table.name}`)
    return {
      val: ctx.D.from(val),
      rowIndex: matchedRowIdx,
      rowLabel: matchedRow.label ?? `linha ${matchedRowIdx}`,
      colLabel: matchedCol.label,
    }
  }
}
```

### Trace — `resolveToken()`

```typescript
case "tableRef": {
  const { val, rowIndex, rowLabel, colLabel } = evaluateTableRef(token.tableId, token.columnId, ctx)
  const table = ctx.tables[token.tableId]
  const detail = colLabel
    ? `tabela: ${table?.name ?? token.tableId}, linha: ${rowLabel}, coluna: ${colLabel}`  // 2D
    : `tabela: ${table?.name ?? token.tableId}, linha ${rowIndex}: ${rowLabel}`            // 1D
  ctx.trace?.push({ type: "tableRef", resolved: ctx.D.format(val), detail })
  return { kind: "value", val }
}
```

---

## 4. UI Builder

### `TableEditModal` — colunas condicionais

- Cada coluna ganha um toggle: **"Coluna condicional"**
- Quando ativado: exibe editor de condição (`ConditionSideInput`) com a mesma UI já usada nas linhas
- Quando desativado (padrão): coluna selecionada por ID no token (comportamento atual)
- Coluna padrão: checkbox "Padrão (else)" → `condition: null`, deve ser a última coluna condicional

### `StepCard` — inserção de token `tableRef`

- **Seletor de tabela**: igual ao hoje
- **Seletor de coluna** (passo seguinte):
  - Se a tabela escolhida **não tem** colunas condicionais → exibe seletor de coluna (1D, atual)
  - Se a tabela tem **alguma coluna condicional** → oferece duas opções:
    - "Escolher coluna agora" → exibe seletor de coluna (1D)
    - "Resolver em runtime" → sem seletor, `columnId: null` (2D)

---

## 5. Compatibilidade

| Aspecto | Impacto |
|---|---|
| Engines existentes no banco | Zero — `columnId` sempre `string`, colunas sem `condition` |
| API pública | Zero — sem mudança de interface |
| Bruno | Zero — endpoints e schemas não mudam |
| Tokens `tableRef` existentes | Zero — `columnId: string` entra no caminho 1D inalterado |

---

## Verificação

1. **Retrocompat 1D**: token com `columnId: string`, tabela sem `condition` nas colunas → resultado idêntico ao hoje
2. **2D básico**: token com `columnId: null`, tabela com 2 colunas condicionais → célula correta em todos os quadrantes
3. **Linha padrão + coluna padrão**: ambas `condition: null` → célula do canto inferior direito como fallback total
4. **Tabela mista**: colunas com e sem condição na mesma tabela → token 1D ignora condicionais, token 2D ignora as sem condição
5. **Erro sem match de coluna**: tabela 2D sem coluna padrão e input fora de qualquer range → erro descritivo
6. **Célula vazia**: linha e coluna matched, mas célula sem valor → erro aponta linha × coluna
7. **Trace/debug**: `POST /api/calc/:engineId?debug=true` → detalhe do token inclui `linha` e `coluna` no modo 2D, só `linha` no 1D
8. **Builder reload**: salvar engine com colunas condicionais, recarregar → toggles mostrados corretamente no editor
