# AUTHZ Fase 2 — API Keys (tenant-scoped)

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md) · depende de [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md)

## Context

Consumidores externos (`/api/calc/*`) precisam de auth estática via `Authorization: Bearer`. Com o modelo multi-tenant já em pé (Fase 1), a chave deve pertencer ao **tenant**, não ao user.

**Razões para tenant-scoped:**
1. Integração server-to-server representa o tenant, não uma pessoa.
2. Se o EDITOR que criou a key sair do tenant, a key continua funcionando.
3. EDITOR+ pode criar/revogar; o dono lógico da key é o tenant.

## Esforço: pequeno (~2-3h)

## Decisões-chave

- `api_keys.tenant_id` (FK), `created_by` (FK pra user, puramente auditivo).
- **API key tem role próprio (`'reader' | 'editor'`).** Default `'reader'` (menor privilégio).
  - `reader` → consumir **apenas** `POST /api/calc/*` (executar cálculo).
  - `editor` → `/api/calc/*` + CRUD em `/api/engines*` e `/api/projects*`.
  - **Qualquer** rota de gestão (`/api/tenants/*`, members, invites, api-keys, transfer-ownership, billing-owner) → `COOKIE_REQUIRED` independente do role da key. Bearer **nunca** auto-administra.
  - `manager`/`owner` não existem em key — sem sentido (key não convida, não mexe em billing).
- `validateApiKey(raw)` retorna `{ tenantId, keyId, role } | null`.
- `requireAuth` (Fase 1) passa a aceitar Bearer — usa service-role client quando via Bearer, e propaga o `role` no retorno pra `requireTenantRole` comparar contra o `minRole`.
- Criação/revogação: EDITOR+ do tenant (humano, via cookie).
- Listagem: EDITOR+ (READER não precisa ver keys).
- `raw` mostrado **uma única vez** no response do POST.


## Arquivos alterados

| Arquivo | Ação | Descrição |
|---|---|---|
| `db/api_keys.sql` | Criar | Tabela `api_keys` tenant-scoped + RLS |
| `lib/api-keys.ts` | Criar | `hashKey`, `generateRawKey`, `validateApiKey` |
| `lib/auth.ts` | Atualizar | Aceitar Bearer; retornar `{ tenantId }` opcional |
| `app/api/tenants/[id]/api-keys/route.ts` | Criar | GET lista, POST cria |
| `app/api/tenants/[id]/api-keys/[keyId]/route.ts` | Criar | DELETE revoga (soft) |
| `app/api/calc/[...segments]/route.ts` | Atualizar | Usar Bearer via `requireAuth` |
| `proxy.ts` | Atualizar | Pular `supabase.auth.getUser()` quando rota API aceita Bearer |
| `bruno/environments/local.bru` | Atualizar | `apiKey` em `vars:secret` |
| `bruno/environments/staging.bru` | Atualizar | Idem |
| `bruno/calc/calculate.bru` | Atualizar | Header `Authorization: Bearer {{apiKey}}` |

## 1. SQL — `db/api_keys.sql`

```sql
-- =========================================================================
-- AUTHZ Fase 2 — API keys tenant-scoped
-- =========================================================================

create table api_keys (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,                         -- ex: "app-produto-xyz"
  key_hash      text not null unique,                  -- SHA-256 hex do raw
  role          text not null default 'reader'         -- 'reader' | 'editor'
                check (role in ('reader','editor')),
  created_by    uuid references auth.users(id),        -- auditoria (opcional)
  last_used_at  timestamptz,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz                            -- soft-delete
);

create index api_keys_tenant_idx on api_keys(tenant_id) where deleted_at is null;

alter table api_keys enable row level security;

-- EDITOR+ do tenant vê/cria/revoga keys daquele tenant
create policy "editors manage api_keys" on api_keys
  for all to authenticated
  using (is_super_admin() or has_tenant_role(tenant_id, 'editor'))
  with check (is_super_admin() or has_tenant_role(tenant_id, 'editor'));
```

## 2. Helper — `lib/api-keys.ts`

