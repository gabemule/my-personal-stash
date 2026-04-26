"use client"

import { useState, useRef, useEffect } from "react"
import type { Step, Variable, LookupTable, ExpressionToken, ScalarToken, TableCondition, TableConditionSide, CompareOp } from "@/lib/runtime"
import type { Action } from "@/hooks/useEngineState"
import type { Dispatch } from "react"
import { validateParens } from "@/lib/runtime"
import { getBrokenTokenRefs } from "@/core/state/validation"
import { COMPARE_OPS, TEXT_OPS, isTextSide, sanitizeConditionOp } from "@/core/conditions"
import { Modal } from "@/components/Modal"
import { useConfirm } from "@/hooks/useConfirm"

interface Props {
  step: Step
  stepIndex: number
  totalSteps: number
  variables: Variable[]
  tables: LookupTable[]
  priorSteps: Step[]
  dispatch: Dispatch<Action>
  stepResult?: { value: string | null; error: string | null }
  testValues?: Record<string, string>
  testResults?: Record<string, { value: string | null; error: string | null }>
}

type ToolbarMode =
  | "idle"
  | "number"
  | "varRef"
  | "stepRef"
  | "tableRef"
  | "conditional"

function resolvedLabel(
  token: ExpressionToken,
  variables: Variable[],
  tables: LookupTable[],
  testValues: Record<string, string>,
  testResults: Record<string, { value: string | null; error: string | null }>
): string {
  // Helper to resolve a condition side - replicates evaluator's resolveConditionSide logic
  const resolveSide = (s: TableConditionSide, tableParams?: Record<string, string>): number | string => {
    if (s.kind === "number") return parseFloat(s.value)
    if (s.kind === "text") return s.value
    if (s.kind === "varRef") {
      const v = variables.find((v) => v.id === s.target)
      if (v?.valueType === "text") {
        return testValues[s.target] ?? v.defaultValue ?? ""
      } else {
        const numVal = testValues[s.target] ?? v?.defaultValue ?? "0"
        return parseFloat(numVal)
      }
    }
    if (s.kind === "stepRef") {
      const val = testResults[s.target]?.value
      return val ? parseFloat(val) : 0
    }
    if (s.kind === "paramRef") {
      if (!tableParams) return 0
      const paramValue = tableParams[s.target]
      if (paramValue === undefined) return 0
      // Try to parse as number first
      const numVal = parseFloat(paramValue)
      return isNaN(numVal) ? paramValue : numVal
    }
    return 0
  }
  
  // Helper to resolve an argument side to a string value (for building tableParams)
  const resolveArgSide = (s: TableConditionSide): string => {
    if (s.kind === "number") return s.value
    if (s.kind === "text") return s.value
    if (s.kind === "varRef") {
      const v = variables.find((v) => v.id === s.target)
      if (v?.valueType === "text") {
        return testValues[s.target] ?? v.defaultValue ?? ""
      } else {
        const numVal = testValues[s.target] ?? v?.defaultValue ?? "0"
        return String(parseFloat(numVal))
      }
    }
    if (s.kind === "stepRef") {
      return testResults[s.target]?.value ?? "0"
    }
    return "0"
  }
  
  // Evaluate condition - replicates evaluator's evaluateCondition logic
  const evalCond = (cond: TableCondition | null, tableParams?: Record<string, string>): boolean => {
    if (cond === null) return true
    const left = resolveSide(cond.left, tableParams)
    const right = resolveSide(cond.right, tableParams)
    
    // If either side is string, compare as strings
    if (typeof left === "string" || typeof right === "string") {
      const l = typeof left === "string" ? left : String(left)
      const r = typeof right === "string" ? right : String(right)
      if (cond.op === "==") return l === r
      if (cond.op === "!=") return l !== r
      return false
    }
    
    // Both are numbers - compare numerically
    switch (cond.op) {
      case "<": return left < right
      case "<=": return left <= right
      case "==": return left === right
      case ">=": return left >= right
      case ">": return left > right
      case "!=": return left !== right
    }
    return false
  }
  const resolveScalar = (s: ScalarToken): string => {
    if (s.type === "number") return s.value
    if (s.type === "varRef") return testValues[s.target] ?? variables.find((v) => v.id === s.target)?.defaultValue ?? `?${s.target}`
    if (s.type === "stepRef") return testResults[s.target]?.value ?? `?${s.target}`
    const tbl = tables.find((t) => t.id === s.tableId)
    if (!tbl) return `?${s.tableId}`
    
    // Resolve arguments if table is parameterized (same logic as evaluator.ts)
    let tableParams: Record<string, string> | undefined
    if (s.arguments && tbl.parameters) {
      tableParams = {}
      for (const [paramName, argSide] of Object.entries(s.arguments)) {
        tableParams[paramName] = resolveArgSide(argSide)
      }
    }
    
    // Find matching row using tableParams context
    const matched = s.rowId != null
      ? tbl.rows.find((r) => r.id === s.rowId)
      : tbl.rows.find((row) => evalCond(row.condition, tableParams))
    
    if (!matched) return `?${tbl.name}`
    
    if (s.columnId === null) {
      // 2D table - find matching column
      const matchedCol = tbl.columns.find((c) => c.condition !== undefined && (c.condition === null || evalCond(c.condition, tableParams)))
      return matched && matchedCol ? matched.values[matchedCol.id] ?? `?${tbl.name}` : `?${tbl.name}`
    }
    return matched.values[s.columnId] ?? `?${tbl.name}`
  }

  switch (token.type) {
    case "number": return token.value
    case "op": return token.value === "*" ? "×" : token.value === "/" ? "÷" : token.value
    case "paren": return token.value
    case "varRef": {
      const v = variables.find((v) => v.id === token.target)
      return testValues[token.target] ?? v?.defaultValue ?? `?${token.target}`
    }
    case "stepRef": return testResults[token.target]?.value ?? `?${token.target}`
    case "tableRef": {
      const tbl = tables.find((t) => t.id === token.tableId)
      if (!tbl) return `?${token.tableId}`
      
      // Resolve arguments if table is parameterized (same logic as evaluator.ts)
      let tableParams: Record<string, string> | undefined
      if (token.arguments && tbl.parameters) {
        tableParams = {}
        for (const [paramName, argSide] of Object.entries(token.arguments)) {
          tableParams[paramName] = resolveArgSide(argSide)
        }
      }
      
      const matched = token.rowId != null
        ? tbl.rows.find((r) => r.id === token.rowId)
        : tbl.rows.find((row) => evalCond(row.condition, tableParams))
      if (token.columnId === null) {
        const matchedCol = tbl.columns.find((c) => c.condition !== undefined && (c.condition === null || evalCond(c.condition, tableParams)))
        return matched && matchedCol ? matched.values[matchedCol.id] ?? `?${tbl.name}` : `?${tbl.name}`
      }
      return matched?.values[token.columnId] ?? `?${tbl.name}`
    }
    case "conditional": {
      const sideStr = (s: TableConditionSide): string => {
        if (s.kind === "number") return s.value
        if (s.kind === "text") return `"${s.value}"`
        if (s.kind === "varRef") return testValues[s.target] ?? variables.find((v) => v.id === s.target)?.defaultValue ?? s.target
        return testResults[s.target]?.value ?? `?${s.target}`
      }
      for (const branch of token.branches) {
        if (evalCond(branch.condition)) {
          const { left, op, right } = branch.condition
          return `IF ${sideStr(left)} ${op} ${sideStr(right)} = ${resolveScalar(branch.value)}`
        }
      }
      return resolveScalar(token.elseToken)
    }
  }
}

