# AUTHZ Fase 3 — UI de gestão (tenant selector, members, settings)

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md) · depende de [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md)

## Context

Com o modelo multi-tenant + RBAC em pé (Fase 1), precisamos de UI para:

1. **Trocar de tenant** — user pode ser membro de múltiplos tenants.
2. **Ver/gerenciar membros** — manager+ promove/rebaixa/remove.
3. **Transferir ownership** — owner passa adiante.
4. **Ver/editar dados do tenant** (nome, etc).
5. **Restrições visuais** — USER não vê botões de CRUD; EDITOR não vê gestão de membros; etc.

Sem essa UI, tudo da Fase 1 precisa ser gerenciado via SQL Editor.

## Esforço: médio (~4h)

## Decisões-chave

- **Selector de tenant** no header (todas as páginas autenticadas).
- **Tenant atual** guardado em contexto/store; sincronizado com URL (`/tenants/:id/...`).
- **Listas e botões** escondidos por role no client **e** validados no server — defesa em profundidade.
- **Super admin em tenant onde não é membro:** tem poder equivalente ao primary owner (`is_super_admin()` bypassa RLS e os gates de rota também checam super admin). Visualmente, vê todos os tenants no selector com badge "admin" naqueles em que não é membro real — ver `§2` (GET /api/tenants).
- **Role hierarchy matrix** (resumo — usado tanto no client quanto no server). "OWNER 2°" = OWNER secundário (row `role='owner'` em `tenant_members` que não é `owner_id` nem `billing_id`).

| Ação ↓ / Caller → | READER | EDITOR | MANAGER | OWNER 2° | PRIMARY OWNER (`owner_id`) | SUPER ADMIN |
|---|---|---|---|---|---|---|
| Ler projects/engines | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar/editar projects/engines | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Convidar READER / EDITOR / MANAGER | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Convidar / promover OWNER** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Promover READER→EDITOR / ↑MANAGER | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Rebaixar EDITOR → READER | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Rebaixar / remover MANAGER | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Rebaixar / remover OWNER 2° | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Rebaixar / remover PRIMARY OWNER | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (com `newPrimaryOwnerId`) |
| Rebaixar / remover BILLING OWNER (se ≠ primary) | ❌ | ❌ | ❌ | ❌ | ❌ (trocar billing antes) | ✅ (com `newBillingId`) |
| **Transferir primary ownership (`owner_id`)** | ❌ | ❌ | ❌ | ❌ | ✅ (o próprio) | ✅ |
| **Trocar billing owner (`billing_id`)** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Soft-delete tenant | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

- **Invariantes protegidas pelo server** (não via RLS, via código nas routes):
  - `CANNOT_MODIFY_PRIMARY_OWNER` — não dá pra rebaixar/remover o user que é `tenants.owner_id`. Transferir primary ownership antes.
  - `CANNOT_MODIFY_BILLING_OWNER` — não dá pra rebaixar/remover o user que é `tenants.billing_id`. Trocar `billing_id` antes.
  - Super admin forçando pode passar `newPrimaryOwnerId` / `newBillingId` na mesma operação — a escolha precisa ser explícita (sem eleição automática).

## Arquivos alterados

