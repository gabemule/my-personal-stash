# AUTHZ Incremental — Fase 4: Multi-tenant

> **Depende de:** Fase 1 — [`1_RBAC.md`](./1_RBAC.md) · Fase 2 — [`2_INVITES.md`](./2_INVITES.md) · Fase 3 — [`3_SETTINGS.md`](./3_SETTINGS.md)
> **Referência completa (contratos detalhados):** [`../SUPABASE_AUTHZ_COMPLETE/AUTHZ_TENANT.md`](../SUPABASE_AUTHZ_COMPLETE/AUTHZ_TENANT.md) · [`../SUPABASE_AUTHZ_COMPLETE/AUTHZ_API_KEYS.md`](../SUPABASE_AUTHZ_COMPLETE/AUTHZ_API_KEYS.md) · [`../SUPABASE_AUTHZ_COMPLETE/AUTHZ_RBAC_UI.md`](../SUPABASE_AUTHZ_COMPLETE/AUTHZ_RBAC_UI.md) · [`../SUPABASE_AUTHZ_COMPLETE/AUTHZ_INVITES.md`](../SUPABASE_AUTHZ_COMPLETE/AUTHZ_INVITES.md)

Isolamento de dados entre clientes. Cada tenant tem seus próprios projetos, engines, API keys e membros. O que as Fases 1–3 implementaram globalmente passa a ser scoped por tenant.

**Motivação:** dois clientes não deveriam ver os dados um do outro. Criação e gestão de tenants é um processo comercial controlado — não self-service.

> **Contratos detalhados estão em `SUPABASE_AUTHZ_COMPLETE/`.** Este doc mapeia o que muda em relação às Fases 1–3 e define a sequência de migration. Para schema completo, RPCs, RLS e endpoints, consultar os docs de referência acima.

---

## O que muda em relação às Fases 1–3

| Fase 1–3 (global) | Fase 4 (tenant-scoped) |
|---|---|
| `user_roles(user_id, role)` | `tenant_members(tenant_id, user_id, role)` |
| `GlobalRole` = `admin/editor/reader` | `Role` = `owner/manager/editor/reader` + `super_admin` em `app_metadata` |
| `invites(email, role)` | `tenant_invites(tenant_id, email, role)` com token hash |
| `api_keys` sem `tenant_id` | `api_keys` com `tenant_id` + `created_by` |
| `projects` sem `tenant_id` | `projects` com `tenant_id NOT NULL` |
| RLS: `authenticated full access` | RLS: policies por tenant (ver `AUTHZ_TENANT §RLS`) |
| Mutações diretas nos handlers | Mutações sensíveis via RPCs `security definer` |
| Settings globais | Settings por tenant |
| Sem selector de tenant | `TenantSelector` no header |

---

## Novas tabelas e alterações (resumo)

Ver contratos completos em `SUPABASE_AUTHZ_COMPLETE/AUTHZ_TENANT.md §Schema`.

### Novas tabelas

| Tabela | Propósito |
|---|---|
| `tenants` | Workspace de dados: `id`, `name`, `owner_id`, `billing_id`, `deleted_at` |
| `tenant_members` | Substitui `user_roles` scoped: `(tenant_id, user_id)` PK + `role` |
| `tenant_invites` | Substitui `invites` scoped: `tenant_id`, `email`, `role`, `token_hash`, `expires_at` |

### Alterações em tabelas existentes

| Tabela | Mudança |
|---|---|
| `projects` | + `tenant_id uuid NOT NULL` + novos unique indexes scoped por tenant (`deleted_at` já adicionado na Fase 1) |
| `engines` | + `project_id NOT NULL` (após backfill; `deleted_at` já adicionado na Fase 1) |
| `api_keys` | + `tenant_id` + `role` (já adicionado na Fase 1) + `created_by` + `last_used_at` |
| `user_roles` | Deprecada após backfill em `tenant_members` |
| `invites` | Deprecada após backfill em `tenant_invites` |

### Hierarquia de roles expandida

`reader=1 · editor=2 · manager=3 · owner=4` + `super_admin` global (não membro de tenant, mas bypassa tudo).

Dois "ownerships" em cada tenant: `primary owner` (`tenants.owner_id`) e `billing owner` (`tenants.billing_id`). Ver `SUPABASE_AUTHZ_COMPLETE/AUTHZ_PLAN.md §Decisões-chave`.

---

## Novos helpers SQL

Substituem o enforcement na application layer da Fase 1. RLS passa a depender deles.

| Helper | Assinatura | Propósito |
|---|---|---|
| `is_super_admin` | `(caller_id uuid) returns boolean` | Consulta `app_metadata.is_super_admin` |
| `has_tenant_role` | `(caller_id, tenant_id, min_role) returns boolean` | Checa role em `tenant_members` |

Ambos: `security definer`, `set search_path = ''`, `execute revogado de public, anon, authenticated`.

---

## RPCs `security definer` (mutações sensíveis)

Tabelas `tenants`, `tenant_members`, `tenant_invites` têm `INSERT/UPDATE/DELETE` revogados em RLS. Toda mutação passa pelas RPCs abaixo, invocadas via `createAdminClient().rpc(...)` nos handlers.

