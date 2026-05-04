# AUTHZ — Progress tracking

**Status geral:** 0/79 itens · Fase atual: _não iniciada_

Docs relacionados: [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md) · [`AUTHZ_API_KEYS.md`](./AUTHZ_API_KEYS.md) · [`AUTHZ_RBAC_UI.md`](./AUTHZ_RBAC_UI.md) · [`AUTHZ_INVITES.md`](./AUTHZ_INVITES.md) · [`AUTHZ_AUDIT_LOG.md`](./AUTHZ_AUDIT_LOG.md)

---

## Fase 1 — Multi-tenant + RBAC (`AUTHZ_TENANT`)

**Status:** 0/34

### DB
- [ ] Criar `db/authz_tenants.sql` (tenants, tenant_members, tenant_invites — schema completo com `revoked_at` e unique index `tenant_invites_pending_unique`)
- [ ] Adicionar `deleted_at timestamptz` em `tenants` (parte do `db/authz_tenants.sql`)
- [ ] Adicionar `deleted_at timestamptz` em `projects` e `engines` + **drop de `projects_name_key`** (única global, substituída pela scoped abaixo) + **novos unique parciais scoped com soft-delete**: `tenants_name_unique(name) where deleted_at is null`, `projects_name_tenant_unique(tenant_id, name) where deleted_at is null`, `engines_name_project_unique(project_id, name) where deleted_at is null` (em `db/schema.sql`)
- [ ] Adicionar `tenant_id uuid` em `projects` (nullable, depois NOT NULL)
- [ ] Unique indexes parciais de active-scope: `projects_one_active_per_tenant` e `engines_one_active_per_project` (ver TENANT §2)
- [ ] Criar `db/authz_helpers.sql` — `has_tenant_role(_caller_id, _tenant_id, _min_role)` + `is_super_admin(_caller_id)` (caller explícito; `revoke execute ... from public, anon, authenticated`)
- [ ] Criar `db/authz_rpcs.sql` com RPCs atômicas (todas recebem `_caller_id uuid` + `_caller_is_super_admin boolean`): `create_tenant`, `rename_tenant`, `transfer_primary_ownership`, `set_billing_owner`, `delete_tenant`, `force_remove_protected_member`, `change_member_role`, `remove_member`, `accept_invite`, `create_invite`, `revoke_invite`
- [ ] Reescrever `db/rls.sql` com policies por tenant (incluindo cascata de soft-delete em projects/engines + revogar insert/update/delete em `tenants`, `tenant_members` e `tenant_invites` — todas as mutações via RPC)
- [ ] Criar migration `db/migration_authz.sql` (Step 0: verificar engines com `project_id IS NULL`; depois: tenant default + super admin + backfill projects + **backfill engines órfãs** + `ALTER TABLE engines ALTER COLUMN project_id SET NOT NULL`)

### Server
- [ ] Criar `lib/supabase/admin.ts` (service-role client)
- [ ] Criar `lib/auth.ts` com `requireAuth(request)` retornando união `Auth = AuthUser | AuthTenantKey` (discriminator `kind: "user" | "tenant_key"`) e `requireUserAuth(auth)` como narrowing para rotas user-only (rejeita `kind !== "user"` com `USER_IDENTITY_REQUIRED`)
- [ ] Criar `lib/tenant.ts` com `requireTenantRole(auth, tenantId, role)` (gestão — user-only) e `requireTenantAccess(auth, tenantId, role)` (dados — aceita user + tenant_key)
- [ ] Criar `lib/menu.ts` — `buildMenu(role, isSuperAdmin, tenantId)` (definição central + filtro do menu)
- [ ] Criar `lib/session.ts` — `getSessionContext()` SSR retornando `{ user, tenants, currentTenantId, role, isSuperAdmin, menu }`
- [ ] Setar `is_super_admin` no `app_metadata` do primeiro user via SQL