| Arquivo | Ação | Descrição |
|---|---|---|
| `app/(authed)/layout.tsx` | Criar | Server component — chama `getSessionContext()` (Fase 1 §12), aplica redirects (user sem tenant → `/no-tenant`; super admin sem tenant → `/admin/tenants/new`) e renderiza header shared com `TenantSelector` + `menu` |
| `app/(authed)/tenants/[id]/layout.tsx` | Criar | Server component — valida que o user é membro do tenant do path (ou super admin); se não, renderiza tela genérica "sem acesso" (§0.1) |
| `stores/tenantStore.ts` | Criar | **Thin store único** — `user` + `tenants` + `currentTenantId` + `role` + `isSuperAdmin` + `menu` (hidratado do `SessionContext` do server pelo `SessionHydrator`). Substitui qualquer `sessionStore` separado. `selectTenant` chama `POST /api/session/current-tenant` → `router.refresh()` → limpa `useWorkspaceStore`. |
| `app/api/tenants/route.ts` | Criar/atualizar | GET lista meus tenants (super admin: todos, com `isSuperAdminView`) · POST cria (super admin only) |
| `app/api/tenants/[id]/route.ts` | Criar | GET info, PATCH nome (owner+), DELETE soft-delete (owner) |
| `app/api/session/current-tenant/route.ts` | Criar | POST `{ tenantId }` → seta cookie HTTP-only `next-calc-current-tenant` (valida que o user é membro do tenant, exceto super admin) |
| `app/no-tenant/page.tsx` | Criar | Tela "sem workspace" para users sem membership |
| `app/admin/tenants/new/page.tsx` | Criar | Formulário de criação de tenant (super admin only) |
| `app/api/tenants/[id]/members/route.ts` | Criar | GET lista, PATCH role |
| `app/api/tenants/[id]/members/[userId]/route.ts` | Criar | DELETE remove |
| `app/api/tenants/[id]/transfer-ownership/route.ts` | Criar | POST transfere primary ownership (`owner_id`) |
| `app/api/tenants/[id]/billing-owner/route.ts` | Criar | POST troca billing owner (`billing_id`) |
| `components/TenantSelector/index.tsx` | Criar | Dropdown no header — consome `useTenantStore`; troca dispara `selectTenant` (cookie + refresh + workspace cleanup) |
| `components/PermissionGate/index.tsx` | Criar | Wrapper que esconde children quando o role do user é insuficiente. Uso: `<PermissionGate minRole="editor">` ou `<PermissionGate menuId="settings/api-keys">` (usa menu filtrado) |
| `app/(authed)/tenants/[id]/settings/page.tsx` | Criar | Página "Configurações" (edit nome) |
| `app/(authed)/tenants/[id]/settings/members/page.tsx` | Criar | Lista membros + actions |
| `app/(authed)/tenants/[id]/settings/api-keys/page.tsx` | Criar | (vindo da Fase 2) Listar/gerar/revogar keys |

## 0. Layout autenticado — `app/(authed)/layout.tsx`

Server component que é a **fonte da verdade** do shell autenticado. Chama
`getSessionContext()` (Fase 1 §12), decide redirects e injeta os dados nos
stores client-side via um `<SessionHydrator>`.

```tsx
// app/(authed)/layout.tsx
import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/session"
import { SessionHydrator } from "./SessionHydrator"   // client
import { AuthedHeader } from "./AuthedHeader"         // client (usa TenantSelector + menu)

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext()

  if (!session) redirect("/login")

  // Super admin sem nenhum tenant no sistema → wizard de criação.
  if (session.tenants.length === 0) {
    redirect(session.isSuperAdmin ? "/admin/tenants/new" : "/no-tenant")
  }

  return (
    <>
      <SessionHydrator session={session} />
      <AuthedHeader menu={session.menu} />
      {children}
    </>
  )
}
```

Todas as páginas autenticadas (`/projects`, `/engines`, `/calc`, `/builder`,
`/tenants/[id]/settings/*`, `/admin/tenants/new`) ficam dentro do route group
`(authed)`. `/login`, `/no-tenant` e a landing de convite (`/invites/[token]`)
ficam fora.

## 0.1 Layout por tenant — `app/(authed)/tenants/[id]/layout.tsx`

O selector troca tenant via cookie, mas um user pode colar/bookmarkar uma URL
do tipo `/tenants/<id>/settings/members` apontando para um tenant do qual
**não é membro** (ou que foi soft-deleted). Esse layout é a última linha de
defesa de UX: server component que valida a membership antes de renderizar
qualquer página do path.

```tsx
// app/(authed)/tenants/[id]/layout.tsx
import { getSessionContext } from "@/lib/session"

export default async function TenantLayout({
  params,
  children,
}: {
  params: { id: string }
  children: React.ReactNode
}) {
  const session = await getSessionContext()
  if (!session) return null // <AuthedLayout> já redireciona pro /login

  const tenant = session.tenants.find((t) => t.id === params.id)
  const hasAccess = !!tenant || session.isSuperAdmin

  if (!hasAccess) {
    return (
      <main className="mx-auto max-w-xl py-24 text-center">
        <h1 className="text-xl font-semibold">Sem acesso</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Você não tem acesso a este workspace.
        </p>
      </main>
    )
  }

  return <>{children}</>
}
```

