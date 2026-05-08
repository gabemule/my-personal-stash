# API Communication Flow

> Visual overview of domain model, request lifecycle, auth strategies, and detailed endpoint flows.

## Summary

| Section | What it covers |
|---------|---------------|
| [§1 Domain Model](#1-domain-model) | Core entities and relationships (Project → Engine, API Key) |
| [§2 Request Lifecycle](#2-request-lifecycle) | How every HTTP request flows through proxy → routes → services → DB |
| [§3 Dual Auth Flow](#3-dual-auth-flow) | Session (cookie) vs Bearer (API key) authentication strategies |
| [§4 API Endpoints Summary](#4-api-endpoints-summary) | Quick-reference table of all endpoints — public and internal |
| [§5 Endpoint Flows](#5-endpoint-flows) | Sequence diagrams showing what each endpoint does step-by-step |
| [§6 Cache & Revalidation](#6-cache--revalidation) | Cache tags, invalidation strategy, and observability |

---

## 1. Domain Model

The core entities and their relationships. Understanding these first makes the rest of the doc easier to follow.

```mermaid
erDiagram
    PROJECT ||--o{ ENGINE : "has many"

    PROJECT {
        uuid id PK
        text name "sanitized, unique"
        bool is_active "one active at a time"
        timestamptz disabled_at "soft-delete"
        timestamptz created_at
    }

    ENGINE {
        uuid id PK
        uuid project_id FK "nullable (legacy)"
        text name "sanitized, unique per project"
        jsonb engine "full engine definition"
        bool is_active "one active per project"
        timestamptz disabled_at "soft-delete"
        timestamptz created_at
        timestamptz updated_at
    }

    API_KEY {
        uuid id PK
        text name "human-readable label"
        text key_hash "SHA-256, unique"
        timestamptz deleted_at "soft-revoke"
        timestamptz created_at
    }
```

## 2. Request Lifecycle

How every HTTP request flows through the system — from client to database and back.

```mermaid
flowchart TD
    Client["🌐 Client · Browser / M2M"]

    Client -->|"HTTP Request"| Proxy

    Proxy["proxy.ts — Auth Middleware<br/><small>Session check · Bearer bypass<br/>see §2 Dual Auth Flow</small>"]

    Proxy -->|"Authorized"| Routes

    subgraph Routes["Route Handlers — app/api/"]
        direction LR
        R_AUTH["Auth<br/><small>POST /login · /logout</small>"]
        R_PROJ["Projects<br/><small>CRUD + activate</small>"]
        R_ENG["Engines<br/><small>CRUD + activate</small>"]
        R_CALC["Calc<br/><small>POST · GET :engineId</small>"]
        R_KEY["API Keys<br/><small>GET · POST · DELETE</small>"]
        R_SCH["Schema<br/><small>GET /api/schema(s)</small>"]
    end

    R_AUTH & R_PROJ & R_ENG & R_CALC & R_KEY & R_SCH --> Services
    

    subgraph Services["Services Layer"]
        direction LR
        S_AUTH["auth.ts<br/><small>requireUser<br/>resolveAuth</small>"]
        S_PROJ["projects.ts<br/><small>list · create · update<br/>delete · activate</small>"]
        S_ENG["engines.ts<br/><small>list · create · update<br/>delete · activate</small>"]
        S_CALC["calc.ts<br/><small>buildInputSchema<br/>executeCalc</small>"]
        S_KEY["api-keys.ts<br/><small>list · create · revoke<br/>validateApiKey</small>"]
    end

    S_PROJ & S_ENG & S_AUTH --> DB_SSR
    S_KEY --> DB_SVC
    S_CALC -->|"cookie auth"| DB_SSR
    S_CALC -->|"bearer auth"| DB_SVC

    subgraph DB["Supabase · PostgreSQL"]
        direction LR
        DB_SSR["SSR Client<br/><small>client.ts — anon key + cookies<br/>Respects RLS</small>"]
        DB_SVC["Service Client<br/><small>server.ts — service-role key<br/>Bypasses RLS</small>"]
    end

    style Client fill:#1a1a2e,stroke:#e0e0e0,color:#fff
    style Proxy fill:#2d2d3d,stroke:#7c7cff,color:#fff
    style Routes fill:#1e3a2f,stroke:#4ade80,color:#fff
    style Services fill:#3b2f1e,stroke:#facc15,color:#fff
    style DB fill:#1e2d3a,stroke:#60a5fa,color:#fff
```

## 3. Dual Auth Flow

Two authentication strategies coexist — session-based for browsers, Bearer token for machine-to-machine.

```mermaid
flowchart TD
    REQ["Incoming Request"]
    REQ --> CHECK{"Auth method?"}

    CHECK -->|"Cookie present"| SESSION
    CHECK -->|"Authorization: Bearer ..."| BEARER

    subgraph SESSION["Session Auth · Browser"]
        direction TB
        SA1["proxy.ts calls getUser()"]
        SA2["Supabase refreshes cookies"]
        SA3["Route calls requireUser()"]
        SA4["✅ Returns user_id"]
        SA1 --> SA2 --> SA3 --> SA4
    end

    subgraph BEARER["Bearer Auth · M2M"]
        direction TB
        BA1["proxy.ts detects Bearer<br/>on /api/calc/*"]
        BA2["Skips getUser()<br/><small>~800ms saved</small>"]
        BA3["Route calls resolveAuth(req)"]
        BA4["SHA-256 hash of raw token"]
        BA5["Lookup in api_keys<br/><small>via service-role client</small>"]
        BA6["✅ Returns user_id<br/>from key owner"]
        BA1 --> BA2 --> BA3 --> BA4 --> BA5 --> BA6
    end

    style SESSION fill:#1e3a2f,stroke:#4ade80,color:#fff
    style BEARER fill:#3b1e3a,stroke:#c084fc,color:#fff
```

## 4. API Endpoints Summary

Endpoints are split into two surfaces based on intended consumer:

### 4.1 Public API — External Service Contract

Stable endpoints consumed by third-party integrations via API key (Bearer token). These form the external service contract — breaking changes require versioning.

| Resource | Method | Path | Auth | Service | Revalidates |
|----------|--------|------|------|---------|-------------|
| **Calc** | POST | `/api/calc/:engineId` | Session / Bearer | `calc.calculate` | — |
| | GET | `/api/calc/:engineId` | Session / Bearer | `calc.getCalcSchema` | — |

### 4.2 Internal API — Frontend Only

Used exclusively by the Next.js frontend. Contract may change without notice. Not intended for external consumption — unauthenticated requests without a session cookie receive a redirect to `/login` (not a `401`).

| Resource | Method | Path | Auth | Service | Revalidates |
|----------|--------|------|------|---------|-------------|
| **Auth** | POST | `/api/auth/login` | Public | Supabase Auth | — |
| | POST | `/api/auth/logout` | Session | Supabase Auth | — |
| **Projects** | GET | `/api/projects` | Session | `projects.listProjects` | — |
| | POST | `/api/projects` | Session | `projects.createProject` | — |
| | PATCH | `/api/projects/:id` | Session | `projects.updateProject` | `TODO: projects` |
| | DELETE | `/api/projects/:id` | Session | `projects.deleteProject` | `TODO: projects, engines` |
| | POST | `/api/projects/:id/activate` | Session | `projects.activateProject` | `TODO: projects` |
| | GET | `/api/projects/active` | Session | `projects.getActiveProject` | — |
| | GET | `/api/projects/:id/engines` | Session | `engines.listEngines` | — |
| | POST | `/api/projects/:id/engines` | Session | `engines.createEngine` | — |
| | GET | `/api/projects/:id/engines/active` | Session | `engines.getActiveEngine` | — |
| **Engines** | GET | `/api/engines` | Session | `engines.listEngines` | — |
| | POST | `/api/engines` | Session | `engines.createEngine` | — |
| | PATCH | `/api/engines/:id` | Session | `engines.updateEngine` | `TODO: engines` |
| | DELETE | `/api/engines/:id` | Session | `engines.deleteEngine` | `TODO: engines` |
| | POST | `/api/engines/:id/activate` | Session | `engines.activateEngine` | `TODO: engines` |
| | GET | `/api/engines/active` | Session | `engines.getActiveEngine` | — |
| **API Keys** | GET | `/api/api-keys` | Session | `apiKeys.listApiKeys` | — |
| | POST | `/api/api-keys` | Session | `apiKeys.createApiKey` | — |
| | DELETE | `/api/api-keys/:id` | Session | `apiKeys.revokeApiKey` | `api-keys` ✅ |
| **Schema** | GET | `/api/schema` | Session | Static registry | — |
| | GET | `/api/schemas/:resource/:action` | Session | Static registry | — |

## 5. Endpoint Flows

Sequence diagrams for the non-trivial flows. Simple CRUD endpoints (list, get active, etc.) follow the standard pattern shown in §5.3 — see §4 for the full endpoint reference.

> **Color legend:** 🔵 GET · 🟢 POST · 🟡 PATCH · 🔴 DELETE · 🟣 POST activate

### 5.1 Calc

The most complex flow — dual auth resolution, engine lookup, dynamic schema validation, and arithmetic execution via Decimal.js runtime.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Route
    participant Auth as auth.ts
    participant S as calc.ts
    participant Cache as Server Cache
    participant DB as Supabase
    participant RT as Runtime

    rect rgba(74, 222, 128, 0.15)
        Note over C,RT: POST /api/calc/:engineId — execute calculation
        C->>R: POST { inputs } + Cookie or Bearer
        R->>Auth: resolveAuth(req)
        alt Bearer token
            Auth->>Auth: SHA-256 hash of raw token
            Auth->>Cache: validateApiKey(hash)
            alt Cache hit (tag: api-keys · TTL: 1h)
                Cache-->>Auth: cached api_key row
            else Cache miss
                Cache->>DB: SELECT FROM api_keys<br/>WHERE key_hash · via service client
                DB-->>Cache: api_key row
                Cache-->>Auth: api_key row
            end
            Auth-->>R: { supabase: serviceClient, apiKeyId }
        else Session cookie
            Auth-->>R: { supabase: ssrClient }
        end
        R->>S: executeCalc(engineId, body, auth)
        S->>DB: SELECT engine WHERE id = engineId
        DB-->>S: engine definition (JSONB)
        S->>S: buildInputSchema(engine)
        S->>S: Validate body.inputs against Zod schema
        alt Invalid inputs
            S-->>R: throw validation error
            R-->>C: 400 { error: field details }
        else Valid
            S->>RT: execute(engine, validatedInputs)
            RT->>RT: Run calc rules with Decimal.js
            RT-->>S: { inputs, outputs }
            S-->>R: results
            R-->>C: 200 { data: { inputs, outputs } }
        end
    end

    rect rgba(96, 165, 250, 0.15)
        Note over C,RT: GET /api/calc/:engineId — get input schema
        C->>R: GET + Cookie or Bearer
        R->>Auth: resolveAuth(req)
        Auth-->>R: auth context (same flow as above)
        R->>S: getCalcSchema(engineId, auth)
        S->>DB: SELECT engine WHERE id = engineId
        DB-->>S: engine definition
        S->>S: buildInputSchema(engine) → JSON Schema
        S-->>R: schema
        R-->>C: 200 { data: jsonSchema }
    end
```

### 5.2 API Keys

Key generation uses crypto-random tokens with SHA-256 hashing — the raw key is returned once and never stored. Revocation invalidates the server cache immediately.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Route
    participant S as api-keys.ts
    participant DB as Supabase

    rect rgba(74, 222, 128, 0.15)
        Note over C,DB: POST /api/api-keys — create
        C->>R: POST { name } (session cookie)
        R->>R: requireUser() → user_id
        R->>R: Validate name present
        R->>S: createApiKey(userId, name)
        S->>S: crypto.randomBytes → raw token
        S->>S: SHA-256(raw token) → key_hash
        S->>DB: INSERT { name, key_hash, user_id }
        DB-->>S: api_key row
        S-->>R: { ...apiKey, raw_key }
        R-->>C: 201 { data: { id, name, raw_key } }
        Note right of C: raw_key shown once — never stored
    end

    rect rgba(248, 113, 113, 0.15)
        Note over C,DB: DELETE /api/api-keys/:id — revoke
        C->>R: DELETE /api-keys/:id (session cookie)
        R->>R: requireUser() → user_id
        R->>S: revokeApiKey(id)
        S->>DB: UPDATE SET deleted_at = now()
        DB-->>S: ok
        S-->>R: void
        R->>R: revalidateTag("api-keys") ✅
        R-->>C: 200 { ok: true }
    end
```

### 5.3 CRUD Pattern

All Projects and Engines endpoints follow this pattern. The create flow below applies to both `POST /api/projects` and `POST /api/engines` — update (PATCH) is identical but with `UPDATE` instead of `INSERT`.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as Route
    participant S as Service
    participant DB as Supabase

    rect rgba(74, 222, 128, 0.15)
        Note over C,DB: POST — create (Projects / Engines)
        C->>R: POST { name, ... }
        R->>R: Validate required fields
        R->>S: create(name, ...)
        S->>S: sanitizeName(name)
        S->>DB: SELECT WHERE name = sanitized (dup check)
        alt Name conflict
            S-->>R: throw ConflictError
            R-->>C: 409 { error }
        else No conflict
            S->>DB: INSERT new row
            DB-->>S: created row
            S-->>R: entity
            R-->>C: 201 { data: entity }
        end
    end

    rect rgba(248, 113, 113, 0.15)
        Note over C,DB: DELETE — soft-delete (Projects / Engines)
        C->>R: DELETE /:id
        R->>S: delete(id)
        S->>DB: UPDATE SET disabled_at = now()
        Note right of DB: Projects also cascade:<br/>engines.disabled_at + is_active=false
        S-->>R: void
        R-->>C: 200 { ok: true }
    end

    rect rgba(192, 132, 252, 0.15)
        Note over C,DB: POST — activate (Projects / Engines)
        C->>R: POST /:id/activate
        R->>S: activate(id)
        S->>DB: UPDATE siblings SET is_active = false
        S->>DB: UPDATE target SET is_active = true
        DB-->>S: activated entity
        S-->>R: entity
        R-->>C: 200 { data: entity }
    end
```

> **GET endpoints** (list, active) are straightforward: `Route → Service → SELECT → return`. See §4 for the full list.

## 6. Cache & Revalidation

Server-side caching uses the Next.js **Data Cache** with named **tags**. A cached function stores its result on first call; subsequent calls return the cached value until the TTL expires or `revalidateTag("tag")` is called to bust it on-demand. Mutation routes call `revalidateTag()` immediately after writes to keep the cache fresh.

The "Revalidates" column in §4 references tags defined here.

### Current cache tags

| Tag | What is cached | Invalidated by | TTL |
|-----|---------------|----------------|-----|
| `api-keys` | `validateApiKey` — lookup by SHA-256 hash | `DELETE /api/api-keys/:id` | 1 hour |

### Planned cache tags (TODO)

| Tag | Should cache | Should be invalidated by | TTL |
|-----|-------------|--------------------------|-----|
| `projects` | `listProjects`, `getActiveProject` | `PATCH /api/projects/:id`, `DELETE /api/projects/:id`, `POST /api/projects/:id/activate` | TBD |
| `engines` | `listEngines`, `getActiveEngine` | `PATCH /api/engines/:id`, `DELETE /api/engines/:id`, `POST /api/engines/:id/activate` | TBD |
| `engine:${engineId}` | `getEngineDefinition` (published only) | Never — published engines are immutable | ∞ (`revalidate: false`) |

> **Note:** `DELETE /api/projects/:id` should also invalidate `engines` because it orphans all engines in that project (`project_id = null`, `is_active = false`).
>
> **Note:** The `engine:${engineId}` tag uses per-engine granularity. Published engines are write-once/read-forever, so the cache never needs invalidation. Draft engines bypass cache entirely (direct DB query). The tag exists for emergency surgical invalidation if ever needed.

### Observability

All cached lookups log their source via Pino for production monitoring:

```
logger.info({ engineId, source: "cache" }, "engines.getDefinition")  // published, cache hit
logger.info({ engineId, source: "db" },    "engines.getDefinition")  // draft or cache miss
```

This allows measuring cache hit rate and verifying cache behavior in New Relic / log aggregation.
