# Services Layer — Data Access Abstraction

Abstraction layer between API routes and Supabase. All services receive the
database client (`db`) as the first argument (dependency injection).

## Motivation

- **Decouple** routes from Supabase specifics — easier to swap providers
- **Centralize** queries — single place to add logging, caching, metrics (New Relic)
- **Testability** — mock the client, not the entire Supabase SDK
- **Reduce duplication** — same query pattern repeated across routes

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  API Route   │ ───→ │   Service    │ ───→ │   Supabase   │
│  (HTTP)      │      │  (business)  │      │   (data)     │
│              │      │              │      │              │
│ resolveAuth  │      │ getEngineById│      │ .from(...)   │
│ parse body   │      │ listEngines  │      │ .select(...) │
│ HTTP response│      │ createEngine │      │ .single()    │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     ▲
       │      passes db      │
       └─────────────────────┘
```

**The service never creates the client** — the caller decides which auth context
to use (cookie-based via `createSupabaseClient()` or service-role via
`createServerClient()`), then passes the resulting client to the service.

## File Structure

```
services/
├── engines.ts      # Engine CRUD + fetch by ID
├── projects.ts     # Project CRUD + activation
├── calc.ts         # Contract functions + calc orchestration (migrated from core/contract.ts)
├── api-keys.ts     # API key CRUD (uses service-role client)
└── auth.ts         # Login/logout (if needed beyond current resolveAuth)
```

## Conventions

1. **First argument is always `db`** — typed as `SupabaseClient`, named provider-agnostic
2. **Throw on error** — services throw, routes catch and return HTTP responses
3. **Return typed data** — no raw Supabase responses leak out
4. **No HTTP concerns** — no `NextRequest`, `NextResponse`, status codes
5. **Zod schemas as SSOT** — derive all types via `z.infer<>` from `schemas/api.ts`; never duplicate type definitions manually

---

## Implementation

### `services/engines.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { z } from 'zod'
import type { EngineRecordSchema } from '@/schemas/api'

// Zod schema is SSOT — derive the type, never duplicate manually
export type EngineRow = z.infer<typeof EngineRecordSchema>