Notas:
- A mensagem é **genérica** de propósito — não distinguimos entre
  "tenant não existe", "foi soft-deleted" ou "você não é membro", para não
  vazar a existência de tenants alheios.
- Super admin **nunca** cai nesse fallback (tem acesso ampliado a todos os
  tenants ativos, com `isSuperAdminView` quando não é membro real).
- Esse gate é **complementar** ao RLS + `requireTenantRole` nas rotas: evita
  renderizar shell/dados de um tenant para quem não deveria, sem depender
  das rotas falharem individualmente.

## 1. Store — `stores/tenantStore.ts`

**Store único da sessão autenticada.** Fonte primária é o `SessionContext`
do server (injetado via `SessionHydrator`). Guarda **tudo** o que a UI client
precisa pra gates: `user`, `tenants`, `currentTenantId`, `role`, `isSuperAdmin`,
`menu`. Não há `sessionStore` separado — tudo que veio do `getSessionContext()`
mora aqui.

```ts
import { create } from "zustand"
import { useRouter } from "next/navigation"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import type { Role } from "@/lib/tenant"
import type { MenuItem } from "@/lib/menu"

export interface TenantSummary {
  id: string
  name: string
  role: Role                // role do user neste tenant (ou "owner" se super admin sem membership)
  isPrimaryOwner: boolean   // user é tenants.owner_id
  isBillingOwner: boolean   // user é tenants.billing_id
  isSuperAdminView: boolean // true se super admin visualizando tenant onde NÃO é membro
}

interface TenantState {
  user: { id: string; email: string | null } | null
  tenants: TenantSummary[]
  currentTenantId: string | null
  role: Role | null          // role no currentTenantId (espelho de SessionContext.role)
  isSuperAdmin: boolean
  menu: MenuItem[]
  /** Chamado uma vez pelo <SessionHydrator> do layout server. */
  hydrate: (input: {
    user: { id: string; email: string | null }
    tenants: TenantSummary[]
    currentTenantId: string | null
    role: Role | null
    isSuperAdmin: boolean
    menu: MenuItem[]
  }) => void
  currentTenant: () => TenantSummary | null
}

export const useTenantStore = create<TenantState>((set, get) => ({
  user: null,
  tenants: [],
  currentTenantId: null,
  role: null,
  isSuperAdmin: false,
  menu: [],
  hydrate: (input) => set(input),
  currentTenant: () =>
    get().tenants.find((t) => t.id === get().currentTenantId) ?? null,
}))

/**
 * Hook usado pelo TenantSelector. Encapsula o fluxo de troca:
 *   1. POST /api/session/current-tenant → seta cookie HTTP-only.
 *   2. Limpa workspace store (projeto/engine selecionados pertencem ao
 *      tenant anterior).
 *   3. router.refresh() → layout SSR re-executa com o novo menu/role.
 */
export function useSelectTenant() {
  const router = useRouter()
  return async (tenantId: string) => {
    const res = await fetch("/api/session/current-tenant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    })
    if (!res.ok) throw new Error("Failed to switch tenant")
    useWorkspaceStore.setState({ selectedProjectId: null, selectedEngineId: null })
    router.refresh()
  }
}
```

Não persistimos em localStorage: o cookie `next-calc-current-tenant` é a
fonte da verdade; o hydrate roda no mount a cada navegação SSR.