### Routes
- [ ] Criar `app/api/session/route.ts` — wrapper HTTP de `getSessionContext()` (GET)
- [ ] Atualizar `app/api/projects/route.ts` — receber/validar `tenantId`, usar `requireAuth`
- [ ] Atualizar `app/api/projects/[id]/route.ts` — PATCH rename + DELETE soft-delete
- [ ] Atualizar `app/api/projects/[id]/activate/route.ts` — escopado por `tenant_id` (ver TENANT §Active-scope)
- [ ] Atualizar `app/api/engines/[id]/activate/route.ts` — escopado por `project_id`
- [ ] Atualizar `app/api/engines/route.ts` — validar acesso ao tenant do project
- [ ] Atualizar `app/api/engines/active/route.ts` — `requireAuth` + tenant check
- [ ] Atualizar `app/api/engines/[id]/route.ts` — `requireAuth` + soft-delete
- [ ] Atualizar `app/api/calc/[...segments]/route.ts` — respeitar tenant
- [ ] Atualizar `app/api/schema/route.ts` e `app/api/schemas/[method]/[...path]/` — adicionar `requireAuth` (critério de sucesso: nenhuma rota /api/* sem auth)
- [ ] Atualizar `schemas/api.ts` e `schemas/endpoints.ts` — adicionar `TenantSummary`, `MenuItem`, `SessionContext`; registrar `GET /api/session` e rotas de tenants

### Verificação
- [ ] Smoke test manual (2 users, 2 tenants; isolamento)
- [ ] Smoke test soft-delete (delete project → `deleted_at` populado; queries filtram)
- [ ] Smoke test cascata: soft-delete tenant esconde projects/engines mesmo com tenant_id direto
- [ ] Smoke test 401 (`UNAUTHENTICATED`; `USER_IDENTITY_REQUIRED` em rota de gestão com Bearer) e 403 (`INSUFFICIENT_ROLE`, `NOT_A_MEMBER`)
- [ ] Smoke test helpers protegidos: `rpc('has_tenant_role'/'is_super_admin')` direto → permission denied
- [ ] Smoke test RPCs protegidas: `rpc('change_member_role'/'create_tenant'/'create_invite')` direto → permission denied
- [ ] Smoke test mutações bloqueadas nas tabelas: `insert/update/delete` direto em `tenants`, `tenant_members` e `tenant_invites` via sessão autenticada → erro de RLS
- [ ] Smoke test `/api/session`: resposta `{ user, tenants, currentTenantId, role, isSuperAdmin, menu }`; cada `TenantSummary` inclui `role`
- [ ] Smoke test active-scope por tenant: users em tenants distintos mantêm projects ativos em paralelo; insert de 2 ativos no mesmo tenant via SQL → unique index dispara

---

## Fase 2 — API Keys tenant-scoped (`AUTHZ_API_KEYS`)

**Status:** 0/12

### DB
- [ ] Criar `db/api_keys.sql` com `tenant_id`, `name`, `key_hash`, `role` (`'reader'|'editor'` default `reader`), `created_by`, `last_used_at`, `deleted_at`
- [ ] RLS: `has_tenant_role(tenant_id, 'editor')` para CRUD

### Server
- [ ] Criar `lib/api-keys.ts` (`hashKey`, `generateRawKey`, `validateApiKey` retornando `{ tenantId, keyId, role }`)
- [ ] `validateApiKey` filtra tenant soft-deleted via join em `tenants.deleted_at is null` (cascata: tenant apagado invalida Bearers)
- [ ] Atualizar `lib/auth.ts` `requireAuth` — branch Bearer → `{ kind: "tenant_key", tenantId, role, apiKeyId, supabase: admin }`
- [ ] Criar `app/api/tenants/[id]/api-keys/route.ts` — GET lista (user-only; rejeita tenant_key com `USER_IDENTITY_REQUIRED`) · POST cria (user-only; body `{ name, role }`; retorna raw 1x)
- [ ] Criar `app/api/tenants/[id]/api-keys/[keyId]/route.ts` (DELETE revoga — user-only)
- [ ] Atualizar `app/api/calc/[...segments]/route.ts` — `requireTenantAccess` (aceita user + tenant_key) + filtro manual por `tenantId`
- [ ] Rotas CRUD de engines/projects: `requireTenantAccess(auth, tenantId, "editor")` → 403 `INSUFFICIENT_ROLE` se key for `reader`
- [ ] Patchar `proxy.ts` pra pular `getUser()` em `/api/calc/*` quando header `Authorization: Bearer` presente (delega validação pro handler; ganho ~800ms)

### Bruno
- [ ] Adicionar `apiKey` em `bruno/environments/local.bru` e `staging.bru`
- [ ] Adicionar header `Authorization: Bearer {{apiKey}}` em `bruno/calc/calculate.bru`

---

## Fase 3 — UI de gestão (`AUTHZ_RBAC_UI`)

**Status:** 0/23

### Rotas / API
- [ ] `GET/POST /api/tenants/route.ts` (GET lista — visão ampliada `isSuperAdminView` pra super admin; POST super admin only → RPC `create_tenant`)
- [ ] `GET/PATCH/DELETE /api/tenants/[id]/route.ts` (GET info; PATCH nome → RPC `rename_tenant`; DELETE → RPC `delete_tenant`)
- [ ] `GET/PATCH /api/tenants/[id]/members/route.ts` (PATCH → RPC `change_member_role`)
- [ ] `DELETE /api/tenants/[id]/members/[userId]/route.ts` (RPC `remove_member` ou `force_remove_protected_member` com `?newPrimaryOwnerId`/`?newBillingId`)
- [ ] `POST /api/tenants/[id]/transfer-ownership/route.ts` → RPC `transfer_primary_ownership`
- [ ] `POST /api/tenants/[id]/billing-owner/route.ts` → RPC `set_billing_owner`
- [ ] `POST /api/session/current-tenant/route.ts` — cookie HTTP-only `next-calc-current-tenant` (valida membership; super admin bypassa)

### Layout / Shell autenticado
- [ ] `app/(authed)/layout.tsx` — server component chamando `getSessionContext()`; redirects user sem tenant → `/no-tenant`, super admin sem tenant → `/admin/tenants/new`; renderiza `<SessionHydrator>` + `<AuthedHeader>`
- [ ] `app/(authed)/tenants/[id]/layout.tsx` — valida membership do tenant; fallback genérico "sem acesso"
- [ ] `SessionHydrator` (client) — hidrata `tenantStore` único com `SessionContext`

### Componentes globais
- [ ] `TenantSelector` (dropdown; `useSelectTenant` → cookie + refresh + cleanup `useWorkspaceStore`)
- [ ] `stores/tenantStore.ts` único (user + tenants + currentTenantId + role + isSuperAdmin + menu; sem localStorage)
- [ ] `PermissionGate` — `minRole` ou `menuId`; consome `useTenantStore`
- [ ] `app/no-tenant/page.tsx` (sem CTA de criar)
- [ ] `app/admin/tenants/new/page.tsx` (super admin only; inputs name/ownerId/billingId)

### Settings > Members
- [ ] Rota `app/(authed)/tenants/[id]/settings/members/page.tsx` + lista com badges 👑/💳
- [ ] Botão "Promover/Rebaixar" (dropdown de role por row; opções filtradas pelo caller)
- [ ] Botão "Remover membro" (MANAGER+/OWNER+/PRIMARY conforme target; guard defensivo `CANNOT_REMOVE_LAST_OWNER`)
- [ ] Botões "Transferir primary ownership" / "Trocar billing owner" (primary ou super admin)

### Settings > API Keys
- [ ] Rota `app/(authed)/tenants/[id]/settings/api-keys/page.tsx` — listar com badge de role, modal "Nova Key" (select `role`) + raw 1x, botão revogar

### Settings > Tenant
- [ ] Rota `app/(authed)/tenants/[id]/settings/page.tsx` (editar nome, info)
- [ ] Soft-delete tenant (primary/super, double-confirm)
- [ ] Logout: resetar `workspaceStore` (localStorage) antes do redirect — evita que user B herde `selectedProjectId`/`selectedEngineId` do user A no mesmo browser

---

## Fase 4 — Convites por email (`AUTHZ_INVITES`)

**Status:** 0/10

### Server
- [ ] Criar `lib/invites.ts` (`generateInviteToken`, `hashInviteToken`)
- [ ] Criar `lib/email.ts` (wrapper `sendInviteEmail`)
- [ ] Criar `app/api/tenants/[id]/invites/route.ts` (GET lista pendentes — reader+; POST cria — manager+ → RPC `create_invite`)
- [ ] Criar `app/api/tenants/[id]/invites/[inviteId]/route.ts` (DELETE revoga — manager+ → RPC `revoke_invite`)
- [ ] Criar `app/api/invites/[token]/route.ts` (GET público via service-role)
- [ ] Criar `app/api/invites/[token]/accept/route.ts` (POST — user-only → RPC `accept_invite`)
- [ ] Atualizar `proxy.ts` — excluir `/invites/*` e `/api/invites/*` do redirect de auth (landing pública e GET do convite precisam funcionar sem sessão)

### UI
- [ ] Modal "Convidar membro" em Settings > Members (email + role; `owner` só pra primary/super)
- [ ] Lista de "Convites pendentes" abaixo da lista de membros (com revogar)
- [ ] Página `app/invites/[token]/page.tsx` — landing pública (fora do `(authed)`)

---

## Fase 5 (leva 2) — Audit Log (`AUTHZ_AUDIT_LOG`)

**Status:** plantado, não iniciar ainda

- [ ] (doc registrado; implementação condicional à primeira dor)

---

## Critérios de sucesso globais (ver `AUTHZ_PLAN.md`)

- [ ] Tentar remover o último OWNER de um tenant → 409 `CANNOT_REMOVE_LAST_OWNER` (guard defensivo)
- [ ] Rota de gestão (api-keys, members, invites, transfer, billing) com Bearer válido → 401 `USER_IDENTITY_REQUIRED`
- [ ] `DELETE /api/tenants/[id]` por MANAGER → 403; por OWNER secundário → 403 `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT`; por primary owner → 200 e `tenants.deleted_at` populado
- [ ] Aceite de convite com email diferente do autenticado → 410 `INVITE_NOT_USABLE` (validado dentro da RPC)
- [ ] Dois POSTs concorrentes de invite pro mesmo (tenant, email) → um 200 + um 409 `PENDING_INVITE_EXISTS` (via 23505, não 500)
- [ ] Nenhuma rota de `/api/*` (exceto `/api/auth/*`) responde 200 sem auth
- [ ] User A e User B em tenants distintos: isolamento validado
- [ ] Super admin vê tudo em qualquer tenant
- [ ] Selector de tenant: user regular vê só onde é membro; super admin vê TODOS (badge "admin" quando não é membro)
- [ ] Apenas super admin cria tenants — user comum tentando `POST /api/tenants` → 403
- [ ] User sem tenant cai em `/no-tenant` (super admin vai direto pra `/admin/tenants/new`)
- [ ] EDITOR+ cria project; READER não vê botão
- [ ] `transfer_primary_ownership` pra si mesmo → 409 `ALREADY_PRIMARY_OWNER`
- [ ] Apenas primary owner (`tenants.owner_id`) ou super admin cria OWNER
- [ ] Apenas primary owner ou super admin troca `tenants.billing_id`
- [ ] OWNER consegue rebaixar/remover MANAGER; outro MANAGER não (`ONLY_OWNER_CAN_DEMOTE_MANAGER`)
- [ ] MANAGER promove → READER vira EDITOR
- [ ] Tentativa de rebaixar/remover primary/billing owner bloqueada sem transferência (`CANNOT_MODIFY_PRIMARY_OWNER` / `CANNOT_MODIFY_BILLING_OWNER`)
- [ ] Convite por email → aceite → membership criada
- [ ] API key do tenant A não lê tenant B
- [ ] API key de tenant soft-deleted → 401 `INVALID_API_KEY` (cascata via join em `tenants.deleted_at`)
- [ ] Soft-delete: `deleted_at` populado; queries filtram
- [ ] Tenant soft-deleted esconde projects/engines via policies (join em `tenants.deleted_at`)