export async function listEngines(db: SupabaseClient, projectId: string): Promise<EngineRow[]> {
  const { data, error } = await db
    .from('engines')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getEngineById(db: SupabaseClient, id: string): Promise<EngineRow | null> {
  const { data, error } = await db
    .from('engines')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch only the engine definition (lighter than getEngineById).
 * Used by calc routes that only need the EngineState.
 */
export async function getEngineDefinition(db: SupabaseClient, id: string): Promise<EngineState | null> {
  const { data, error } = await db
    .from('engines')
    .select('engine')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data.engine as EngineState
}

export async function createEngine(
  db: SupabaseClient,
  projectId: string,
  payload: { name: string; engine: EngineState }
): Promise<EngineRow> {
  const { data, error } = await db
    .from('engines')
    .insert({ ...payload, project_id: projectId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEngine(
  db: SupabaseClient,
  id: string,
  payload: Partial<Pick<EngineRow, 'name' | 'engine'>>
): Promise<EngineRow> {
  const { data, error } = await db
    .from('engines')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEngine(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db
    .from('engines')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function activateEngine(db: SupabaseClient, id: string, projectId: string): Promise<void> {
  // Deactivate all engines in the project, then activate the target
  const { error: deactivateError } = await db
    .from('engines')
    .update({ is_active: false })
    .eq('project_id', projectId)

  if (deactivateError) throw deactivateError

  const { error } = await db
    .from('engines')
    .update({ is_active: true })
    .eq('id', id)

  if (error) throw error
}
```

### `services/projects.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { z } from 'zod'
import type { ProjectSchema } from '@/schemas/api'

// Zod schema is SSOT — derive the type, never duplicate manually
export type ProjectRow = z.infer<typeof ProjectSchema>

export async function listProjects(db: SupabaseClient): Promise<ProjectRow[]> {
  const { data, error } = await db
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getProjectById(db: SupabaseClient, id: string): Promise<ProjectRow | null> {
  const { data, error } = await db
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createProject(
  db: SupabaseClient,
  payload: { name: string }
): Promise<ProjectRow> {
  const { data, error } = await db
    .from('projects')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(
  db: SupabaseClient,
  id: string,
  payload: Partial<Pick<ProjectRow, 'name'>>
): Promise<ProjectRow> {
  const { data, error } = await db
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProject(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function activateProject(db: SupabaseClient, id: string): Promise<void> {
  // Deactivate all, then activate target
  const { error: deactivateError } = await db
    .from('projects')
    .update({ is_active: false })
    .neq('id', id)

  if (deactivateError) throw deactivateError

  const { error } = await db
    .from('projects')
    .update({ is_active: true })
    .eq('id', id)

  if (error) throw error
}
```

### `services/calc.ts`

Migrated from `core/contract.ts`. Contains the public contract functions
(name ↔ id translation, input schema, output projection) plus a convenience
orchestrator for executing calculations.

> **Why here instead of `core/`?** These functions are consumed exclusively by
> API routes (`/api/calc`, `/api/schemas`) — zero builder UI usage. They belong
> to the API/services layer, not the builder toolkit.

```ts
import type { z } from 'zod'
import type { EngineState, ExecuteResult } from '@/lib/runtime'
import { execute } from '@/lib/runtime'
import type {
  InputSchemaSchema,
  InputSchemaPropertySchema,
  OutputContractSchema,
} from '@/schemas/api'

// Zod schema is SSOT — derive the types, never duplicate manually
export type InputSchema = z.infer<typeof InputSchemaSchema>
export type InputSchemaProperty = z.infer<typeof InputSchemaPropertySchema>
export type OutputContract = z.infer<typeof OutputContractSchema>

// --- Contract functions (pure, no DB) ---

/**
 * Builds a JSON Schema describing the engine input variables.
 * Only `kind === "input"` variables are included.
 */
export function buildInputSchema(
  engine: EngineState,
  options: { keyBy: 'name' | 'id' }
): InputSchema {
  const { keyBy } = options
  const inputs = engine.variables.filter((v) => {
    if ((v.kind ?? 'input') !== 'input') return false
    if (keyBy === 'name' && !v.name) return false
    return true
  })

  const properties = Object.fromEntries(
    inputs.map((v) => {
      const property: InputSchemaProperty = {
        type: 'string',
        default: v.defaultValue,
      }
      if (keyBy === 'id') property.title = v.name
      if (v.unit) property.description = v.unit
      if (keyBy === 'id' && v.valueType === 'text') property.format = 'text'
      return [keyBy === 'name' ? v.name : v.id, property]
    })
  )

  return {
    title: engine.name,
    type: 'object',
    properties,
    required: inputs.map((v) => (keyBy === 'name' ? v.name : v.id)),
  }
}

/**
 * Translates a name→value inputs map into id→value (runtime expects ids).
 */
export function remapInputsByName(
  engine: EngineState,
  named: Record<string, string>
): Record<string, string> {
  const nameToId = new Map<string, string>()
  for (const v of engine.variables ?? []) {
    if (!v.name) continue
    if (!nameToId.has(v.name)) nameToId.set(v.name, v.id)
  }

  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(named)) {
    const id = nameToId.get(name)
    if (id) out[id] = value
  }
  return out
}

/**
 * Projects an ExecuteResult into the public response shape keyed by step name.
 * Only `kind === "output"` steps are exposed.
 */
export function buildOutputContract(
  engine: EngineState,
  result: ExecuteResult
): OutputContract {
  const outputNameById = new Map<string, string>()
  for (const s of engine.steps) {
    if ((s.kind ?? 'output') === 'output') outputNameById.set(s.id, s.name)
  }

  const outputs: Record<string, string | null> = {}
  const errors: Record<string, string> = {}
  for (const stepResult of result.steps) {
    const name = outputNameById.get(stepResult.id)
    if (!name) continue
    if (stepResult.error) {
      outputs[name] = null
      errors[name] = stepResult.error
    } else {
      outputs[name] = stepResult.value
    }
  }

  return { outputs, errors }
}

// --- Orchestration (convenience for routes) ---

/**
 * Executes the engine with name-keyed inputs. Handles the name→id remap
 * internally so the route doesn't need to.
 */
export function executeCalc(
  engine: EngineState,
  namedInputs: Record<string, string>,
  debug = false
) {
  const idInputs = remapInputsByName(engine, namedInputs)
  return execute(engine, idInputs, { debug })
}
```

---

## Route Migration Example

### Before (inline Supabase)

```ts
// app/api/engines/[id]/route.ts
import { createSupabaseClient } from "@/lib/supabase/client"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createSupabaseClient()

  const { data, error } = await supabase
    .from("engines")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
```

### After (service layer)

```ts
// app/api/engines/[id]/route.ts
import { createSupabaseClient } from "@/lib/supabase/client"
import { updateEngine } from "@/services/engines"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = await createSupabaseClient()

  try {
    const engine = await updateEngine(db, id, body)
    return NextResponse.json(engine)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

### Calc route (dual auth + services/calc.ts)

```ts
// app/api/calc/[...segments]/route.ts
import { resolveAuth } from "@/lib/auth"
import { getEngineDefinition } from "@/services/engines"
import { buildInputSchema, executeCalc, buildOutputContract } from "@/services/calc"

export async function GET(req: NextRequest, { params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params
  if (segments.length !== 1) {
    return NextResponse.json({ error: "Invalid route" }, { status: 400 })
  }

  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 })

  const engine = await getEngineDefinition(auth.db, segments[0])
  if (!engine) return NextResponse.json({ error: "Engine not found" }, { status: 404 })

  return NextResponse.json(buildInputSchema(engine, { keyBy: "name" }))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params
  if (segments.length !== 1) {
    return NextResponse.json({ error: "Invalid route" }, { status: 400 })
  }

  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 })

  const engine = await getEngineDefinition(auth.db, segments[0])
  if (!engine) return NextResponse.json({ error: "Engine not found" }, { status: 404 })

  const { inputs = {}, debug = false } = await req.json()
  const result = executeCalc(engine, inputs, debug)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, validationErrors: result.validationErrors },
      { status: 422 }
    )
  }

  const { outputs, errors } = buildOutputContract(engine, result)
  const payload: Record<string, unknown> = { success: true, finalValue: result.finalValue, outputs }
  if (Object.keys(errors).length > 0) payload.errors = errors
  if (debug) payload.steps = result.steps
  return NextResponse.json(payload)
}
```

---

## Migration Plan

Incremental — migrate one route at a time, no big-bang refactor needed.

1. Create `services/engines.ts` with all engine operations
2. Migrate `app/api/engines/*` routes to use the service
3. Create `services/calc.ts` — move functions from `core/contract.ts` + add `executeCalc`
4. Migrate `app/api/calc/*` routes to use `services/engines` + `services/calc`
5. Migrate `app/api/schemas/*` routes to use `services/calc` (`buildInputSchema`)
6. Delete `core/contract.ts` (zero remaining consumers) + remove its section from `core/README.md`
7. Create `services/projects.ts` with all project operations
8. Migrate `app/api/projects/*` routes to use the service
9. Verify all routes still work (existing tests + manual)

> **Note:** `lib/api-keys.ts` already acts as a service layer with caching.
> It can stay as-is or be moved to `services/api-keys.ts` for consistency.