## 2. Route — `app/api/tenants/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.kind !== "user") {
    return NextResponse.json({ error: "USER_IDENTITY_REQUIRED" }, { status: 401 })
  }

  // SUPER ADMIN: visão ampliada — vê todos os tenants ativos (mesmo sem membership).
  if (auth.isSuperAdmin) {
    const { data, error } = await auth.supabase
      .from("tenants")
      .select("id, name, owner_id, billing_id, tenant_members(role, user_id)")
      .is("deleted_at", null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const tenants = (data ?? []).map((t: any) => {
      const self = t.tenant_members?.find((m: any) => m.user_id === auth.userId)
      return {
        id: t.id,
        name: t.name,
        role: self?.role ?? "owner",      // super admin age como owner em tenants onde não é membro
        isPrimaryOwner: t.owner_id === auth.userId,
        isBillingOwner: t.billing_id === auth.userId,
        isSuperAdminView: !self,          // true quando não é membro real
      }
    })
    return NextResponse.json(tenants)
  }

  // USER REGULAR: só tenants onde é membro.
  const { data, error } = await auth.supabase
    .from("tenant_members")
    .select("role, tenants!inner(id, name, owner_id, billing_id, deleted_at)")
    .eq("user_id", auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tenants = (data ?? [])
    .filter((r: any) => !r.tenants.deleted_at)
    .map((r: any) => ({
      id: r.tenants.id,
      name: r.tenants.name,
      role: r.role,
      isPrimaryOwner: r.tenants.owner_id === auth.userId,
      isBillingOwner: r.tenants.billing_id === auth.userId,
      isSuperAdminView: false,
    }))

  return NextResponse.json(tenants)
}

// POST — SOMENTE super admin cria tenant.
// Super admin escolhe no payload quem será primary (owner_id) e quem será
// billing (billing_id). Se billing_id omitido, = owner_id.
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.kind !== "user") {
    return NextResponse.json({ error: "USER_IDENTITY_REQUIRED" }, { status: 401 })
  }
  if (!auth.isSuperAdmin) {
    return NextResponse.json({ error: "ONLY_SUPER_ADMIN_CAN_CREATE_TENANT" }, { status: 403 })
  }

  const { name, ownerId, billingId } = await request.json() as {
    name: string; ownerId: string; billingId?: string
  }
  if (!name || !ownerId) {
    return NextResponse.json({ error: "NAME_AND_OWNER_REQUIRED" }, { status: 400 })
  }

  // RPC create_tenant é atômica e recebe caller explícito (ver AUTHZ_TENANT §11).
  // `execute` foi revogado de `authenticated` → chamar via service-role.
  const admin = createAdminClient()
  const { data: tenantId, error } = await admin.rpc("create_tenant", {
    _caller_id: auth.userId,
    _caller_is_super_admin: auth.isSuperAdmin,
    _name: name,
    _owner_id: ownerId,
    _billing_id: billingId ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: tenantId, name, ownerId, billingId: billingId ?? ownerId })
}
```

## 3. Route — `app/api/tenants/[id]/members/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { requireTenantRole, type Role } from "@/lib/tenant"