function tokenLabel(token: ExpressionToken, variables: Variable[], steps: Step[], tables: LookupTable[]): string {
  switch (token.type) {
    case "number": return token.value
    case "op": return token.value === "*" ? "×" : token.value === "/" ? "÷" : token.value
    case "paren": return token.value
    case "varRef": return variables.find((v) => v.id === token.target)?.name ?? `?${token.target}`
    case "stepRef": return steps.find((s) => s.id === token.target)?.name ?? `?${token.target}`
    case "tableRef": {
      const tbl = tables.find((t) => t.id === token.tableId)
      if (!tbl) return `?${token.tableId}`
      const rowPart = token.rowId != null
        ? `[${tbl.rows.find((r) => r.id === token.rowId)?.label ?? token.rowId}]`
        : ""
      if (token.columnId === null) return `${tbl.name}${rowPart} (2D)`
      const col = tbl.columns.find((c) => c.id === token.columnId)
      return `${tbl.name}${rowPart}.${col?.label ?? token.columnId}`
    }
    case "conditional": {
      const sideLabel = (s: TableConditionSide) => {
        if (s.kind === "number") return s.value
        if (s.kind === "text") return `"${s.value}"`
        if (s.kind === "varRef") return variables.find((v) => v.id === s.target)?.name ?? s.target
        return steps.find((st) => st.id === s.target)?.name ?? s.target
      }
      const b = token.branches[0]
      const { left, op, right } = b.condition
      const extra = token.branches.length > 1 ? " (...)" : ""
      return `IF ${sideLabel(left)} ${op} ${sideLabel(right)}${extra}`
    }
  }
}

function tokenStyle(type: ExpressionToken["type"]): string {
  const base = "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-mono border shrink-0"
  switch (type) {
    case "number":      return `${base} bg-[var(--color-token-number-bg)]      border-[var(--color-token-number-border)]      text-[var(--color-token-number)]`
    case "varRef":      return `${base} bg-[var(--color-token-varref-bg)]      border-[var(--color-token-varref-border)]      text-[var(--color-token-varref)]`
    case "stepRef":     return `${base} bg-[var(--color-token-stepref-bg)]     border-[var(--color-token-stepref-border)]     text-[var(--color-token-stepref)]`
    case "tableRef":    return `${base} bg-[var(--color-token-tableref-bg)]    border-[var(--color-token-tableref-border)]    text-[var(--color-token-tableref)]`
    case "conditional": return `${base} bg-[var(--color-token-conditional-bg)] border-[var(--color-token-conditional-border)] text-[var(--color-token-conditional)]`
    case "op":          return `${base} bg-[var(--color-surface)]              border-[var(--color-border)]                   text-[var(--color-token-op)]`
    case "paren": return `${base} bg-[var(--color-input)] border-[var(--color-border)] text-[var(--color-token-paren)]`
  }
}

const VALUE_TYPES = new Set(["number", "varRef", "stepRef", "tableRef", "conditional"])

function validateNewToken(expression: ExpressionToken[], newToken: ExpressionToken): string | null {
  const last = expression[expression.length - 1]
  const newIsValue = VALUE_TYPES.has(newToken.type)
  const newIsOp = newToken.type === "op"
  const newIsOpenP = newToken.type === "paren" && newToken.value === "("
  const newIsCloseP = newToken.type === "paren" && newToken.value === ")"

  if (!last) {
    if (newIsOp) return "Expressão não pode começar com operador"
    if (newIsCloseP) return "Expressão não pode começar com ')'"
    return null
  }

  const lastIsValue = VALUE_TYPES.has(last.type)
  const lastIsCloseP = last.type === "paren" && last.value === ")"
  const lastIsOp = last.type === "op"
  const lastIsOpenP = last.type === "paren" && last.value === "("

  if ((lastIsValue || lastIsCloseP) && newIsValue) return "Dois valores seguidos — adicione um operador entre eles"
  if ((lastIsValue || lastIsCloseP) && newIsOpenP) return "Parêntese de abertura após valor — adicione um operador antes"
  if ((lastIsOp || lastIsOpenP) && newIsOp) return "Dois operadores seguidos — adicione um valor entre eles"
  if ((lastIsOp || lastIsOpenP) && newIsCloseP) return "Parêntese de fechamento inválido após operador"
  return null
}


