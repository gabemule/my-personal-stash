# AUTHZ Fase 3 — UI de gestão (tenant selector, members, settings)

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md) · depende de [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md)

## Contexto

Com multi-tenant + RBAC em pé (Fase 1), esta fase entrega a UI que permite:

1. Trocar de tenant (user pode ser membro de vários).
2. Ver/gerenciar membros (manager+).
3. Transferir primary ownership (`tenants.owner_id`).
4. Trocar billing owner (`tenants.billing_id`).
5. Editar nome / soft-delete tenant.
6. Esconder do DOM ações que o role atual não pode executar — com o server validando em paralelo (defesa em profundidade).

Sem essa UI, tudo da Fase 1 precisa ser gerenciado via SQL Editor.

**Esforço:** médio (~4h).

## Decisões-chave

- Selector de tenant **no header de todo route group `(authed)`**.
- Tenant atual persistido em cookie HTTP-only `next-calc-current-tenant` (source of truth) e espelhado em `useTenantStore` client-side via `<SessionHydrator>`. **Sem localStorage.**
- UI usa `role`/`isSuperAdmin` do store só para esconder/desabilitar. Autorização real vive em RLS + `requireTenantRole` + RPCs (`AUTHZ_TENANT`).
- Super admin em tenant onde não é membro: visão ampliada no selector com badge "admin" (`isSuperAdminView`).
- Todas as mutações de tenant (create/rename/transfer/billing/delete) passam por RPC via `createAdminClient()` nos handlers — não há write direto da sessão do user em `tenants` nem `tenant_members` (ver `AUTHZ_TENANT` §RPCs).

### Matriz de permissões