```ts
import { createHash, randomBytes } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

/** Gera uma chave raw (base64url, 32 bytes = 256 bits de entropia). */
export function generateRawKey(): string {
  return randomBytes(32).toString("base64url")
}

/** Hash SHA-256 (hex) do raw. */
export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export type ApiKeyRole = "reader" | "editor"

/**
 * Valida a chave raw. Retorna tenantId + keyId + role se válida e ativa, senão null.
 * Usa service-role (não há sessão no ato da validação).
 */
export async function validateApiKey(
  raw: string,
): Promise<{ tenantId: string; keyId: string; role: ApiKeyRole } | null> {
  if (!raw) return null

  const hash = hashKey(raw)
  const admin = createAdminClient()

  // Filtra tenant soft-deleted via join — garante cascata: tenant apagado
  // invalida todas as keys daquele tenant, mesmo com key.deleted_at NULL.
  const { data, error } = await admin
    .from("api_keys")
    .select("id, tenant_id, role, tenants!inner(deleted_at)")
    .eq("key_hash", hash)
    .is("deleted_at", null)
    .is("tenants.deleted_at", null)
    .maybeSingle()

  if (error || !data) return null

  // fire-and-forget: atualiza last_used_at
  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)

  return {
    tenantId: data.tenant_id as string,
    keyId: data.id as string,
    role: data.role as ApiKeyRole,
  }
}
```

## 3. Helper — atualizar `lib/auth.ts`

Estender o retorno da Fase 1 para aceitar Bearer:

```ts
import type { NextRequest } from "next/server"
import { createSupabaseClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { validateApiKey } from "@/lib/api-keys"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { ApiKeyRole } from "@/lib/api-keys"

export type AuthSuccess =
  | { ok: true; via: "cookie"; userId: string; supabase: SupabaseClient; tenantId?: undefined; bearerRole?: undefined }
  | { ok: true; via: "bearer"; tenantId: string; keyId: string; bearerRole: ApiKeyRole; supabase: SupabaseClient; userId?: undefined }
export type AuthFailure = { ok: false; status: 401; error: string }

export async function requireAuth(
  request: NextRequest,
): Promise<AuthSuccess | AuthFailure> {
  const authHeader = request.headers.get("authorization")

  // 1) Bearer (API key)
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const raw = authHeader.slice(7).trim()
    const result = await validateApiKey(raw)
    if (!result) return { ok: false, status: 401, error: "INVALID_API_KEY" }
    return {
      ok: true,
      via: "bearer",
      tenantId: result.tenantId,
      keyId: result.keyId,
      bearerRole: result.role,
      supabase: createAdminClient(),
    }
  }

  // 2) Cookie (sessão)
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: "UNAUTHENTICATED" }
  return { ok: true, via: "cookie", userId: user.id, supabase }
}
```

> **Importante:** quando `via === "bearer"`, o `supabase` é service-role e **ignora RLS**. Cabe à rota validar manualmente que o dado consultado pertence ao `tenantId` autenticado.

## 4. Routes — `app/api/tenants/[id]/api-keys/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { requireTenantRole } from "@/lib/tenant"
import { generateRawKey, hashKey } from "@/lib/api-keys"

// GET — lista keys do tenant (nunca retorna key_hash)
export async function GET(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.via === "bearer" && auth.tenantId !== params.id) {
    return NextResponse.json({ error: "TENANT_MISMATCH" }, { status: 403 })
  }
  const role = await requireTenantRole(auth.supabase, params.id, "editor")
  if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status })

  const { data, error } = await auth.supabase
    .from("api_keys")
    .select("id, name, last_used_at, created_at, created_by")
    .eq("tenant_id", params.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data })
}

// POST — cria nova key; retorna raw UMA vez
export async function POST(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.via === "bearer") {
    return NextResponse.json({ error: "COOKIE_REQUIRED" }, { status: 403 })
  }
  const role = await requireTenantRole(auth.supabase, params.id, "editor")
  if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status })

  const { name, role: keyRole = "reader" } = await request.json() as {
    name: string; role?: "reader" | "editor"
  }
  if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 })
  if (keyRole !== "reader" && keyRole !== "editor") {
    return NextResponse.json({ error: "INVALID_KEY_ROLE" }, { status: 400 })
  }

  const raw = generateRawKey()
  const key_hash = hashKey(raw)

  const { data, error } = await auth.supabase
    .from("api_keys")
    .insert({
      tenant_id: params.id,
      name,
      key_hash,
      role: keyRole,
      created_by: auth.userId,
    })
    .select("id, name, role, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // raw só aparece nesta response. Nunca mais.
  return NextResponse.json({ ...data, raw })
}
```

## 5. Routes — `app/api/tenants/[id]/api-keys/[keyId]/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { requireTenantRole } from "@/lib/tenant"