| RPC | Propósito |
|---|---|
| `create_tenant` | Cria tenant + membership inicial. Super admin only. |
| `rename_tenant` | Renomeia. Primary owner ou super admin. |
| `delete_tenant` | Soft-delete. Primary owner ou super admin. |
| `transfer_primary_ownership` | Muda `tenants.owner_id`. |
| `set_billing_owner` | Muda `tenants.billing_id`. |
| `change_member_role` | Promoção/rebaixamento com guards de invariante. |
| `remove_member` | Remove membro com guards. |
| `force_remove_protected_member` | Remove primary/billing owner. Super admin only. |
| `create_invite` | Cria convite scoped ao tenant. |
| `revoke_invite` | Revoga convite. |
| `accept_invite` | Aceita convite + cria membership atomicamente. |

Contratos completos (parâmetros, erros, invariantes): `SUPABASE_AUTHZ_COMPLETE/AUTHZ_TENANT.md §RPCs`.

---

## Invariantes nomeadas enforçadas nas RPCs

| Invariante | Erros HTTP |
|---|---|
| `CANNOT_MODIFY_PRIMARY_OWNER` | 409 |
| `CANNOT_MODIFY_BILLING_OWNER` | 409 |
| `CANNOT_REMOVE_LAST_OWNER` | 409 |
| `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER` | 403 |
| `ONLY_OWNER_CAN_DEMOTE_MANAGER` | 403 |
| `PENDING_INVITE_EXISTS` | 409 |
| `INVITE_NOT_USABLE` | 410 |
| `INVITE_WOULD_DEMOTE_MEMBER` | 409 |
| `ALREADY_PRIMARY_OWNER` | 409 |

---

## Tipos server (`lib/auth.ts` evoluído)

Ver `SUPABASE_AUTHZ_COMPLETE/AUTHZ_TENANT.md §Server types` para o contrato completo.

```ts
type AuthUser = {
  kind: "user"
  userId: string
  isSuperAdmin: boolean
  supabase: SupabaseClient       // sessão cookie
}

type AuthTenantKey = {
  kind: "tenant_key"
  tenantId: string
  role: "reader" | "editor"
  apiKeyId: string
  supabase: SupabaseClient       // service-role
}

type Auth = AuthUser | AuthTenantKey
```

- `requireTenantRole(auth, tenantId, minRole)` — gestão (user-only).
- `requireTenantAccess(auth, tenantId, minRole)` — dados (aceita `user` + `tenant_key`).

---

## Criação de tenants: super admin only

Onboarding é processo comercial controlado. User sem tenant → `/no-tenant`. Super admin sem tenant → `/admin/tenants/new`. Ver `SUPABASE_AUTHZ_COMPLETE/AUTHZ_PLAN.md §Tenant creation é super-admin only`.

---

## Migration one-off (dados existentes)

Contratos completos em `SUPABASE_AUTHZ_COMPLETE/AUTHZ_TENANT.md §Migration`. Resumo da sequência:

1. Verificar engines sem `project_id` (Step 0).
2. Setar super admin em `app_metadata` do primeiro user.
3. Criar tenant "Default" + membership inicial.
4. Backfill `projects.tenant_id = <default>`.
5. Backfill memberships globais em `tenant_members` (de `user_roles`).
6. Backfill invites em `tenant_invites` (de `invites`).
7. Backfill `api_keys.tenant_id = <default>`.
8. Aplicar `NOT NULL` em `projects.tenant_id` + `engines.project_id`.
9. Deprecar `user_roles` e `invites` (manter por período de transição).

---

## Novos componentes UI

Ver contratos completos em `SUPABASE_AUTHZ_COMPLETE/AUTHZ_RBAC_UI.md`.

| Componente | Propósito |
|---|---|
| `TenantSelector` | Dropdown no header — troca de tenant |
| `SessionHydrator` (evoluído) | Hidrata `tenantStore` (superset do `roleStore`) |
| `stores/tenantStore.ts` | Substitui `roleStore` — user + tenants + currentTenantId + role + menu |
| `PermissionGate` (evoluído) | Aceita `minRole` ou `menuId` |

### Settings expandidos

| Página | Propósito |
|---|---|
| `/(authed)/tenants/[id]/settings/page.tsx` | Editar nome, soft-delete tenant |
| `/(authed)/tenants/[id]/settings/members/page.tsx` | Gerenciar membros + ownership + convites |
| `/(authed)/tenants/[id]/settings/api-keys/page.tsx` | Gerenciar keys scoped ao tenant |
| `/no-tenant/page.tsx` | Landing sem workspace |
| `/admin/tenants/new/page.tsx` | Criar tenant (super admin only) |

---

## Ordem de deploy SQL

```
authz_tenants.sql → schema.sql (alter) → authz_helpers.sql →
authz_rpcs.sql → rls.sql → migration_authz.sql
```

---

## Verificação (resumo)

Ver checklist completa em `SUPABASE_AUTHZ_COMPLETE/AUTHZ_PROGRESS.md §Critérios de sucesso globais`. Highlights:

- Isolamento: User A (tenant Acme) não vê dados do User B (tenant Foo).
- Super admin acessa qualquer tenant; selector mostra todos com badge "admin".
- Tenant soft-deleted → projects/engines filtrados em cascata via RLS.
- Bearer de tenant A não acessa engine do tenant B → `404 ENGINE_NOT_FOUND`.
- Mutações diretas em `tenants/tenant_members/tenant_invites` via client autenticado → bloqueadas por RLS.
- RPCs e helpers invocáveis apenas via service-role → `permission denied` se chamados diretamente.