// GET — lista membros
export async function GET(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // requireTenantRole rejeita kind: "tenant_key" com USER_IDENTITY_REQUIRED.
  const role = await requireTenantRole(auth, params.id, "reader")
  if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status })

  const { data, error } = await auth.supabase
    .from("tenant_members")
    .select("role, created_at, users:user_id(id, email, user_metadata)")
    .eq("tenant_id", params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — muda role de um membro. Toda a invariante (CANNOT_MODIFY_PRIMARY_OWNER,
// ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER, ONLY_OWNER_CAN_DEMOTE_MANAGER,
// etc.) vive na RPC `change_member_role` (`db/authz_rpcs.sql` §11 em AUTHZ_TENANT).
// A policy de UPDATE direto em `tenant_members` foi revogada — mutações só via RPC.
export async function PATCH(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.kind !== "user") {
    return NextResponse.json({ error: "USER_IDENTITY_REQUIRED" }, { status: 401 })
  }

  const { userId, newRole } = await request.json() as { userId: string; newRole: Role }

  // RPC invocada via service-role (execute revogado pra authenticated — §11).
  const admin = createAdminClient()
  const { error } = await admin.rpc("change_member_role", {
    _caller_id: auth.userId,
    _caller_is_super_admin: auth.isSuperAdmin,
    _tenant_id: params.id,
    _user_id: userId,
    _new_role: newRole,
  })

  if (error) {
    // RPC lança exceções com nomes estáveis (INSUFFICIENT_ROLE, CANNOT_MODIFY_PRIMARY_OWNER,
    // CANNOT_MODIFY_BILLING_OWNER, ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER,
    // ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER, ONLY_OWNER_CAN_DEMOTE_MANAGER,
    // TARGET_NOT_A_MEMBER, TENANT_NOT_FOUND, INVALID_ROLE). Mapear pra HTTP:
    return mapRpcError(error.message)
  }
  return NextResponse.json({ ok: true })
}

// Helper local compartilhado com DELETE abaixo.
function mapRpcError(code: string) {
  const status =
    code === "TENANT_NOT_FOUND" || code === "TARGET_NOT_A_MEMBER" ? 404 :
    code === "INVALID_ROLE" ? 400 :
    code.startsWith("CANNOT_") || code === "CANNOT_REMOVE_LAST_OWNER" ? 409 :
    403
  return NextResponse.json({ error: code }, { status })
}
```

### DELETE `app/api/tenants/[id]/members/[userId]/route.ts`

```ts
// Duas RPCs possíveis dependendo de quem é o target:
//   - target = primary owner (tenants.owner_id) → força super admin, usa
//     `force_remove_primary_owner` (aceita `newPrimaryOwnerId` sempre e
//     `newBillingId` quando target também é billing).
//   - qualquer outro caso → `remove_member` (toda invariante lá dentro).
export async function DELETE(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.kind !== "user") {
    return NextResponse.json({ error: "USER_IDENTITY_REQUIRED" }, { status: 401 })
  }

  const url = new URL(request.url)
  const newPrimaryOwnerId = url.searchParams.get("newPrimaryOwnerId")
  const newBillingId = url.searchParams.get("newBillingId")

  // Descobrir se target é primary owner — single query simples; não depende
  // de RLS porque tenants.owner_id é público pra membros (policy de select).
  const { data: tenant } = await auth.supabase
    .from("tenants")
    .select("owner_id")
    .eq("id", params.id)
    .single()

  const isPrimaryOwnerTarget = tenant?.owner_id === params.userId
  const admin = createAdminClient()

  if (isPrimaryOwnerTarget) {
    if (!newPrimaryOwnerId) {
      return NextResponse.json(
        { error: "NEW_PRIMARY_OWNER_REQUIRED" },
        { status: 409 },
      )
    }
    const { error } = await admin.rpc("force_remove_primary_owner", {
      _caller_id: auth.userId,
      _caller_is_super_admin: auth.isSuperAdmin,
      _tenant_id: params.id,
      _target_user_id: params.userId,
      _new_primary_id: newPrimaryOwnerId,
      _new_billing_id: newBillingId, // pode ser null; RPC exige se target = billing
    })
    if (error) return mapRpcError(error.message)
    return NextResponse.json({ ok: true })
  }

  // Caso normal
  const { error } = await admin.rpc("remove_member", {
    _caller_id: auth.userId,
    _caller_is_super_admin: auth.isSuperAdmin,
    _tenant_id: params.id,
    _user_id: params.userId,
  })
  if (error) return mapRpcError(error.message)
  return NextResponse.json({ ok: true })
}
```

Os códigos possíveis (lançados pelas RPCs): `INSUFFICIENT_ROLE`, `TENANT_NOT_FOUND`, `TARGET_NOT_A_MEMBER`, `CANNOT_MODIFY_PRIMARY_OWNER`, `CANNOT_MODIFY_BILLING_OWNER`, `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER`, `ONLY_OWNER_CAN_DEMOTE_MANAGER`, `CANNOT_REMOVE_LAST_OWNER`, `ONLY_SUPER_ADMIN_CAN_FORCE_REMOVE`, `NEW_PRIMARY_SAME_AS_TARGET`, `NEW_BILLING_ID_REQUIRED`.

## 4. Route — `app/api/tenants/[id]/transfer-ownership/route.ts`

Endpoint dedicado pra **transferência do primary owner** (muda `tenants.owner_id`). Não confundir com billing (`tenants.billing_id`) — use `billing-owner` abaixo pra isso.

```ts
// POST { newPrimaryOwnerId }
//
// Regras:
// - Caller é super admin OU é o owner_id atual do tenant.
// - newPrimaryOwnerId precisa já ter role='owner' em tenant_members.
//   (Pra promover alguém a OWNER primeiro, primary owner ou super admin usa PATCH members.)
// - Super admin pode auto-promover newPrimaryOwnerId durante a transferência.
// - Caller antigo permanece com role='owner' em tenant_members — não rebaixa
//   automaticamente. Se quiser sair, DELETE members separado (respeitando
//   CANNOT_MODIFY_BILLING_OWNER caso ainda seja billing).
//
// Implementar como RPC Postgres para atomicidade (AUTHZ_TENANT §11):
//   const admin = createAdminClient()
//   admin.rpc("transfer_primary_ownership", {
//     _caller_id: auth.userId,
//     _caller_is_super_admin: auth.isSuperAdmin,
//     _tenant_id: params.id,
//     _new_owner_id: newPrimaryOwnerId,
//   })
// Invocar via service-role — execute revogado de authenticated (§11).
```

**Erros esperados** (lançados pela RPC `transfer_primary_ownership`):
- `403 NOT_AUTHORIZED` — caller não é primary owner nem super admin
- `409 NEW_OWNER_NOT_OWNER_ROLE` — newPrimaryOwnerId não tem role='owner' no tenant (cobre os dois casos: não é membro OU é membro com role inferior). A UI deve orientar: "promova a OWNER primeiro".
- `404 TENANT_NOT_FOUND`

## 4b. Route — `app/api/tenants/[id]/billing-owner/route.ts`

Troca o **billing owner** (muda `tenants.billing_id`). Independente do primary owner.

```ts
// POST { userId }
//
// Regras:
// - Caller é super admin OU é o owner_id atual (primary owner) do tenant.
//   (OWNER secundário NÃO pode mudar billing.)
// - userId precisa já ter role='owner' em tenant_members.
// - Super admin pode auto-promover userId durante a troca.
//
// RPC Postgres `set_billing_owner` (AUTHZ_TENANT §11):
//   const admin = createAdminClient()
//   admin.rpc("set_billing_owner", {
//     _caller_id: auth.userId,
//     _caller_is_super_admin: auth.isSuperAdmin,
//     _tenant_id: params.id,
//     _user_id: userId,
//   })
// Invocar via service-role — execute revogado de authenticated (§11).
```

**Erros esperados:**
- `403 NOT_AUTHORIZED` — caller não é primary owner nem super admin
- `409 USER_NOT_MEMBER` — userId não está em tenant_members (caller não super admin)
- `409 USER_NOT_OWNER_ROLE` — userId não tem role='owner' ainda (caller não super admin)
- `404 TENANT_NOT_FOUND`

## 5. Componente — `PermissionGate`

Gate client-side simples que usa o `role`/`isSuperAdmin` do `tenantStore`
(hidratado pelo layout SSR). Aceita duas formas: `minRole` (checagem direta
por hierarquia) ou `menuId` (checa se o item está no menu filtrado do server).

```tsx
// components/PermissionGate/index.tsx
"use client"
import { useTenantStore } from "@/stores/tenantStore"
import type { Role } from "@/lib/tenant"