function ConditionEditor({
  cond,
  onChange: rawOnChange,
  variables,
  priorSteps,
}: {
  cond: TableCondition
  onChange: (c: TableCondition) => void
  variables: Variable[]
  priorSteps: Step[]
}) {
  const onChange = (c: TableCondition) => rawOnChange(sanitizeConditionOp(c, variables))
  const s = "text-xs px-1.5 py-0.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded outline-none focus:border-[var(--color-border-focus)] w-full"
  const textMode = isTextSide(cond.left, variables) || isTextSide(cond.right, variables)
  const availableOps = textMode ? TEXT_OPS : COMPARE_OPS
  return (
    <div className="flex gap-1.5 items-end">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-muted)]">Esquerda</span>
        <select className={s} value={cond.left.kind} onChange={(e) => {
          const k = e.target.value as TableConditionSide["kind"]
          const left = k === "number" ? { kind: "number" as const, value: "0" }
            : k === "text" ? { kind: "text" as const, value: "" }
            : k === "varRef" ? { kind: "varRef" as const, target: variables[0]?.id ?? "" }
            : { kind: "stepRef" as const, target: priorSteps[0]?.id ?? "" }
          onChange({ ...cond, left })
        }}>
          <option value="number">Number</option>
          <option value="text">Text</option>
          {variables.length > 0 && <option value="varRef">Variável</option>}
          {priorSteps.length > 0 && <option value="stepRef">Etapa</option>}
        </select>
        {cond.left.kind === "number" && <input className={s} value={(cond.left as {kind:"number";value:string}).value} onChange={(e) => onChange({ ...cond, left: { kind: "number", value: e.target.value } })} />}
        {cond.left.kind === "text" && <input className={s} value={(cond.left as {kind:"text";value:string}).value} onChange={(e) => onChange({ ...cond, left: { kind: "text", value: e.target.value } })} placeholder='ex: "M"' />}
        {cond.left.kind === "varRef" && <select className={s} value={(cond.left as {kind:"varRef";target:string}).target} onChange={(e) => onChange({ ...cond, left: { kind: "varRef", target: e.target.value } })}>{variables.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>}
        {cond.left.kind === "stepRef" && <select className={s} value={(cond.left as {kind:"stepRef";target:string}).target} onChange={(e) => onChange({ ...cond, left: { kind: "stepRef", target: e.target.value } })}>{priorSteps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
      </div>
      <div className="flex flex-col gap-0.5 w-14 shrink-0">
        <span className="text-[10px] text-[var(--color-muted)]">Op</span>
        <select className={s} value={cond.op} onChange={(e) => onChange({ ...cond, op: e.target.value as CompareOp })}>
          {availableOps.map((op) => <option key={op} value={op}>{op}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-muted)]">Direita</span>
        <select className={s} value={cond.right.kind} onChange={(e) => {
          const k = e.target.value as TableConditionSide["kind"]
          const right = k === "number" ? { kind: "number" as const, value: "0" }
            : k === "text" ? { kind: "text" as const, value: "" }
            : k === "varRef" ? { kind: "varRef" as const, target: variables[0]?.id ?? "" }
            : { kind: "stepRef" as const, target: priorSteps[0]?.id ?? "" }
          onChange({ ...cond, right })
        }}>
          <option value="number">Number</option>
          <option value="text">Text</option>
          {variables.length > 0 && <option value="varRef">Variável</option>}
          {priorSteps.length > 0 && <option value="stepRef">Etapa</option>}
        </select>
        {cond.right.kind === "number" && <input className={s} value={(cond.right as {kind:"number";value:string}).value} onChange={(e) => onChange({ ...cond, right: { kind: "number", value: e.target.value } })} />}
        {cond.right.kind === "text" && <input className={s} value={(cond.right as {kind:"text";value:string}).value} onChange={(e) => onChange({ ...cond, right: { kind: "text", value: e.target.value } })} placeholder='ex: "M"' />}
        {cond.right.kind === "varRef" && <select className={s} value={(cond.right as {kind:"varRef";target:string}).target} onChange={(e) => onChange({ ...cond, right: { kind: "varRef", target: e.target.value } })}>{variables.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>}
        {cond.right.kind === "stepRef" && <select className={s} value={(cond.right as {kind:"stepRef";target:string}).target} onChange={(e) => onChange({ ...cond, right: { kind: "stepRef", target: e.target.value } })}>{priorSteps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
      </div>
    </div>
  )
}

function ScalarTokenEditor({
  token,
  onChange,
  variables,
  priorSteps,
  tables,
  label,
}: {
  token: ScalarToken
  onChange: (t: ScalarToken) => void
  variables: Variable[]
  priorSteps: Step[]
  tables: LookupTable[]
  label: string
}) {
  const selCls = "text-xs px-1.5 py-0.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded outline-none focus:border-[var(--color-border-focus)] w-full"
  return (
    <div className="flex flex-col gap-0.5 flex-1">
      <span className="text-[10px] text-[var(--color-muted)]">{label}</span>
      <select
        className={selCls}
        value={token.type}
        onChange={(e) => {
          const t = e.target.value as ScalarToken["type"]
          if (t === "number") onChange({ type: "number", value: "0" })
          else if (t === "varRef") onChange({ type: "varRef", target: variables[0]?.id ?? "" })
          else if (t === "stepRef") onChange({ type: "stepRef", target: priorSteps[0]?.id ?? "" })
          else {
            const tbl = tables[0]
            onChange({ type: "tableRef", tableId: tbl?.id ?? "", columnId: tbl?.columns[0]?.id ?? "", rowId: null })
          }
        }}
      >
        <option value="number">Número</option>
        {variables.length > 0 && <option value="varRef">Variável</option>}
        {priorSteps.length > 0 && <option value="stepRef">Etapa</option>}
        {tables.length > 0 && <option value="tableRef">Tabela</option>}
      </select>
      {token.type === "number" && (
        <input className={selCls} value={token.value} onChange={(e) => onChange({ type: "number", value: e.target.value })} />
      )}
      {token.type === "varRef" && (
        <select className={selCls} value={token.target} onChange={(e) => onChange({ type: "varRef", target: e.target.value })}>
          {variables.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      )}
      {token.type === "stepRef" && (
        <select className={selCls} value={token.target} onChange={(e) => onChange({ type: "stepRef", target: e.target.value })}>
          {priorSteps.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      {token.type === "tableRef" && (() => {
        const tbl = tables.find((t) => t.id === token.tableId)
        const hasConditionalCols = tbl?.columns.some((c) => c.condition !== undefined) ?? false
        const firstFixedCol = tbl?.columns.find((c) => c.condition === undefined)?.id ?? tbl?.columns[0]?.id ?? ""
        const firstRow = tbl?.rows[0]?.id ?? ""
        const selMode = token.columnId !== null
          ? (token.rowId != null ? "__linha_coluna__" : "__coluna__")
          : (token.rowId != null ? "__linha__" : "__2d__")
        return (
          <>
            <select
              className={selCls}
              value={token.tableId}
              onChange={(e) => {
                const t = tables.find((tb) => tb.id === e.target.value)
                const firstNonCond = t?.columns.find((c) => c.condition === undefined)
                onChange({ type: "tableRef", tableId: e.target.value, columnId: firstNonCond?.id ?? t?.columns[0]?.id ?? "", rowId: null })
              }}
            >
              {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              className={selCls}
              value={selMode}
              onChange={(e) => {
                const v = e.target.value
                if (v === "__2d__") onChange({ type: "tableRef", tableId: token.tableId, columnId: null, rowId: null })
                else if (v === "__coluna__") onChange({ type: "tableRef", tableId: token.tableId, columnId: firstFixedCol, rowId: null })
                else if (v === "__linha__") onChange({ type: "tableRef", tableId: token.tableId, columnId: null, rowId: firstRow })
                else if (v === "__linha_coluna__") onChange({ type: "tableRef", tableId: token.tableId, columnId: firstFixedCol, rowId: firstRow })
              }}
            >
              {hasConditionalCols && <option value="__2d__">Runtime 2D</option>}
              <option value="__coluna__">Coluna fixa</option>
              {hasConditionalCols && <option value="__linha__">Linha fixa</option>}
              <option value="__linha_coluna__">Linha + Coluna fixas</option>
            </select>
            {token.columnId !== null && tbl?.columns && (
              <select
                className={selCls}
                value={token.columnId ?? ""}
                onChange={(e) => onChange({ type: "tableRef", tableId: token.tableId, columnId: e.target.value, rowId: token.rowId ?? null })}
              >
                {tbl.columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            )}
            {token.rowId != null && tbl?.rows && (
              <select
                className={selCls}
                value={token.rowId ?? ""}
                onChange={(e) => onChange({ type: "tableRef", tableId: token.tableId, columnId: token.columnId, rowId: e.target.value })}
              >
                {tbl.rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.label ?? r.id}</option>
                ))}
              </select>
            )}
          </>
        )
      })()}
    </div>
  )
}

export function StepCard({
  step,
  stepIndex,
  totalSteps,
  variables,
  tables,
  priorSteps,
  dispatch,
  stepResult,
  testValues = {},
  testResults = {},
}: Props) {
  const { confirm, pending, handleConfirm, handleCancel } = useConfirm()
  const [mode, setMode] = useState<ToolbarMode>("idle")
  const [numValue, setNumValue] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [exprError, setExprError] = useState<string | null>(null)

  useEffect(() => {
    if (!exprError) return
    const t = setTimeout(() => setExprError(null), 3500)
    return () => clearTimeout(t)
  }, [exprError])
  const [tableRefState, setTableRefState] = useState<{ 
    tableId: string; 
    columnId: string | null; 
    rowId: string | null;
    arguments?: Record<string, TableConditionSide>
  }>({ tableId: "", columnId: "", rowId: null, arguments: {} })
  const [varRefValue, setVarRefValue] = useState("")
  const [stepRefValue, setStepRefValue] = useState("")
  const numInputRef = useRef<HTMLInputElement>(null)

  const allSteps = [...priorSteps, step]
  const hasTestData = Object.keys(testResults).length > 0
  const resolvedPreview = hasTestData && step.expression.length > 0
    ? step.expression.map((t) => resolvedLabel(t, variables, tables, testValues, testResults)).join(" ")
    : ""
  const brokenRefs = getBrokenTokenRefs(
    step.expression,
    variables,
    allSteps,
    stepIndex,
    tables
  )
  const parensOk = validateParens(step.expression)

  const addToken = (token: ExpressionToken) => {
    if (editingIndex !== null) {
      dispatch({ type: "UPDATE_TOKEN", stepId: step.id, index: editingIndex, token })
      setEditingIndex(null)
    } else {
      const err = validateNewToken(step.expression, token)
      if (err) { setExprError(err); return }
      dispatch({ type: "ADD_TOKEN", stepId: step.id, token })
    }
    setMode("idle")
    setNumValue("")
  }

  const commitNumber = () => {
    const v = numValue.trim()
    if (!v) { setMode("idle"); setNumValue(""); setEditingIndex(null); return }
    addToken({ type: "number", value: v })
  }

  const selCls = "text-xs px-1.5 py-0.5 bg-[var(--color-input)] border border-[var(--color-border)] rounded outline-none focus:border-[var(--color-border-focus)]"

  // Default conditional state
  const defaultCond: TableCondition = {
    left: { kind: variables[0] ? "varRef" : "number", target: variables[0]?.id, value: "0" } as TableCondition["left"],
    op: "<" as CompareOp,
    right: { kind: "number", value: "0" },
  }
  const [condBranches, setCondBranches] = useState<Array<{ condition: TableCondition; value: ScalarToken }>>([
    { condition: defaultCond, value: { type: "number", value: "0" } }
  ])
  const [elseToken, setElseToken] = useState<ScalarToken>({ type: "number", value: "0" })

  return (
    <div
      className={`rounded-lg border shadow-card ${
        (step.kind ?? "output") === "output"
          ? "bg-[var(--color-card)] border-[var(--color-border)]"
          : "bg-[var(--color-surface)] border-[var(--color-border)]"
      } ${!step.enabled ? "opacity-60" : ""}`}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] overflow-hidden">
        <div className="w-9 h-9 flex items-center justify-center bg-[var(--color-accent)] text-white text-sm font-bold rounded-tl-lg rounded-br-lg -ml-3 -mt-2 shrink-0">
          {stepIndex + 1}
        </div>
        {/* Reorder arrows */}
        <div className="flex flex-col">
          <button
            className="text-[10px] text-[var(--color-muted)] leading-none hover:text-[var(--color-text)] bg-transparent border-none cursor-pointer disabled:opacity-20"
            disabled={stepIndex === 0}
            onClick={() => dispatch({ type: "REORDER_STEP", fromIndex: stepIndex, toIndex: stepIndex - 1 })}
          >▲</button>
          <button
            className="text-[10px] text-[var(--color-muted)] leading-none hover:text-[var(--color-text)] bg-transparent border-none cursor-pointer disabled:opacity-20"
            disabled={stepIndex === totalSteps - 1}
            onClick={() => dispatch({ type: "REORDER_STEP", fromIndex: stepIndex, toIndex: stepIndex + 1 })}
          >▼</button>
        </div>

        {/* Name */}
        <input
          className="flex-1 text-sm font-medium bg-transparent border-b border-transparent focus:border-[var(--color-border)] outline-none px-1 py-0.5"
          value={step.name}
          onChange={(e) => dispatch({ type: "UPDATE_STEP", id: step.id, patch: { name: e.target.value } })}
        />

        {/* Step result */}
        {stepResult && (
          stepResult.error ? (
            <span className="text-[10px] text-[var(--color-red)] font-mono shrink-0 max-w-[100px] truncate" title={stepResult.error}>
              ✕ {stepResult.error}
            </span>
          ) : stepResult.value !== null ? (
            <span className="text-[10px] font-mono font-semibold text-[var(--color-accent)] shrink-0">
              = {stepResult.value}
            </span>
          ) : null
        )}

        {/* Warnings */}
        {!parensOk && (
          <span className="text-[10px] text-[var(--color-yellow)] border border-[var(--color-yellow)]/50 px-1.5 py-0.5 rounded">
            ⚠ Parênteses
          </span>
        )}

        {/* Clamp badge */}
        <button
          className={`text-[10px] px-1 py-0.5 rounded border cursor-pointer font-mono leading-none shrink-0 ${
            step.clamp
              ? "border-[var(--color-yellow)]/60 text-[var(--color-yellow)] bg-[var(--color-yellow)]/10"
              : "border-[var(--color-border)] text-[var(--color-muted)] bg-transparent"
          }`}
          onClick={() => dispatch({ type: "UPDATE_STEP", id: step.id, patch: { clamp: !step.clamp } })}
          title={step.clamp ? "Aplica min/max (clique para desativar)" : "Não aplica min/max (clique para ativar)"}
        >
          min/max
        </button>

        {/* Kind badge */}
        <button
          className={`text-[10px] px-1 py-0.5 rounded border cursor-pointer font-mono leading-none shrink-0 ${
            (step.kind ?? "output") === "output"
              ? "border-[var(--color-accent)]/60 text-[var(--color-accent)] bg-[var(--color-accent)]/10"
              : "border-[var(--color-border)] text-[var(--color-muted)] bg-transparent"
          }`}
          onClick={() => dispatch({ type: "UPDATE_STEP", id: step.id, patch: { kind: (step.kind ?? "output") === "output" ? "internal" : "output" } })}
          title={(step.kind ?? "output") === "output" ? "Resultado (clique para marcar como interno)" : "Interno (clique para marcar como resultado)"}
        >
          {(step.kind ?? "output") === "output" ? "output" : "internal"}
        </button>

        {/* Enable toggle */}
        <button
          className={`text-xs px-2 py-0.5 rounded border cursor-pointer ${
            step.enabled
              ? "border-[var(--color-green)]/50 text-[var(--color-green)]"
              : "border-[var(--color-red)]/50 text-[var(--color-red)]"
          }`}
          onClick={() => dispatch({ type: "UPDATE_STEP", id: step.id, patch: { enabled: !step.enabled } })}
          title={step.enabled ? "Desativar etapa" : "Ativar etapa"}
        >
          {step.enabled ? "ON" : "OFF"}
        </button>

        {/* Delete */}
        <button
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-red)] bg-transparent border-none cursor-pointer"
          onClick={() => confirm(`Remover a etapa "${step.name}"?`, () => dispatch({ type: "DELETE_STEP", id: step.id }))}
        >
          ×
        </button>
      </div>

      {/* Resolved expression preview */}
      {resolvedPreview && (
        <div className="px-3 py-1 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <p className="text-[11px] text-[var(--color-muted)] font-mono truncate" title={resolvedPreview}>
            {resolvedPreview}
          </p>
        </div>
      )}

      {/* Token strip */}
      <div className="px-3 py-2 flex flex-wrap gap-1.5 min-h-[36px]">
        {step.expression.length === 0 && (
          <span className="text-xs text-[var(--color-muted)] italic">Expressão vazia…</span>
        )}
        {step.expression.map((token, i) => (
          <span
            key={i}
            className={`${tokenStyle(token.type)} ${brokenRefs.has(i) ? "!border-[var(--color-red)] !text-[var(--color-red)]" : ""} group cursor-default`}
          >
            {token.type === "number" ? (
              <span
                className="cursor-pointer hover:underline"
                onClick={() => {
                  setNumValue(token.value)
                  setEditingIndex(i)
                  setMode("number")
                  setTimeout(() => numInputRef.current?.focus(), 0)
                }}
              >
                {token.value}
              </span>
            ) : token.type === "conditional" ? (
              <span
                className="cursor-pointer hover:underline"
                onClick={() => {
                  setCondBranches(token.branches)
                  setElseToken(token.elseToken)
                  setEditingIndex(i)
                  setMode("conditional")
                }}
              >
                {tokenLabel(token, variables, [...priorSteps, step], tables)}
              </span>
            ) : token.type === "varRef" ? (
              <span
                className="cursor-pointer hover:underline"
                onClick={() => { setVarRefValue(token.target); setEditingIndex(i); setMode("varRef") }}
              >
                {tokenLabel(token, variables, [...priorSteps, step], tables)}
              </span>
            ) : token.type === "stepRef" ? (
              <span
                className="cursor-pointer hover:underline"
                onClick={() => { setStepRefValue(token.target); setEditingIndex(i); setMode("stepRef") }}
              >
                {tokenLabel(token, variables, [...priorSteps, step], tables)}
              </span>
            ) : token.type === "tableRef" ? (
              <span
                className="cursor-pointer hover:underline"
                onClick={() => { 
                  setTableRefState({ 
                    tableId: token.tableId, 
                    columnId: token.columnId, 
                    rowId: token.rowId ?? null,
                    arguments: token.arguments ?? {}
                  }); 
                  setEditingIndex(i); 
                  setMode("tableRef") 
                }}
              >
                {tokenLabel(token, variables, [...priorSteps, step], tables)}
              </span>
            ) : (
              <span>{tokenLabel(token, variables, [...priorSteps, step], tables)}</span>
            )}
            <button
              className="opacity-0 group-hover:opacity-100 text-[10px] leading-none hover:text-[var(--color-red)] bg-transparent border-none cursor-pointer ml-0.5"
              onClick={() => dispatch({ type: "REMOVE_TOKEN", stepId: step.id, index: i })}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Toolbar — mode editors (only shown when a mode is active or there's an error) */}
      {(mode !== "idle" || exprError) && (
      <div className="px-3 pb-2 border-t border-[var(--color-border)]/50 pt-2 flex flex-col gap-2">

        {/* Mode: number input */}
        {mode === "number" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-muted)]">{editingIndex !== null ? "Editar número:" : "Número:"}</span>
            <input
              ref={numInputRef}
              className={`${selCls} w-28`}
              value={numValue}
              onChange={(e) => setNumValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNumber()
                if (e.key === "Escape") { setMode("idle"); setNumValue(""); setEditingIndex(null) }
              }}
              placeholder="0.00"
              autoFocus
            />
            <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-accent)] text-[var(--color-accent)] cursor-pointer" onClick={commitNumber}>OK</button>
            <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-muted)] cursor-pointer" onClick={() => { setMode("idle"); setNumValue(""); setEditingIndex(null) }}>Cancelar</button>
          </div>
        )}

        {/* Mode: varRef select */}
        {mode === "varRef" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-muted)]">{editingIndex !== null ? "Editar variável:" : "Variável:"}</span>
            <select
              className={selCls}
              value={varRefValue}
              onChange={(e) => { setVarRefValue(e.target.value); if (e.target.value) addToken({ type: "varRef", target: e.target.value }) }}
              autoFocus
            >
              <option value="" disabled>Selecionar…</option>
              {variables.filter((v) => (v.valueType ?? "number") === "number").map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-muted)] cursor-pointer" onClick={() => { setMode("idle"); setEditingIndex(null); setVarRefValue("") }}>Cancelar</button>
          </div>
        )}

        {/* Mode: stepRef select */}
        {mode === "stepRef" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--color-muted)]">{editingIndex !== null ? "Editar etapa:" : "Etapa:"}</span>
            <select
              className={selCls}
              value={stepRefValue}
              onChange={(e) => { setStepRefValue(e.target.value); if (e.target.value) addToken({ type: "stepRef", target: e.target.value }) }}
              autoFocus
            >
              <option value="" disabled>Selecionar…</option>
              {priorSteps.filter((s) => s.enabled).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-muted)] cursor-pointer" onClick={() => { setMode("idle"); setEditingIndex(null); setStepRefValue("") }}>Cancelar</button>
          </div>
        )}

        {/* Mode: tableRef select — table → mode (coluna fixa / linha fixa / ambas / runtime 2D) */}
        {mode === "tableRef" && (() => {
          const tbl = tables.find((t) => t.id === tableRefState.tableId)
          const hasConditionalCols = tbl?.columns.some((c) => c.condition !== undefined) ?? false
          const firstFixedCol = tbl?.columns.find((c) => c.condition === undefined)?.id ?? tbl?.columns[0]?.id ?? ""
          const firstRow = tbl?.rows[0]?.id ?? ""

          // Derive mode from state: columnId + rowId
          const selMode = tableRefState.columnId !== null
            ? (tableRefState.rowId != null ? "__linha_coluna__" : "__coluna__")
            : (tableRefState.rowId != null ? "__linha__" : "__2d__")

          // Check if all required parameters are provided
          const requiredParams = tbl?.parameters ?? []
          const providedParams = Object.keys(tableRefState.arguments ?? {})
          const allParamsProvided = requiredParams.every(p => providedParams.includes(p))

          const canConfirm = !!tableRefState.tableId && 
            allParamsProvided &&
            (
              selMode === "__2d__" ||
              (selMode === "__coluna__" && !!tableRefState.columnId) ||
              (selMode === "__linha__" && !!tableRefState.rowId) ||
              (selMode === "__linha_coluna__" && !!tableRefState.columnId && !!tableRefState.rowId)
            )

          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[var(--color-muted)]">{editingIndex !== null ? "Editar tabela:" : "Tabela:"}</span>
              <select
                className={`${selCls} max-w-[130px]`}
                value={tableRefState.tableId}
                onChange={(e) => {
                  const t = tables.find((tb) => tb.id === e.target.value)
                  const firstNonCond = t?.columns.find((c) => c.condition === undefined)
                  // Initialize arguments with defaults for new table's parameters
                  const initialArgs: Record<string, TableConditionSide> = {}
                  if (t?.parameters) {
                    for (const param of t.parameters) {
                      initialArgs[param] = { kind: "number", value: "0" }
                    }
                  }
                  setTableRefState({ 
                    tableId: e.target.value, 
                    columnId: firstNonCond?.id ?? t?.columns[0]?.id ?? "", 
                    rowId: null,
                    arguments: initialArgs
                  })
                }}
                autoFocus
              >
                <option value="" disabled>Selecionar…</option>
                {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {tableRefState.tableId && (
                <select
                  className={selCls}
                  value={selMode}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === "__2d__") setTableRefState((s) => ({ ...s, columnId: null, rowId: null }))
                    else if (v === "__coluna__") setTableRefState((s) => ({ ...s, columnId: firstFixedCol, rowId: null }))
                    else if (v === "__linha__") setTableRefState((s) => ({ ...s, columnId: null, rowId: firstRow }))
                    else if (v === "__linha_coluna__") setTableRefState((s) => ({ ...s, columnId: firstFixedCol, rowId: firstRow }))
                  }}
                >
                  {hasConditionalCols && <option value="__2d__">Runtime 2D</option>}
                  <option value="__coluna__">Coluna fixa</option>
                  {hasConditionalCols && <option value="__linha__">Linha fixa</option>}
                  <option value="__linha_coluna__">Linha + Coluna fixas</option>
                </select>
              )}
              {tableRefState.tableId && tableRefState.columnId !== null && (
                <>
                  <span className="text-xs text-[var(--color-muted)]">Col:</span>
                  <select
                    className={`${selCls} max-w-[130px]`}
                    value={tableRefState.columnId ?? ""}
                    onChange={(e) => setTableRefState((s) => ({ ...s, columnId: e.target.value }))}
                  >
                    {tbl?.columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </>
              )}
              {tableRefState.tableId && tableRefState.rowId != null && (
                <>
                  <span className="text-xs text-[var(--color-muted)]">Linha:</span>
                  <select
                    className={`${selCls} max-w-[130px]`}
                    value={tableRefState.rowId ?? ""}
                    onChange={(e) => setTableRefState((s) => ({ ...s, rowId: e.target.value }))}
                  >
                    {tbl?.rows.map((r) => (
                      <option key={r.id} value={r.id}>{r.label ?? r.id}</option>
                    ))}
                  </select>
                </>
              )}
              {/* Arguments editor for parameterized tables */}
              {tableRefState.tableId && tbl?.parameters && tbl.parameters.length > 0 && (
                <div className="w-full flex flex-col gap-2 p-2 border border-[var(--color-border)] rounded bg-[var(--color-surface)]/30">
                  <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Argumentos:</span>
                  {tbl.parameters.map((param) => {
                    const argSide = tableRefState.arguments?.[param] ?? { kind: "number" as const, value: "0" }
                    return (
                      <div key={param} className="flex flex-col gap-1">
                        <span className="text-[10px] text-[var(--color-muted)] font-mono">{param}:</span>
                        <div className="flex items-center gap-1">
                          <select
                            className={`${selCls} max-w-[100px]`}
                            value={argSide.kind}
                            onChange={(e) => {
                              const k = e.target.value as TableConditionSide["kind"]
                              let newSide: TableConditionSide
                              if (k === "number") newSide = { kind: "number", value: "0" }
                              else if (k === "text") newSide = { kind: "text", value: "" }
                              else if (k === "varRef") newSide = { kind: "varRef", target: variables[0]?.id ?? "" }
                              else newSide = { kind: "stepRef", target: priorSteps[0]?.id ?? "" }
                              setTableRefState((s) => ({
                                ...s,
                                arguments: { ...s.arguments, [param]: newSide }
                              }))
                            }}
                          >
                            <option value="number">Número</option>
                            <option value="text">Texto</option>
                            {variables.length > 0 && <option value="varRef">Variável</option>}
                            {priorSteps.length > 0 && <option value="stepRef">Etapa</option>}
                          </select>
                          {argSide.kind === "number" && (
                            <input
                              className={`${selCls} flex-1`}
                              value={argSide.value}
                              onChange={(e) => setTableRefState((s) => ({
                                ...s,
                                arguments: { ...s.arguments, [param]: { kind: "number", value: e.target.value } }
                              }))}
                              placeholder="0"
                            />
                          )}
                          {argSide.kind === "text" && (
                            <input
                              className={`${selCls} flex-1`}
                              value={argSide.value}
                              onChange={(e) => setTableRefState((s) => ({
                                ...s,
                                arguments: { ...s.arguments, [param]: { kind: "text", value: e.target.value } }
                              }))}
                              placeholder="texto"
                            />
                          )}
                          {argSide.kind === "varRef" && (
                            <select
                              className={`${selCls} flex-1`}
                              value={argSide.target}
                              onChange={(e) => setTableRefState((s) => ({
                                ...s,
                                arguments: { ...s.arguments, [param]: { kind: "varRef", target: e.target.value } }
                              }))}
                            >
                              {variables.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          )}
                          {argSide.kind === "stepRef" && (
                            <select
                              className={`${selCls} flex-1`}
                              value={argSide.target}
                              onChange={(e) => setTableRefState((s) => ({
                                ...s,
                                arguments: { ...s.arguments, [param]: { kind: "stepRef", target: e.target.value } }
                              }))}
                            >
                              {priorSteps.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {tableRefState.tableId && (
                <button
                  className="text-xs px-2 py-0.5 rounded border border-[var(--color-teal)] text-[var(--color-teal)] cursor-pointer disabled:opacity-40"
                  disabled={!canConfirm}
                  onClick={() => {
                    const token: ExpressionToken = {
                      type: "tableRef",
                      tableId: tableRefState.tableId,
                      columnId: tableRefState.columnId,
                      rowId: tableRefState.rowId
                    }
                    // Only add arguments if table has parameters
                    if (tbl?.parameters && tbl.parameters.length > 0) {
                      token.arguments = tableRefState.arguments
                    }
                    addToken(token)
                  }}
                >
                  OK
                </button>
              )}
              <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-muted)] cursor-pointer" onClick={() => { setMode("idle"); setEditingIndex(null) }}>Cancelar</button>
            </div>
          )
        })()}

        {/* Mode: conditional builder */}
        {mode === "conditional" && (
          <div className="flex flex-col gap-2 bg-[var(--color-surface)] border border-[var(--color-yellow)]/30 rounded p-2">
            <span className="text-xs font-semibold text-[var(--color-yellow)]">Condicional</span>

            {condBranches.map((branch, bi) => (
              <div key={bi} className="flex flex-col gap-1.5 border border-[var(--color-border)]/60 rounded p-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--color-yellow)]">{bi === 0 ? "SE" : "SENÃO SE"}</span>
                  {condBranches.length > 1 && (
                    <button
                      className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-red)] cursor-pointer bg-transparent border-none"
                      onClick={() => setCondBranches((b) => b.filter((_, i) => i !== bi))}
                    >×</button>
                  )}
                </div>
                <ConditionEditor
                  cond={branch.condition}
                  onChange={(c) => setCondBranches((b) => b.map((x, i) => i === bi ? { ...x, condition: c } : x))}
                  variables={variables}
                  priorSteps={priorSteps}
                />
                <ScalarTokenEditor
                  label="ENTÃO"
                  token={branch.value}
                  onChange={(v) => setCondBranches((b) => b.map((x, i) => i === bi ? { ...x, value: v } : x))}
                  variables={variables}
                  priorSteps={priorSteps}
                  tables={tables}
                />
              </div>
            ))}

            <button
              className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-muted)] cursor-pointer self-start"
              onClick={() => setCondBranches((b) => [...b, { condition: defaultCond, value: { type: "number", value: "0" } }])}
            >+ Senão SE</button>

            <div className="border-t border-[var(--color-border)]/40 pt-1.5">
              <ScalarTokenEditor label="SENÃO" token={elseToken} onChange={setElseToken} variables={variables} priorSteps={priorSteps} tables={tables} />
            </div>

            <div className="flex gap-1.5 justify-end">
              <button
                className="text-xs px-2 py-0.5 rounded border border-[var(--color-yellow)] text-[var(--color-yellow)] cursor-pointer"
                onClick={() => addToken({ type: "conditional", branches: condBranches, elseToken })}
              >
                {editingIndex !== null ? "Salvar IF" : "+ Adicionar IF"}
              </button>
              <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-muted)] cursor-pointer" onClick={() => setMode("idle")}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Expression error toast */}
        {exprError && (
          <div className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded border border-[var(--color-red)]/50 bg-[var(--color-red)]/10 text-[var(--color-red)]">
            <span>⚠ {exprError}</span>
            <button className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer" onClick={() => setExprError(null)}>×</button>
          </div>
        )}
      </div>
      )}

      {/* Footer — insertion buttons, always visible */}
      <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] rounded-b-lg flex flex-wrap gap-1">
        <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-token-number-border)] bg-[var(--color-token-number-bg)] text-[var(--color-token-number)] cursor-pointer" onClick={() => { setNumValue(""); setEditingIndex(null); setMode("number"); setTimeout(() => numInputRef.current?.focus(), 0) }}>+ Número</button>
        {variables.some((v) => (v.valueType ?? "number") === "number") && <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-token-varref-border)] bg-[var(--color-token-varref-bg)] text-[var(--color-token-varref)] cursor-pointer" onClick={() => setMode("varRef")}>+ Variável</button>}
        {priorSteps.filter((s) => s.enabled).length > 0 && <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-token-stepref-border)] bg-[var(--color-token-stepref-bg)] text-[var(--color-token-stepref)] cursor-pointer" onClick={() => setMode("stepRef")}>+ Etapa</button>}
        {tables.length > 0 && <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-token-tableref-border)] bg-[var(--color-token-tableref-bg)] text-[var(--color-token-tableref)] cursor-pointer" onClick={() => { 
          const t = tables[0]; 
          const initialArgs: Record<string, TableConditionSide> = {}
          if (t?.parameters) {
            for (const param of t.parameters) {
              initialArgs[param] = { kind: "number", value: "0" }
            }
          }
          setTableRefState({ tableId: t?.id ?? "", columnId: t?.columns[0]?.id ?? "", rowId: null, arguments: initialArgs }); 
          setMode("tableRef") 
        }}>+ Tabela</button>}
        <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-token-conditional-border)] bg-[var(--color-token-conditional-bg)] text-[var(--color-token-conditional)] cursor-pointer" onClick={() => setMode("conditional")}>+ IF</button>
        <span className="border-l border-[var(--color-border)] mx-0.5" />
        {(["+", "-", "*", "/", "%"] as const).map((op) => (
          <button key={op} className="text-xs px-2 py-0.5 rounded border border-[var(--color-token-op)] bg-[var(--color-surface)] text-[var(--color-token-op)] cursor-pointer font-mono"
            onClick={() => addToken({ type: "op", value: op })}
          >
            {op === "*" ? "×" : op === "/" ? "÷" : op}
          </button>
        ))}
        <span className="border-l border-[var(--color-border)] mx-0.5" />
        <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-token-paren)] cursor-pointer font-mono" onClick={() => addToken({ type: "paren", value: "(" })}>(</button>
        <button className="text-xs px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-token-paren)] cursor-pointer font-mono" onClick={() => addToken({ type: "paren", value: ")" })}>)</button>
      </div>

      {pending && (
        <Modal title="Confirmar exclusão" onClose={handleCancel}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--color-muted)]">{pending.message}</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 text-sm rounded border border-[var(--color-red)] text-[var(--color-red)] cursor-pointer"
                onClick={handleConfirm}
              >
                Remover
              </button>
              <button
                className="px-3 py-1 text-sm rounded border border-[var(--color-border)] bg-[var(--color-card)] cursor-pointer"
                onClick={handleCancel}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