export async function DELETE(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.via === "bearer") {
    return NextResponse.json({ error: "COOKIE_REQUIRED" }, { status: 403 })
  }
  const role = await requireTenantRole(auth.supabase, params.id, "editor")
  if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status })

  const { error } = await auth.supabase
    .from("api_keys")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.keyId)
    .eq("tenant_id", params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

> **Por que bloquear Bearer em POST/DELETE?** Gerenciamento de keys é ação sensível — só via cookie (presença humana). Bearer serve pra consumir APIs de negócio (`/api/calc/*`), não pra auto-administrar.

## 6. Uso em `/api/calc/[...segments]/route.ts`

Rota de consumo. Aceita cookie ou Bearer. Qualquer role (`reader`/`editor` em
key; `reader+` em membership) pode chamar — calc é o caso de uso mínimo de
Bearer.

```ts
import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { requireTenantRole } from "@/lib/tenant"

export async function POST(request: NextRequest, { params }: { params: { segments: string[] } }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [engineId] = params.segments

  // Via Bearer (service-role, ignora RLS): filtrar manualmente pelo tenantId
  // autenticado pra impedir que key do tenant A leia engine do tenant B.
  // Via cookie: RLS cuida disso (user só vê engines dos tenants onde é membro).
  const engineQuery = auth.supabase
    .from("engines")
    .select("id, project_id, config, projects!inner(tenant_id)")
    .eq("id", engineId)
    .is("deleted_at", null)

  const finalQuery = auth.via === "bearer"
    ? engineQuery.eq("projects.tenant_id", auth.tenantId)
    : engineQuery

  const { data: engine, error } = await finalQuery.maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!engine) return NextResponse.json({ error: "ENGINE_NOT_FOUND" }, { status: 404 })

  // Via cookie: checar que o user tem reader+ no tenant do engine.
  // (Via Bearer a validação já foi feita pelo filtro acima + role da key.)
  if (auth.via === "cookie") {
    const engineTenantId = (engine as any).projects.tenant_id as string
    const role = await requireTenantRole(auth.supabase, engineTenantId, "reader")
    if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status })
  }

  // ... resto da lógica de cálculo.
}
```

> **Rotas CRUD de engines/projects (`editor+`).** Via Bearer só passa se
> `auth.bearerRole === "editor"`. Padrão sugerido no começo do handler:
> ```ts
> if (auth.via === "bearer" && auth.bearerRole !== "editor") {
>   return NextResponse.json({ error: "INSUFFICIENT_API_KEY_ROLE" }, { status: 403 })
> }
> ```
> Rotas de gestão (members, invites, api-keys, transfer/billing) sempre
> respondem `COOKIE_REQUIRED` quando `auth.via === "bearer"`, independente do role.

## 6.1 Bypass do middleware (`proxy.ts`) para requests com Bearer

**Problema de latência.** O `proxy.ts` atual chama `supabase.auth.getUser()` em **toda** request (padrão Supabase SSR). Isso faz um round-trip HTTP pro Supabase auth — observado em dev: ~800ms por request em `/api/calc/*`. Mesmo com `requireAuth` aceitando Bearer no handler, o middleware já gastou esse tempo antes.

**Solução.** Quando a request chega com `Authorization: Bearer ...` numa rota API que aceita Bearer, pular o `getUser()` no middleware e deixar o handler validar a key direto via `validateApiKey`.

**Patch em `proxy.ts`:**

```ts
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authHeader = request.headers.get("authorization")
  const hasBearer = authHeader?.toLowerCase().startsWith("bearer ")

  // Rotas API que aceitam Bearer delegam validação pro handler.
  // Pula o getUser() do Supabase aqui pra economizar ~800ms de round-trip.
  const isBearerRoute =
    pathname.startsWith("/api/calc/") ||
    pathname.startsWith("/api/engines") ||
    pathname.startsWith("/api/projects")
  if (hasBearer && isBearerRoute) {
    return NextResponse.next({ request })
  }

  // ... resto do fluxo atual (getUser + redirects de login)
}
```

**Critérios:**
- Lista `isBearerRoute` deve refletir as rotas onde `requireAuth` aceita Bearer (item 6 acima + CRUDs de engines/projects que aceitam key `editor`).
- Rotas de gestão (`/api/tenants/*/members`, `/api/tenants/*/api-keys`, `/api/tenants/*/invites`) **não** entram nessa lista — elas exigem cookie, e o middleware ainda faz sentido validar sessão antes.
- Request com Bearer numa rota **não** da lista: middleware segue o fluxo normal (ignora o header, valida cookie). Se não tiver cookie → redirect pra `/login` como hoje.
- Se `validateApiKey` falhar no handler, o 401 `INVALID_API_KEY` vem do handler, não do middleware.

**Trade-off assumido.** Essa rota agora tem **zero** validação de auth no middleware — cabe ao handler garantir via `requireAuth`. Isso é aceitável porque `requireAuth` já é obrigatório em toda rota `/api/*` sensível; o middleware funcionava como rede de segurança redundante. O ganho de latência compensa.

**Verificação:**
- `curl -X POST /api/calc/<id> -H "Authorization: Bearer <raw>"` em dev mostra tempo total próximo do `render` (sem o `proxy.ts: ~800ms`).
- `curl -X POST /api/calc/<id>` sem header: middleware redireciona pra `/login` como antes.
- `curl -X POST /api/tenants/<id>/api-keys -H "Authorization: Bearer <raw>"` ainda passa pelo middleware (não está na lista), então `requireAuth` no handler recebe o Bearer e devolve `COOKIE_REQUIRED` — fluxo idêntico, sem mudança de semântica.

## 7. Bruno

`bruno/environments/local.bru` e `staging.bru`:
```
vars:secret [
  email,
  password,
  apiKey
]
```

`bruno/calc/calculate.bru`:
```
headers {
  Content-Type: application/json
  Authorization: Bearer {{apiKey}}
}
```

Preencher `apiKey` nas variáveis secretas do ambiente com o raw gerado via UI (Fase 3).

## Verificação

1. **SQL:** rodar `db/api_keys.sql`
2. **Env:** confirmar `SUPABASE_SERVICE_ROLE_KEY` já setada (foi adicionada na Fase 1)
3. **Criar key (manual temporário, Fase 3 traz UI):**
   ```sql
   -- no SQL Editor:
   -- 1. gerar raw + hash localmente (openssl rand -base64 32 | tr -d '=' | tr '/+' '_-')
   -- 2. insert into api_keys (tenant_id, name, key_hash, created_by) values (...)
   ```
4. `curl -X POST http://localhost:3000/api/calc/<engineId> -H "Authorization: Bearer <raw>"` → 200
5. Key errada → 401 `INVALID_API_KEY`
6. Sem header e sem cookie → 401 `UNAUTHENTICATED`
7. Key do tenant A → tentar ler engine do tenant B → deve falhar (filtro manual por `tenantId`)
8. `DELETE /api/tenants/<id>/api-keys/<keyId>` como EDITOR+ → 200; próxima chamada com aquela key → 401
9. `POST /api/tenants/<id>/api-keys` via Bearer → 403 `COOKIE_REQUIRED`
10. Soft-delete do tenant (`tenants.deleted_at` populado) → chamadas com Bearer de key daquele tenant retornam 401 `INVALID_API_KEY`

## Observações

- **Nunca logar `raw`.** Só aparece na response do POST.
- **Service-role** é secret absoluto. Só em `process.env` server-side.
- **Filtro manual via Bearer:** service-role ignora RLS; responsabilidade de filtrar `tenant_id` é do caller. Considerar um wrapper tipo `scopedQuery(supabase, tenantId)` se virar padrão repetido.
- **Rate limit:** fora do escopo; adicionar se houver abuso (Supabase Edge Rate Limiting ou middleware custom).
- **Rotação:** não há endpoint rotate — fluxo é revogar + criar nova.
- **Keys não fazem auth de user** — uma key via Bearer não "é" um user. Chamadas Bearer não conseguem acessar endpoints que precisam do user identity (ex: convites, members).
- **`last_used_at` fire-and-forget:** `validateApiKey` atualiza `last_used_at` sem `await`. Em alta concorrência pode perder writes — aceitável porque o campo é aproximativo (só UI "última vez usada"). Se virar relevante pra auditoria/compliance, migrar pra job batch ou pra `audit_log` (ver `AUTHZ_AUDIT_LOG.md`).