"OWNER 2°" = row `role='owner'` em `tenant_members` que não é `owner_id` nem `billing_id` do tenant.

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
| Rebaixar / remover BILLING OWNER (≠ primary) | ❌ | ❌ | ❌ | ❌ | ❌ (trocar billing antes) | ✅ (com `newBillingId`) |
| Transferir primary ownership (`owner_id`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Trocar billing owner (`billing_id`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Soft-delete tenant | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

### Invariantes enforçadas pelo server

Todas lançadas pelas RPCs em `AUTHZ_TENANT §RPCs`; UI só mapeia pra mensagem:

- `CANNOT_MODIFY_PRIMARY_OWNER` — transfer primary antes.
- `CANNOT_MODIFY_BILLING_OWNER` — trocar billing antes.
- `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER`
- `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER`
- `ONLY_OWNER_CAN_DEMOTE_MANAGER`
- `CANNOT_REMOVE_LAST_OWNER` (guard defensivo)
- Super admin forçando primary/billing exige `newPrimaryOwnerId` / `newBillingId` explícitos (sem eleição implícita).

## Arquivos

| Arquivo | Ação | Descrição |
|---|---|---|
| `app/(authed)/layout.tsx` | Criar | Server component — chama `getSessionContext()`; redirects (user sem tenant → `/no-tenant`; super admin sem tenant → `/admin/tenants/new`); renderiza `<SessionHydrator>` + `<AuthedHeader>`. |
| `app/(authed)/tenants/[id]/layout.tsx` | Criar | Server component — valida membership ou super admin; fallback genérico "sem acesso" (não distingue "não existe" de "sem acesso"). |
| `app/(authed)/tenants/[id]/settings/page.tsx` | Criar | Edit nome (owner+), soft-delete (primary owner/super admin, double-confirm). |
| `app/(authed)/tenants/[id]/settings/members/page.tsx` | Criar | Lista membros + actions; seção "Convites pendentes" vem da Fase 4. |
| `app/(authed)/tenants/[id]/settings/api-keys/page.tsx` | Criar | UI da Fase 2 (ver `AUTHZ_API_KEYS`). |
| `app/no-tenant/page.tsx` | Criar | User regular sem workspace — sem CTA de criar. |
| `app/admin/tenants/new/page.tsx` | Criar | Form super admin only: `name`, `ownerId`, `billingId?`. |
| `app/api/session/current-tenant/route.ts` | Criar | POST `{ tenantId }` → seta cookie HTTP-only; valida membership (super admin bypassa). |
| `app/api/tenants/route.ts` | Criar | GET lista / POST cria (super admin only → RPC `create_tenant`). |
| `app/api/tenants/[id]/route.ts` | Criar | GET info · PATCH nome (RPC `rename_tenant`) · DELETE soft (RPC `delete_tenant`). |
| `app/api/tenants/[id]/members/route.ts` | Criar | GET lista · PATCH role (RPC `change_member_role`). |
| `app/api/tenants/[id]/members/[userId]/route.ts` | Criar | DELETE (RPC `remove_member` ou `force_remove_protected_member`). |
| `app/api/tenants/[id]/transfer-ownership/route.ts` | Criar | POST (RPC `transfer_primary_ownership`). |
| `app/api/tenants/[id]/billing-owner/route.ts` | Criar | POST (RPC `set_billing_owner`). |
| `stores/tenantStore.ts` | Criar | Store único (user + tenants + currentTenantId + role + isSuperAdmin + menu). |
| `components/TenantSelector/index.tsx` | Criar | Dropdown no header. |
| `components/PermissionGate/index.tsx` | Criar | Gate client por `minRole` ou `menuId`. |
| `components/SessionHydrator/index.tsx` | Criar | Client component — recebe `SessionContext` do `(authed)/layout.tsx` e chama `useTenantStore().hydrate(session)` uma vez no mount. |
| `components/AuthedHeader/index.tsx` | Criar | Client component — recebe `menu` e renderiza nav links + `<TenantSelector />`. |
| `hooks/useSelectTenant.ts` | Criar | Hook que encapsula troca de tenant: `POST /api/session/current-tenant` → cleanup `useWorkspaceStore` → `router.refresh()`. |

## Layouts

### `app/(authed)/layout.tsx` (server)

Contrato:
1. `const session = await getSessionContext()`.
2. `!session` → `redirect("/login")`.
3. `session.tenants.length === 0` → `redirect(session.isSuperAdmin ? "/admin/tenants/new" : "/no-tenant")`.
4. Senão renderiza `<SessionHydrator session={...} /> <AuthedHeader menu={session.menu} /> {children}`.

Todas as páginas autenticadas (`/projects`, `/engines`, `/calc`, `/builder`, `/tenants/[id]/settings/*`, `/admin/tenants/new`) ficam dentro do route group. Fora do grupo: `/login`, `/no-tenant`, `/invites/[token]`.

### `app/(authed)/tenants/[id]/layout.tsx` (server)

Última linha de defesa de UX para URLs com tenantId não-autorizado.

Contrato:
1. `const session = await getSessionContext()`; `!session` → `return null` (authed layout já redireciona).
2. `hasAccess = session.tenants.some(t => t.id === params.id) || session.isSuperAdmin`.
3. `!hasAccess` → renderiza fallback **genérico** ("Sem acesso" — não distingue "não existe" / "soft-deleted" / "sem membership"; não vaza existência de tenants alheios).
4. Senão renderiza `{children}`.

## Store — `stores/tenantStore.ts`

Store **único** da sessão autenticada (substitui `sessionStore` separado). Hidratado uma vez pelo `<SessionHydrator>`; sem localStorage.

Shape client-side:

```ts
interface TenantSummary {
  id: string
  name: string
  role: Role                 // role no tenant (ou "owner" se super admin sem membership)
  isPrimaryOwner: boolean    // user === tenants.owner_id
  isBillingOwner: boolean    // user === tenants.billing_id
  isSuperAdminView: boolean  // super admin sem membership real
  isDeleted: boolean         // tenant soft-deleted (apenas super admin recebe; user regular nunca vê)
}

interface TenantState {
  user: { id: string; email: string | null } | null
  tenants: TenantSummary[]
  currentTenantId: string | null
  role: Role | null          // role no currentTenantId
  isSuperAdmin: boolean
  menu: MenuItem[]
  hydrate: (session: SessionContext) => void
  currentTenant: () => TenantSummary | null
}
```

`Role`, `MenuItem`, `SessionContext` vêm de `AUTHZ_TENANT` (types server-internos).

Hook auxiliar `useSelectTenant()` encapsula troca de tenant:
1. `POST /api/session/current-tenant { tenantId }` → cookie HTTP-only.
2. Cleanup de `useWorkspaceStore`: reset de `selectedProjectId` e `selectedEngineId` para `null` antes do refresh — esses valores pertencem ao tenant anterior e não têm significado no novo contexto. O reset deve ocorrer **antes** de `router.refresh()` para que o próximo render já parta com o estado limpo. Importante: `useWorkspaceStore` usa `persist` (localStorage), então sem este cleanup explícito os IDs antigos podem reaparecer após reload ou re-hidratação.
3. `router.refresh()` → layout SSR re-executa e hidrata o novo menu/role.

## Componentes

### `TenantSelector`

Props: nenhuma (consome `useTenantStore`).

Contrato:
- Não renderiza quando `tenants.length < 2`.
- Dropdown listando cada tenant com label `${name} · ${isSuperAdminView ? "admin" : role}`.
- Tenants com `isDeleted = true` (visíveis apenas ao super admin) aparecem com label `${name} · excluído` e estilo muted — não são selecionáveis via troca de tenant (não faz sentido trabalhar em tenant soft-deleted; acesso direto via URL exibe fallback "Sem acesso").
- `onChange` dispara `useSelectTenant()`.

### `PermissionGate`

Props:
```ts
interface PermissionGateProps {
  /** Alternativa 1: role mínimo exigido. Super admin sempre passa. */
  minRole?: Role
  /** Alternativa 2: checa presença no menu filtrado pelo server. */
  menuId?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}
```

Contrato:
- Se `menuId`: renderiza `children` sse `menu.some(m => m.id === menuId)`.
- Se `minRole`: renderiza `children` sse `isSuperAdmin || ROLE_RANK[role] >= ROLE_RANK[minRole]`.
- Nunca é autoritativo — só esconde. Autorização real é no server.

## Endpoints

Todos exigem `requireAuth` com `kind === "user"` (exceto onde marcado). As respostas são JSON; para códigos não listados explicitamente, `500` com `{ error }`.

| Método | Rota | Quem pode | RPC chamada | Principais erros (status) |
|---|---|---|---|---|
| GET | `/api/tenants` | user | — (select) | — |
| POST | `/api/tenants` | super admin | `create_tenant` | `ONLY_SUPER_ADMIN_CAN_CREATE_TENANT` (403), `NAME_AND_OWNER_REQUIRED` (400) |
| GET | `/api/tenants/[id]` | membro+ | — | |
| PATCH | `/api/tenants/[id]` | owner+ | `rename_tenant` | `INSUFFICIENT_ROLE` (403) |
| DELETE | `/api/tenants/[id]` | primary/super | `delete_tenant` | `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT` (403) |
| GET | `/api/tenants/[id]/members` | reader+ | — (select) | |
| PATCH | `/api/tenants/[id]/members` | manager+ | `change_member_role` | ver tabela de erros abaixo |
| DELETE | `/api/tenants/[id]/members/[userId]` | manager+ (ou super pra primary) | `remove_member` / `force_remove_protected_member` | ver abaixo |
| POST | `/api/tenants/[id]/transfer-ownership` | primary/super | `transfer_primary_ownership` | `NEW_OWNER_NOT_OWNER_ROLE` (409) |
| POST | `/api/tenants/[id]/billing-owner` | primary/super | `set_billing_owner` | `USER_NOT_OWNER_ROLE` (409) |
| POST | `/api/session/current-tenant` | user | — | `NOT_A_MEMBER` (403) |

Rota pública (fora do grupo `(authed)`): landing de convite — ver `AUTHZ_INVITES`.

### Error → HTTP status

Dois níveis de origem: erros levantados pelas RPCs (mapeados por `mapRpcError(code)`) e erros do handler/helpers antes do RPC (`requireAuth`, `requireTenantRole`, validação de body). O handler aplica ambos, mas a separação evita confusão quando alguém estende o mapa.

**RPC errors** (raised via `raise exception '<CODE>'` nas RPCs de `AUTHZ_TENANT §RPCs`):

| Código | Status |
|---|---|
| `TENANT_NOT_FOUND`, `TARGET_NOT_A_MEMBER`, `INVITE_NOT_FOUND` | 404 |
| `INVALID_ROLE`, `NAME_REQUIRED` | 400 |
| `CANNOT_MODIFY_PRIMARY_OWNER`, `CANNOT_MODIFY_BILLING_OWNER`, `CANNOT_REMOVE_LAST_OWNER`, `NEW_OWNER_NOT_OWNER_ROLE`, `USER_NOT_OWNER_ROLE`, `NEW_PRIMARY_SAME_AS_TARGET`, `NEW_BILLING_ID_REQUIRED`, `PENDING_INVITE_EXISTS`, `INVITE_WOULD_DEMOTE_MEMBER`, `TENANT_NAME_TAKEN` | 409 |
| `INVITE_NOT_USABLE` | 410 |
| `INSUFFICIENT_ROLE`, `ONLY_*_CAN_*`, `NOT_AUTHORIZED` | 403 |
| demais | 500 |

**Handler-level errors** (levantados por `requireAuth` / `requireTenantRole` / `requireTenantAccess` / Zod validation antes do RPC):

| Código | Status | Origem |
|---|---|---|
| `UNAUTHENTICATED` | 401 | `requireAuth` |
| `USER_IDENTITY_REQUIRED` | 401 | `requireUserAuth` — Bearer em rota user-only |
| `INVALID_API_KEY` | 401 | `requireAuth` (branch Bearer, Fase 2) |
| `NOT_A_MEMBER`, `TENANT_MISMATCH` | 403 | `requireTenantRole` / `requireTenantAccess` |
| `EMAIL_AND_ROLE_REQUIRED`, `NAME_AND_OWNER_REQUIRED`, `USER_EMAIL_REQUIRED`, `NAME_REQUIRED` (body) | 400 | body validation (Zod em `schemas/api.ts`) |

## Handler patterns

Resumido (referência — implementar no ACT):

- `GET /api/tenants` (lista):
  - Super admin: lê `tenants` via admin client **sem** filtro de `deleted_at` (super admin vê todos, incluindo soft-deleted), join `tenant_members` para self-membership; mapeia `isSuperAdminView = !self`, `role = self?.role ?? "owner"`, `isDeleted = deleted_at is not null`.
  - User regular: lê `tenant_members!inner(tenants...)` via sessão; filtra `deleted_at is null` (RLS já aplica, mas filtrar explicitamente no query evita surprise se o client mudar).

- `DELETE /api/tenants/[id]/members/[userId]`:
  - Se `target.user_id === tenant.owner_id` (primary): exige `newPrimaryOwnerId` (query string); super admin only; chama `force_remove_protected_member(_new_primary_id = ..., _new_billing_id = ...)`. Se o target também era billing, `newBillingId` é obrigatório; senão o antigo billing permanece.
  - Se `target.user_id === tenant.billing_id` **e** `target.user_id !== tenant.owner_id` (billing-only): exige `newBillingId` (query string); super admin only; chama `force_remove_protected_member(_target_user_id = <target>, _new_primary_id = <tenant.owner_id>, _new_billing_id = ...)`.
  - Senão → `remove_member` (manager+ ou qualquer owner, conforme matriz).

- `POST /api/session/current-tenant`:
  - Valida `tenantId ∈ session.tenants` (ou super admin); seta cookie `next-calc-current-tenant` (`httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure: process.env.NODE_ENV === "production"`).

- Todas as RPCs são invocadas via `createAdminClient().rpc(name, { _caller_id, _caller_is_super_admin, ... })`. `execute` está revogado de `public, anon, authenticated` (ver `AUTHZ_TENANT` §Helpers). Service-role é **apenas transporte**; a identidade do caller é sempre a de `requireAuth`.

## Páginas

### `settings/page.tsx`
- Input nome (owner+) → PATCH.
- Botão "Soft-delete" (primary/super, double-confirm) → DELETE.

### `settings/members/page.tsx`
- Lista com badges 👑 Primary / 💳 Billing (inline label, tooltip explica).
- Dropdown de role por row — opções filtradas pelo caller:
  - MANAGER / OWNER 2° → `reader/editor/manager`.
  - PRIMARY / SUPER → acima + `owner`.
- Linhas `isPrimaryOwner` / `isBillingOwner` com dropdown desabilitado (exceto super admin).
- Botões **"Transferir primary ownership"** e **"Trocar billing owner"** visíveis só para primary/super. Modais listam outros `role='owner'` como alvo; se não houver outro OWNER, tooltip "convide um OWNER primeiro" com atalho pro modal de convite (Fase 4).
- "+ Convidar membro" (Fase 4) + "Convites pendentes" (Fase 4).

### `settings/api-keys/page.tsx`
- Lista keys ativas (name, role badge, last_used_at, created_at, created_by).
- "+ Nova Key" → modal `{ name, role: "reader" | "editor" }` → raw mostrado 1x.
- "Revogar" por linha (confirmation).

### Páginas "sem contexto"
- `app/no-tenant/page.tsx` — mensagem estática: "Sua conta ainda não foi associada a nenhum workspace. Peça ao admin." Sem CTA de criar.
- `app/admin/tenants/new/page.tsx` — super admin only (layout já garante o redirect); form com `name`, `ownerId` (user picker), `billingId?` (default = ownerId).

## Integração com páginas existentes

Páginas de `projects`/`engines` consomem `currentTenantId` via `useTenantStore`. Fetches incluem tenant no path (`/api/projects?tenantId=${currentTenantId}`) ou o server infere pelo cookie — ver `AUTHZ_TENANT` §Endpoints para o contrato exato.

## Verificação

1. Login como user regular → header mostra selector com tenants onde é membro.
2. Trocar tenant → lista de projects recarrega.
3. READER → botão "Novo Projeto" escondido (PermissionGate) + POST retorna 403.
4. EDITOR → "Novo Projeto" visível e funcional.
5. MANAGER em members → consegue promover READER → EDITOR.
6. MANAGER tenta rebaixar outro MANAGER → 403 `ONLY_OWNER_CAN_DEMOTE_MANAGER`.
7. OWNER 2° rebaixa MANAGER → sucesso.
8. MANAGER tenta promover a OWNER → 403 `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER`.
9. OWNER 2° tenta promover a OWNER → 403 (mesmo código).
10. PRIMARY OWNER promove a OWNER → sucesso; tenant com 2 OWNERs.
11. PRIMARY OWNER rebaixa OWNER 2° → sucesso.
12. OWNER 2° tenta rebaixar outro OWNER 2° → 403 `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER`.
13. Qualquer um tenta PATCH no primary owner → 409 `CANNOT_MODIFY_PRIMARY_OWNER`.
14. Qualquer um tenta PATCH no billing owner (≠ primary) → 409 `CANNOT_MODIFY_BILLING_OWNER`.
15. PRIMARY transfere primary → `owner_id` muda; antigo continua OWNER 2°.
16. PRIMARY troca billing → `billing_id` muda; antigo continua OWNER.
17. OWNER 2° tenta trocar billing → 403 `NOT_AUTHORIZED`.
18. EDITOR em api-keys → cria; READER → página oculta (menu filtrado).
19. Soft-delete tenant (primary, double-confirm) → some do selector; projects/engines filtrados (cascade via `AUTHZ_TENANT` RLS).
20. URL com tenantId onde user não é membro → fallback "Sem acesso" do layout `[id]`.

## Observações

- **Defesa em profundidade.** PermissionGate esconde, server valida. Nunca confiar só no client.
- **Relogin após super admin flag change.** `app_metadata.is_super_admin` só reflete após novo login — avisar na operação.
- **Role refresh.** Role em `tenant_members` reflete no próximo `router.refresh()` (SSR re-executa `getSessionContext`). Sem necessidade de relogin.
- **Três conceitos visuais:** Primary owner (👑) vs Billing owner (💳) vs role `owner`. Linguagem consistente + tooltip em cada badge.
- **Super admin sem tenant:** nunca cai em `/no-tenant` (redirect direto pra `/admin/tenants/new`).
- **Sem localStorage.** Cookie HTTP-only `next-calc-current-tenant` + SSR hydration elimina divergência client/server.
- **`workspaceStore` no logout:** `workspaceStore` usa `persist` (localStorage). No fluxo de logout, resetar o store antes do redirect — sem isso, user B logando no mesmo browser herda `selectedProjectId`/`selectedEngineId` do user A.
- **CSRF:** rotas cookie-based (ex: `POST /api/session/current-tenant`) não têm CSRF protection explícita. `SameSite: "lax"` mitiga cross-origin form POST; fetch de outro origin não é possível sem CORS allow. Decisão consciente — payload de troca de tenant não é destrutivo; reavaliar se surgir rota cookie-based com operação irreversível.