const ROLE_RANK: Record<Role, number> = {
  reader: 1, editor: 2, manager: 3, owner: 4,
}

interface Props {
  /** Mínimo role exigido. Super admin sempre passa. */
  minRole?: Role
  /** Alternativa: checa se o item está no menu filtrado pelo server. */
  menuId?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({ minRole, menuId, children, fallback = null }: Props) {
  const role = useTenantStore((s) => s.role)
  const isSuperAdmin = useTenantStore((s) => s.isSuperAdmin)
  const menu = useTenantStore((s) => s.menu)

  if (menuId) {
    if (!menu.some((m) => m.id === menuId)) return <>{fallback}</>
    return <>{children}</>
  }
  if (minRole) {
    if (isSuperAdmin) return <>{children}</>
    if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) return <>{fallback}</>
    return <>{children}</>
  }
  return <>{children}</>
}
```

Uso:
```tsx
<PermissionGate minRole="editor">
  <button onClick={createProject}>Novo Projeto</button>
</PermissionGate>
```

## 6. Componente — `TenantSelector`

```tsx
// components/TenantSelector/index.tsx
"use client"
import { useTenantStore, useSelectTenant } from "@/stores/tenantStore"

export function TenantSelector() {
  const { tenants, currentTenantId } = useTenantStore()
  const selectTenant = useSelectTenant()

  if (tenants.length < 2) return null   // 1 único tenant não precisa de selector

  return (
    <select
      value={currentTenantId ?? ""}
      onChange={(e) => selectTenant(e.target.value)}
      className="..."
    >
      {tenants.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name} · {t.isSuperAdminView ? "admin" : t.role}
        </option>
      ))}
    </select>
  )
}
```

Incluído no `<AuthedHeader>` (rendered pelo layout SSR). A troca dispara
cookie + `router.refresh()` + cleanup do workspace — ver hook `useSelectTenant`
em §1.

## 7. Páginas

### `app/(authed)/tenants/[id]/settings/page.tsx`
Página de configurações do tenant: editar nome (owner+), ver info, botão "Soft-delete tenant" (owner, com confirmação dupla). Rename dispara `PATCH /api/tenants/[id]` → `admin.rpc("rename_tenant", ...)` (AUTHZ_TENANT §11). Soft-delete dispara `DELETE /api/tenants/[id]` → `admin.rpc("delete_tenant", ...)`.

### `app/(authed)/tenants/[id]/settings/members/page.tsx`
- Lista de membros com badges:
  - 👑 **"Primary owner"** ao lado do user que é `tenants.owner_id`.
  - 💳 **"Billing owner"** ao lado do user que é `tenants.billing_id` (pode ser o mesmo).
- Para cada membro: dropdown de role. Opções dependem do caller:
  - MANAGER: pode escolher entre `reader/editor/manager` (não vê `owner`). Row de OWNER → dropdown desabilitado + tooltip.
  - OWNER secundário: igual ao MANAGER + pode rebaixar/remover outros MANAGERs. Não vê `owner` na lista (não pode criar OWNER).
  - **PRIMARY OWNER** (`isPrimaryOwner`): vê `owner` nas opções (pode promover); pode rebaixar/remover OWNER secundário.
  - SUPER ADMIN: vê tudo.
- Linha do **primary owner** tem dropdown desabilitado pra todos exceto super admin (`CANNOT_MODIFY_PRIMARY_OWNER`).
- Linha do **billing owner** (se ≠ primary) tem dropdown desabilitado pra todos exceto super admin + CTA "Trocar billing antes" se for o primary tentando mexer.
- Botão "+ Convidar membro" (modal na Fase 4). Opção `owner` no select disponível apenas pro primary owner e super admin.
- Seção "Convites pendentes" (Fase 4).
- **Botão "Transferir primary ownership"** visível só se `isPrimaryOwner` ou super admin. Modal lista outros `role='owner'` como opções. Se não houver outro OWNER, tooltip "Convidar outro OWNER primeiro" com atalho pro modal de convite.
- **Botão "Trocar billing owner"** (💳) visível só se `isPrimaryOwner` ou super admin. Modal mesmo flow acima. Pode selecionar o próprio primary → billing volta a ser = primary.

### `app/(authed)/tenants/[id]/settings/api-keys/page.tsx`
(Fase 2 já definiu as rotas; aqui é só a UI)
- Lista de keys ativas: `name`, **badge de role** (`reader` / `editor`), `last_used_at`, `created_at`, `created_by`.
- Botão "+ Nova Key" → modal com inputs:
  - `name` (texto)
  - `role` (select: `reader` default, `editor`) — tooltip: *"reader só consome `/api/calc`; editor também pode criar/editar engines e projects via API."*
  → POST `/api/tenants/[id]/api-keys` com `{ name, role }` → **modal de raw** (copiar, não fecha até confirmar).
- Botão "Revogar" em cada linha (confirmation simples).

## 8. Integração: filtrar listas pelo tenant atual

As páginas existentes (projects, engines) devem usar `currentTenantId` do store:
```ts
const tenantId = useTenantStore((s) => s.currentTenantId)
useEffect(() => {
  if (!tenantId) return
  fetch(`/api/projects?tenantId=${tenantId}`).then(...)
}, [tenantId])
```

## Verificação

1. Login como user regular → header mostra selector com tenants onde é membro
2. Trocar tenant → lista de projects recarrega com os daquele tenant
3. READER em tenant X → botão "Novo Projeto" escondido
4. EDITOR em tenant X → botão "Novo Projeto" visível e funcional
5. MANAGER em Settings > Members → vê lista, consegue promover READER → EDITOR
6. MANAGER tenta rebaixar outro MANAGER → 403 `ONLY_OWNER_CAN_DEMOTE_MANAGER`
7. OWNER secundário rebaixa MANAGER → sucesso
8. MANAGER tenta promover alguém a OWNER → 403 `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER`
9. OWNER secundário tenta promover alguém a OWNER → 403 (mesma mensagem)
10. **PRIMARY OWNER** promove user a OWNER → sucesso; tenant agora tem 2 OWNERs
11. PRIMARY OWNER rebaixa OWNER secundário pra manager → sucesso
12. OWNER secundário tenta rebaixar outro OWNER secundário → 403 `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER`
13. Qualquer um tenta rebaixar PRIMARY OWNER via PATCH → 409 `CANNOT_MODIFY_PRIMARY_OWNER`
14. Qualquer um tenta rebaixar BILLING OWNER (≠ primary) via PATCH → 409 `CANNOT_MODIFY_BILLING_OWNER`
15. PRIMARY OWNER transfere primary pra outro OWNER → `tenants.owner_id` muda; antigo continua como OWNER secundário
16. PRIMARY OWNER troca `billing_id` pra outro OWNER → `tenants.billing_id` muda; antigo continua OWNER (secundário ou primary)
17. OWNER secundário tenta trocar `billing_id` → 403 `NOT_AUTHORIZED`
18. EDITOR em api-keys → consegue criar; READER não vê a página (ou vê "sem permissão")
19. Soft-delete tenant (owner, double-confirm) → tenant some do selector; projects/engines filtrados por `deleted_at is null` não aparecem

## Observações

- **Defesa em profundidade:** `PermissionGate` esconde, mas server também valida. Nunca confiar só no client.
- **Relogin após promoção:** role do user no tenant é consultada dinamicamente (via `tenant_members`), então promoção reflete no próximo `router.refresh()`. Mas super admin (`app_metadata`) só reflete após relogin — avisar o user nessa operação.
- **Fonte da verdade do tenant atual:** cookie HTTP-only `next-calc-current-tenant` (server) + `SessionHydrator` espelhando no `tenantStore` (client). **Sem localStorage** — evita divergência entre client e SSR.
- **Criar tenant:** **apenas super admin**. UI de super admin expõe botão "+ Novo tenant" (página `/admin/tenants/new` ou modal) com inputs `name`, `ownerId` (user picker), `billingId` (user picker, opcional — default = ownerId). User comum não vê o botão; `POST /api/tenants` sem `is_super_admin` responde 403.
- **Três conceitos visuais:** a UI precisa deixar claro a diferença entre "Primary owner" (👑), "Billing owner" (💳) e "Owner" (role). Linguagem consistente em toda a UI; tooltip em cada badge explicando o significado.
- **Não ter acesso a tenant nenhum:** decidido no layout SSR (`§0`):
  - **User regular** com `tenants.length === 0` → `redirect('/no-tenant')`. Mensagem: *"Sua conta ainda não foi associada a nenhum workspace. Peça ao admin para criar ou te convidar."* Sem CTA de criar (criação é super admin only).
  - **Super admin** com `tenants.length === 0` (nenhum tenant no sistema inteiro) → `redirect('/admin/tenants/new')` direto. Super admin nunca cai em `/no-tenant`.
  - **Super admin** com `tenants.length > 0` → fluxo normal; todos os tenants do sistema aparecem no selector, os que ele não é membro ganham badge "admin" (`isSuperAdminView === true`).
