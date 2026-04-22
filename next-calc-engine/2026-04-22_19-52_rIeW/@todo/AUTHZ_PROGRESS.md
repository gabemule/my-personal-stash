# AUTHZ — Progress tracking

**Status geral:** 0/74 itens · Fase atual: _não iniciada_

Docs relacionados: [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md) · [`AUTHZ_API_KEYS.md`](./AUTHZ_API_KEYS.md) · [`AUTHZ_RBAC_UI.md`](./AUTHZ_RBAC_UI.md) · [`AUTHZ_INVITES.md`](./AUTHZ_INVITES.md) · [`AUTHZ_AUDIT_LOG.md`](./AUTHZ_AUDIT_LOG.md)

---

## Fase 1 — Multi-tenant + RBAC (`AUTHZ_TENANT`)

**Status:** 0/29

### DB
- [ ] Criar `db/authz_tenants.sql` (tenants, tenant_members, tenant_invites — schema completo com `revoked_at` e unique index pending)
- [ ] Adicionar `deleted_at timestamptz` em `tenants`, `projects`, `engines` + **drop das uniques de `name`** em `projects` e `engines(name, project_id)`
- [ ] Adicionar `tenant_id uuid` em `projects` (nullable, depois NOT NULL)
- [ ] Unique indexes parciais de active-scope: `projects_one_active_per_tenant` e `engines_one_active_per_project` (ver TENANT §2)
- [ ] Criar `db/authz_helpers.sql` — `has_tenant_role(_caller_id uuid, _tenant_id uuid, _min_role text)` + `is_super_admin(_caller_id uuid)` (caller explícito; `revoke execute` de anon/authenticated)
- [ ] Criar `db/authz_rpcs.sql` com RPCs atômicas (todas recebem `_caller_id uuid` + `_caller_is_super_admin boolean` explícitos): `create_tenant`, `transfer_primary_ownership`, `set_billing_owner`, `delete_tenant`, `force_remove_primary_owner`, `change_member_role`, `remove_member`, `accept_invite`
- [ ] Reescrever `db/rls.sql` com policies por tenant (incluindo policies de `tenant_invites` + cascata de soft-delete em projects/engines joining `tenants.deleted_at` + revogar insert/update/delete em `tenant_members`)
- [ ] Criar migration `db/migration_authz.sql` (tenant default + super admin + backfill projects)

### Server
- [ ] Criar `lib/supabase/admin.ts` (service-role client)
- [ ] Criar `lib/auth.ts` com `requireAuth(request)` retornando união `Auth = AuthUser | AuthTenantKey` com discriminator `kind: "user" | "tenant_key"` + helper `requireUserAuth(auth)` (rejeita `tenant_key` com `USER_IDENTITY_REQUIRED`)
- [ ] Criar `lib/tenant.ts` com `requireTenantRole(auth, tenantId, role)` (gestão — user-only) e `requireTenantAccess(auth, tenantId, role)` (dados — aceita user + tenant_key)
- [ ] Criar `lib/menu.ts` — `buildMenu(role, isSuperAdmin, tenantId)` (definição central + filtro do menu)
- [ ] Criar `lib/session.ts` — `getSessionContext()` SSR retornando `{ user, tenants, currentTenantId, role, isSuperAdmin, menu }` (cada `TenantSummary` inclui `role`)
- [ ] Setar `is_super_admin` no `app_metadata` do primeiro user via SQL

### Routes
- [ ] Criar `app/api/session/route.ts` — wrapper HTTP de `getSessionContext()` (GET)
- [ ] Atualizar `app/api/projects/route.ts` — receber/validar `tenantId`, usar `requireAuth`
- [ ] Atualizar `app/api/projects/[id]/route.ts` — PATCH rename + DELETE soft-delete
- [ ] Atualizar `app/api/projects/[id]/activate/route.ts` — pattern escapado por `tenant_id` (ver TENANT §10 "Ativação escopada por tenant")
- [ ] Atualizar `app/api/engines/[id]/activate/route.ts` — pattern equivalente escapado por `project_id`
- [ ] Atualizar `app/api/engines/route.ts` — validar que user tem acesso ao tenant do project
- [ ] Atualizar `app/api/engines/active/route.ts` — `requireAuth` + tenant check
- [ ] Atualizar `app/api/engines/[id]/route.ts` — `requireAuth` + soft-delete
- [ ] Atualizar `app/api/calc/[...segments]/route.ts` — respeitar tenant
- [ ] Atualizar `schemas/api.ts` e `schemas/endpoints.ts` — adicionar `TenantSummary`, `MenuItem`, `SessionContext`; registrar `GET /api/session` e rotas de tenants

### Verificação
- [ ] Smoke test manual (criar 2 users, 2 tenants; checar isolamento)
- [ ] Smoke test soft-delete (delete project → `deleted_at` populado; queries filtram)
- [ ] Smoke test cascata: soft-delete tenant esconde projects/engines mesmo com tenant_id direto
- [ ] Smoke test 401 (`UNAUTHENTICATED` sem credencial; `USER_IDENTITY_REQUIRED` em rota de gestão com Bearer/`tenant_key`) e 403 (`INSUFFICIENT_ROLE`, `NOT_A_MEMBER`)
- [ ] Smoke test helpers protegidos: `supabase.rpc('has_tenant_role', ...)` / `supabase.rpc('is_super_admin', ...)` direto retorna erro de permissão (revogados de anon/authenticated)
- [ ] Smoke test RPCs protegidas: `supabase.rpc('change_member_role', ...)` / `rpc('create_tenant', ...)` direto retorna erro de permissão (revogados)
- [ ] Smoke test `/api/session`: resposta contém `{ user, tenants, currentTenantId, role, isSuperAdmin, menu }` e cada `TenantSummary` inclui `role`
- [ ] Smoke test active-scope por tenant: 2 users em tenants distintos ativam projects — ambos permanecem ativos (escopo correto); tentar inserir 2 projects ativos no mesmo tenant via SQL falha com `projects_one_active_per_tenant`


---

## Fase 2 — API Keys tenant-scoped (`AUTHZ_API_KEYS`)

**Status:** 0/11

### DB
- [ ] Criar `db/api_keys.sql` com `tenant_id`, `name`, `key_hash`, `role` (`'reader'|'editor'` default `reader`), `created_by`, `last_used_at`, `deleted_at`
- [ ] RLS: `has_tenant_role(tenant_id, 'editor')` para CRUD

### Server
- [ ] Criar `lib/api-keys.ts` (`hashKey`, `generateRawKey`, `validateApiKey` retornando `{ tenantId, keyId, role }`)
- [ ] `validateApiKey` filtra tenant soft-deleted via join em `tenants.deleted_at is null` (cascata: tenant apagado invalida Bearers)
- [ ] Atualizar `lib/auth.ts` `requireAuth` implementando branch Bearer → retorna `{ kind: "tenant_key", tenantId, role, apiKeyId, supabase: admin }`
- [ ] Criar `app/api/tenants/[id]/api-keys/route.ts` — GET lista (**user-only**: rejeita `tenant_key` com `USER_IDENTITY_REQUIRED`); POST cria (user-only; aceita `{ name, role }` no body; retorna raw 1x)
- [ ] Criar `app/api/tenants/[id]/api-keys/[keyId]/route.ts` (DELETE revoga — user-only)
- [ ] Atualizar `app/api/calc/[...segments]/route.ts` — usar `requireTenantAccess` (aceita user + tenant_key) + filtro manual por `tenantId` quando `kind === "tenant_key"`
- [ ] Rotas CRUD de engines/projects: `requireTenantAccess(auth, tenantId, "editor")` → 403 `INSUFFICIENT_ROLE` se key for `reader`
- [ ] Patchar `proxy.ts` pra pular `getUser()` em rotas que aceitam Bearer (`/api/calc/*`, `/api/engines`, `/api/projects`) quando header `Authorization: Bearer ...` presente — delega validação pro handler via `validateApiKey` (ganho de ~800ms de latência)

### Bruno
- [ ] Adicionar `apiKey` em `bruno/environments/local.bru` e `staging.bru`
- [ ] Adicionar header `Authorization: Bearer {{apiKey}}` em `bruno/calc/calculate.bru`

---

## Fase 3 — UI de gestão (`AUTHZ_RBAC_UI`)

**Status:** 0/25

### Rotas / API
- [ ] `GET/POST /api/tenants/route.ts` (GET lista meus tenants + visão ampliada `isSuperAdminView` pra super admin; POST super admin only → RPC `create_tenant`)
- [ ] `GET/PATCH/DELETE /api/tenants/[id]/route.ts` (info do tenant, editar nome owner+, soft-delete via RPC `delete_tenant` — primary owner ou super admin)
- [ ] `GET/PATCH /api/tenants/[id]/members/route.ts`
- [ ] `DELETE /api/tenants/[id]/members/[userId]/route.ts` (com escape super admin via `?newPrimaryOwnerId` / `?newBillingId` → RPC `force_remove_primary_owner`)
- [ ] `POST /api/tenants/[id]/transfer-ownership/route.ts` → RPC `transfer_primary_ownership`
- [ ] `POST /api/tenants/[id]/billing-owner/route.ts` → RPC `set_billing_owner`
- [ ] `POST /api/session/current-tenant/route.ts` — seta cookie HTTP-only `next-calc-current-tenant`

### Layout / Shell autenticado
- [ ] `app/(authed)/layout.tsx` (server component) chamando `getSessionContext()` — redirects: user sem tenant → `/no-tenant`; super admin sem tenant → `/admin/tenants/new`; renderiza `<SessionHydrator>` + `<AuthedHeader>` com `TenantSelector` + `menu`
- [ ] `app/(authed)/tenants/[id]/layout.tsx` (server component) — valida membership do tenant no path; renderiza fallback genérico "sem acesso" quando user não é membro (super admin sempre passa)
- [ ] `SessionHydrator` (client) — hidrata `tenantStore` único (fundido com `sessionStore`) com `user`, `tenants`, `currentTenantId`, `role`, `isSuperAdmin`, `menu` a partir do `SessionContext` SSR

### Componentes globais
- [ ] `TenantSelector` no header (dropdown com tenants do user; troca via `useSelectTenant` → cookie + `router.refresh()` + cleanup do `useWorkspaceStore`)
- [ ] `stores/tenantStore.ts` único (fundido com `sessionStore` — carrega `user` + `tenants` + `currentTenantId` + `role` + `isSuperAdmin` + `menu`; hook `useSelectTenant` exportado junto)
- [ ] `PermissionGate` — checa `minRole`/`menuId` contra `useTenantStore` (uso: `<PermissionGate minRole="editor">` ou `<PermissionGate menuId="settings/api-keys">`)
- [ ] Página `app/no-tenant/page.tsx` (sem CTA de criar)
- [ ] Página `app/admin/tenants/new/page.tsx` (super admin only; inputs name/ownerId/billingId)

### Settings > Members
- [ ] Rota `app/tenants/[id]/settings/members/page.tsx` + lista com badges 👑/💳
- [ ] Botão "Promover/Rebaixar" (manager+; rebaixar manager → OWNER+; promover a OWNER → primary owner ou super admin)
- [ ] Botão "Remover membro" (manager+; remover manager → OWNER+; remover owner secundário → primary owner ou super admin; remover primary/billing owner bloqueado sem transferência; guard defensivo `CANNOT_REMOVE_LAST_OWNER`)
- [ ] Botões "Transferir primary ownership" / "Trocar billing owner" (ambos primary owner ou super admin)

### Settings > API Keys
- [ ] Rota `app/tenants/[id]/settings/api-keys/page.tsx` — listar keys com badge de role (editor+), modal "Nova Key" com select `role` (`reader`/`editor`, default `reader`) e raw mostrado 1x, botão revogar

### Settings > Tenant
- [ ] Rota `app/tenants/[id]/settings/page.tsx` (editar nome, ver info)
- [ ] Soft-delete tenant (owner → confirmation modal)

---

## Fase 4 — Convites por email (`AUTHZ_INVITES`)

**Status:** 0/9

### Server
- [ ] Criar `lib/invites.ts` (`generateInviteToken`, `hashInviteToken`)
- [ ] Criar `lib/email.ts` (wrapper `sendInviteEmail`)
- [ ] Criar `app/api/tenants/[id]/invites/route.ts` (POST cria convite, GET lista pendentes)
- [ ] Criar `app/api/tenants/[id]/invites/[inviteId]/route.ts` (DELETE revoga)
- [ ] Criar `app/api/invites/[token]/route.ts` (GET retorna dados do convite)
- [ ] Criar `app/api/invites/[token]/accept/route.ts` (POST accept)

### UI
- [ ] Modal "Convidar membro" em Settings > Members (email + role; opção `owner` só pra primary/super admin)
- [ ] Lista de "Convites pendentes" abaixo da lista de membros (com "reenviar"/"revogar")
- [ ] Página `app/invites/[token]/page.tsx` — landing do convite (mostra dados + botão aceitar; fluxo não-logado redireciona pra login mantendo o token)

---

## Fase 5 (leva 2) — Audit Log (`AUTHZ_AUDIT_LOG`)

**Status:** plantado, não iniciar ainda

- [ ] (doc registrado; implementação condicional à primeira dor)

---

## Critérios de sucesso globais (ver `AUTHZ_PLAN.md`)

- [ ] Tentar remover o último OWNER de um tenant → 409 `CANNOT_REMOVE_LAST_OWNER` (guard defensivo; regras de primary/billing normalmente já cobrem)
- [ ] Rota de gestão (ex: `POST /api/tenants/[id]/api-keys`, `GET /api/tenants/[id]/api-keys`, members, invites) com Bearer válido → 401 `USER_IDENTITY_REQUIRED`
- [ ] `DELETE /api/tenants/[id]` por MANAGER → 403; por OWNER secundário → 403 `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT`; por primary owner → 200 e `tenants.deleted_at` populado (via RPC `delete_tenant`)
- [ ] Aceite de convite com email diferente do autenticado → 410 `INVITE_NOT_USABLE` (validado dentro da RPC, não no handler)
- [ ] Dois POSTs concorrentes de invite pro mesmo (tenant, email) → um 200 + um 409 `PENDING_INVITE_EXISTS` (via 23505, não 500)
- [ ] Nenhuma rota de `/api/*` (exceto `/api/auth/*`) responde 200 sem auth
- [ ] User A e User B em tenants distintos: isolamento validado
- [ ] Super admin vê tudo em qualquer tenant
- [ ] Selector de tenant: user regular vê só onde é membro; super admin vê TODOS os tenants (badge "admin" quando não é membro)
- [ ] **Apenas super admin cria tenants** — user comum tentando `POST /api/tenants` → 403
- [ ] User sem tenant cai em `/no-tenant` (super admin sem tenants vai direto pra `/admin/tenants/new`)
- [ ] EDITOR+ cria project; READER não vê botão
- [ ] Apenas primary owner (`tenants.owner_id`) ou super admin cria OWNER
- [ ] Apenas primary owner ou super admin consegue trocar `tenants.billing_id`
- [ ] OWNER consegue rebaixar/remover MANAGER; outro MANAGER não consegue (`ONLY_OWNER_CAN_DEMOTE_MANAGER`)
- [ ] MANAGER promove → READER vira EDITOR
- [ ] Tentativa de rebaixar/remover primary owner ou billing owner é bloqueada sem transferência explícita (`CANNOT_MODIFY_PRIMARY_OWNER` / `CANNOT_MODIFY_BILLING_OWNER`)
- [ ] Convite por email → aceite → membership criada
- [ ] API key do tenant A não lê tenant B
- [ ] API key de tenant soft-deleted → 401 `INVALID_API_KEY` (cascata da Fase 1 alcança Bearer)
- [ ] Soft-delete: `deleted_at` populado; queries filtram
- [ ] Tenant soft-deleted esconde projects/engines via policies (join em `tenants.deleted_at`)

---

## Changelog

- **2026-04-22 (portabilidade A/B/C + fusão de stores + RPC delete_tenant + fixes críticos):**
  - **Portabilidade A — discriminator `kind`:** `requireAuth` retorna `kind: "user" | "tenant_key"` (antes `via: "cookie" | "bearer"`). Erro `COOKIE_REQUIRED` → `USER_IDENTITY_REQUIRED`. Rotas de gestão exigem `kind === "user"`.
  - **Portabilidade B — RPCs com caller explícito:** toda RPC (`create_tenant`, `transfer_primary_ownership`, `set_billing_owner`, `delete_tenant`, `force_remove_primary_owner`, `change_member_role`, `remove_member`, `accept_invite`) recebe `_caller_id uuid` + `_caller_is_super_admin boolean` do handler. Nenhuma consulta `auth.uid()` / `is_super_admin()` internamente. Ordem SQL de deploy: `authz_helpers.sql` **antes** de `authz_rpcs.sql`.
  - **Portabilidade C — Helpers SQL com caller explícito:** `has_tenant_role(_caller_id, _tenant_id, _min_role)` e `is_super_admin(_caller_id)`. `auth.uid()` fica confinado a `db/rls.sql` (policies) e `lib/auth.ts` (extrator). Tudo mais é puro.
  - **`lib/tenant.ts` ganha `requireTenantAccess`** além de `requireTenantRole`: gestão continua user-only; dados (calc) aceitam user + tenant_key.
  - **Fundido `sessionStore` + `tenantStore`** num único `stores/tenantStore.ts` carregando `user`, `tenants`, `currentTenantId`, `role`, `isSuperAdmin`, `menu`. `PermissionGate` consome só `useTenantStore`.
  - **Nova RPC `delete_tenant`:** atômica, primary owner ou super admin (`ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT`). `DELETE /api/tenants/[id]` delega pra ela.
  - **Critical fix — `GET /api/tenants/[id]/api-keys` passa a ser user-only.** Antes aceitava Bearer (quem possuía uma key podia listar as demais — passo zero de uma escalação). Agora rejeita `tenant_key` com `USER_IDENTITY_REQUIRED`.
  - **Critical fix — `accept_invite` valida email DENTRO da RPC.** Antes o handler validava pré-RPC, abrindo race. Agora recebe `_caller_email` e compara case-insensitive na transação; erros agrupados em `INVITE_NOT_USABLE` (GET segue distinguindo).
  - **POST invites trata `23505`** (unique violation em `tenant_invites_pending_unique`) mapeando pra `PENDING_INVITE_EXISTS` — fecha race entre lookup e insert.
  - **`revoke execute`** em helpers e em todas as RPCs para `anon`/`authenticated` (documentado novo smoke test).
  - **Patch em `proxy.ts`** para pular `getUser()` em rotas que aceitam Bearer com header presente (ganho ~800ms).
  - Contagens inalteradas — todas as mudanças foram renomes/reescritas in-place; nenhum item novo introduzido (o patch de `proxy.ts` é item novo já listado na Fase 2). **Total: 74.**

- **2026-04-22 (active-scope por tenant + tenant [id] layout + role exposto ao client):**
  - **Active-scope escopado por tenant/project (G11):** `db/schema.sql` ganha unique indexes parciais `projects_one_active_per_tenant` e `engines_one_active_per_project`. Handlers `POST /api/projects/[id]/activate` e `POST /api/engines/[id]/activate` escapam explicitamente o `.eq("tenant_id"/"project_id", ...)` ao zerar os outros ativos (ver TENANT §10 "Ativação escopada por tenant"); se o unique index disparar por race, trata como sucesso (outro ACTIVATE concorrente venceu). Smoke test novo: users em tenants distintos conseguem ter cada um seu próprio project ativo simultaneamente.
  - **Layout por tenant (G8):** `app/(authed)/tenants/[id]/layout.tsx` valida que o user é membro do tenant do path (super admin sempre passa). Quando não é, renderiza fallback genérico "Sem acesso" sem distinguir "tenant inexistente" de "sem membership" — não vaza existência de tenants alheios. Complementar ao RLS + `requireTenantRole` nas rotas.
  - **`role` / `isSuperAdmin` voltam ao `SessionContext` público.** Reverte a ideia de esconder role do client: `TenantSummary` volta a ter `role`, e `SessionContext` adiciona `role: Role | null` + `isSuperAdmin: boolean` no topo. Motivação: o custo de manter dois shapes (interno vs público) + derivar visibilidade do menu não justifica o ganho — a fronteira de segurança continua server-side (RLS + `requireTenantRole` + RPCs). `PermissionGate` volta a aceitar `minRole="editor"` além de `menuId="..."`.
  - Contagens reajustadas: Fase 1 27 → 29 (active-scope index + 2 handlers de activate + smoke test escopado) · Fase 3 24 → 25 (tenant [id] layout) · **total 71 → 74**.

- **2026-04-20 (SSR session + schemas/ move + drop uniques):**
  - **Endpoint SSR `/api/session` + `lib/session.ts` + `lib/menu.ts`.** Shell autenticado renderiza via SSR; server monta `SessionContext = { user, tenants, currentTenantId, menu }` com o menu já filtrado por role. **Role e `isSuperAdmin` não vazam pro client** — UI deriva "posso ver X" da presença/ausência do item no menu. Seleção do tenant atual guardada em cookie HTTP-only `next-calc-current-tenant`; troca de tenant via `POST /api/session/current-tenant` + `router.refresh()` (full reload SSR). Cleanup do `useWorkspaceStore` (`selectedProjectId`/`selectedEngineId`) no momento da troca.
  - **Fase 3 passa a ter um layout server component `app/(authed)/layout.tsx`** como fonte da verdade dos redirects (user sem tenant → `/no-tenant`; super admin sem tenant → `/admin/tenants/new`) + hidratação de `tenantStore`/`sessionStore` via `<SessionHydrator>`. `stores/tenantStore.ts` vira **thin** (só `tenants` + `currentTenantId`, sem localStorage persist); hook `useSelectTenant` exportado junto.
  - **`lib/schemas/` movido para `schemas/`** (root, irmão de `lib/`). Schemas são globais, não de lib. 3 imports atualizados (`schemas/endpoints.ts`, `app/api/schema/route.ts`, `app/api/schemas/[method]/[...path]/route.ts`); `tsc --noEmit` passou limpo.
  - **Drop das uniques de `name`** em `projects` (`projects_name_key`) e `engines` (`engines_name_project_unique`). Identificação cruzada no código é via UUID; nomes podem colidir entre tenants (e até dentro do mesmo) sem prejuízo.
  - **Rotas faltando** na tabela da Fase 1 incluídas explicitamente: `projects/active`, `projects/[id]/activate`, `projects/[id]/engines`, `projects/[id]/engines/active`, `engines/[id]/activate`, PATCH `projects/[id]`. `schemas/api.ts`/`schemas/endpoints.ts` entram como "atualizar" com `TenantSummary`/`MenuItem`/`SessionContext` + registro de `GET /api/session`.
  - Contagens reajustadas: Fase 1 24 → 27 (novas DB/server/routes/verificação do session) · Fase 3 22 → 24 (layout authed + SessionHydrator + current-tenant route; TenantSelector/store/gate reformulados sem adicionar itens novos) · **total 64 → 71**.

- **2026-04-20 (ajustes pré-ACT — RPCs + API key role):**
  - **API keys ganham `role` (`reader` | `editor`, default `reader`).** Coluna nova em `api_keys`, propagada por `validateApiKey` → `requireAuth` → `bearerRole` no retorno. `reader` só bate em `/api/calc/*`; `editor` também em CRUD de engines/projects. Gestão (members/invites/api-keys/transfer/billing) continua sempre `COOKIE_REQUIRED`. UI de criação de key ganha select de role.
  - **Mutações em `tenant_members` concentradas em RPCs.** Revogamos `insert/update/delete` direto da tabela para `authenticated`. Novas RPCs `security definer` em `db/authz_rpcs.sql`: `change_member_role`, `remove_member`, `accept_invite`. A doc de rotas (PATCH/DELETE members, POST accept invite) passa a chamar `supabase.rpc(...)` e mapear os códigos de erro.
  - **`force_remove_primary_owner` revisto:** renomeado `_victim_user_id` → `_target_user_id`; adicionados guards `NEW_PRIMARY_SAME_AS_TARGET` e `NEW_BILLING_ID_REQUIRED` (quando target também é billing — sem fallback implícito).
  - **Helpers SQL protegidos:** `revoke execute on is_super_admin() / has_tenant_role(...) from anon, authenticated` para impedir inferência via `supabase.rpc(...)` direto (só policies RLS invocam).
  - **Transfer-ownership:** dedupe de erros (`NEW_OWNER_NOT_MEMBER` + `NEW_OWNER_NOT_OWNER_ROLE` viram um só — `NEW_OWNER_NOT_OWNER_ROLE` cobre os dois casos na mensagem ao usuário).
  - Contagens reajustadas: Fase 2 10 → 11 · **total 62 → 64**.

- **2026-04-20** — Docs criados. Decisões fechadas:
  - Convite: por email
  - Manager promove até Manager; **OWNER** rebaixa/remove Manager; super admin também
  - OWNER é role separada (billing futuro fica com ele)
  - Project: 1:N (pertence a 1 tenant)
  - API key: tenant-scoped (não user-scoped)
  - Super admin: flag `is_super_admin` em `auth.users.app_metadata`
  - Herança de permissão: tenant → project → engine
  - Audit log: plantado em `AUTHZ_AUDIT_LOG.md`, implementação adiada
  - Soft-delete em todas as entidades (`deleted_at`)
  - PostHog/Sentry como observabilidade (não confundir com audit log) — fica fora desta leva

- **2026-04-20 (ajustes pós-revisão da matriz)** — ⚠️ **SUPERSEDED** pelas entradas "separação primary vs billing owner" e "tenant creation locked to super admin" abaixo. Mantido para histórico.
  - Renomeado `user` → `reader` (nome mais preciso: role read-only; todo membro é "user").
  - **Múltiplos OWNERs por tenant** permitidos. `tenants.owner_id` mantido como **billing owner** único (responsável financeiro); demais owners ficam só em `tenant_members`.
  - **Só super admin** cria/promove/rebaixa OWNER (via PATCH members ou convite com `role='owner'`).
  - **OWNER pode rebaixar/remover MANAGER** (antes estava como "só super admin"; corrigido).
  - **Invariantes server-side:** `CANNOT_DEMOTE_BILLING_OWNER`, `CANNOT_REMOVE_LAST_OWNER`.
  - `transfer-ownership` endpoint mantido; transfere billing owner (`tenants.owner_id`), não cria nem rebaixa OWNER automaticamente.
  - Decidido **não** adotar multi-role/capability matrix — hierarquia única resolve 95% dos casos. Adicionar role novo (ex: `auditor`) fica reservado pra quando a dor aparecer.

- **2026-04-20 (separação primary vs billing owner):**
  - Adicionada coluna `tenants.billing_id` separada de `tenants.owner_id`. Default no create: `owner_id = billing_id = creator`; podem divergir depois.
  - **Primary owner (`tenants.owner_id`)** é quem tem poderes de "dono do tenant" — único que pode criar outros OWNERs (via PATCH ou convite), transferir primary ownership e trocar o billing owner. Super admin também pode, sempre.
  - **Billing owner (`tenants.billing_id`)** é só responsável financeiro. Pode ser qualquer membro (inclusive READER); não dá poderes de gestão sozinho.
  - **OWNER secundário** = row em `tenant_members` com `role='owner'` que **não** é nem `owner_id` nem `billing_id`. Não pode criar outros OWNERs nem alterar primary/billing.
  - Novo endpoint `POST /api/tenants/[id]/billing-owner` (primary owner ou super admin).
  - `transfer-ownership` agora é explicitamente sobre **primary** (`owner_id`); não mexe em `billing_id`.
  - Erros substituídos: `CANNOT_DEMOTE_BILLING_OWNER` → `CANNOT_MODIFY_PRIMARY_OWNER` + `CANNOT_MODIFY_BILLING_OWNER` (duas invariantes separadas). Novos: `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER`, `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER`, `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_INVITE_OWNER`, `ONLY_OWNER_CAN_DEMOTE_MANAGER`.
  - Super admin removendo primary/billing owner precisa passar `newPrimaryOwnerId` / `newBillingId` **explícitos** no payload — não há inferência automática (opção (a)).
  - `TenantSummary` passa a expor `isPrimaryOwner` e `isBillingOwner`; UI mostra badges 👑 Primary / 💳 Billing.

- **2026-04-20 (tenant creation locked to super admin + cascade + RPCs):**
  - **Criação de tenants passa a ser exclusiva do super admin.** `POST /api/tenants` checa `is_super_admin`; recebe `name`, `ownerId`, `billingId` (opcional). User comum que logar sem membership cai em `/no-tenant` (sem CTA de criar).
  - Policy `insert` em `tenants` restringida para `is_super_admin()`.
  - Novas RPCs `plpgsql` atômicas no `db/authz_rpcs.sql`: `create_tenant`, `transfer_primary_ownership`, `set_billing_owner`, `force_remove_primary_owner` — todas `security definer` com checks de autorização.
  - `tenant_invites.role` check atualizado para incluir `'owner'` (convite de OWNER via primary/super admin).
  - Policies RLS de `tenant_invites` adicionadas explicitamente (`select`: reader+; `all`: manager+).
  - **Cascata de soft-delete** via policies: `projects` e `engines` agora joinam com `tenants.deleted_at is null` no `using`/`with check`, garantindo que tenant apagado esconde filhos mesmo com `tenant_id` direto na URL.
  - Restaurar tenant soft-deleted = "peça ao suporte" (super admin via SQL ou UI futura de admin); sem endpoint público nesta leva.
  - Novas páginas previstas na Fase 3: `app/no-tenant/page.tsx` e `app/admin/tenants/new/page.tsx`.

- **2026-04-20 (revisão pós-leitura de todos os docs):**
  - **Decisão:** super admin vê todos os tenants do sistema no `TenantSelector` (opção b) — `GET /api/tenants` detecta `is_super_admin` e retorna visão ampliada; `TenantSummary` ganha flag `isSuperAdminView`; badge "admin" nos tenants em que não é membro real.
  - Super admin sem nenhum tenant no sistema vai direto pra `/admin/tenants/new` (nunca cai em `/no-tenant`).
  - Adicionada rota `/api/tenants/[id]` (GET/PATCH/DELETE) que estava faltando na Fase 3 — era consumida pela página `app/tenants/[id]/settings/page.tsx` sem handler definido.
  - `validateApiKey` passa a filtrar tenant soft-deleted via join em `tenants.deleted_at is null` — cascata da Fase 1 agora também invalida Bearers.
  - Dedupe de critério global sobre primary/billing owner; adicionado critério faltante "apenas primary owner ou super admin troca `billing_id`" do `PLAN`.
  - Cosméticos: `lib/email.ts` MVP via `console.log` documentado como explicitamente aceitável (follow-up pós-MVP); dedupe de `getUser()` no POST `/invites`; total de horas no `PLAN` alinhado (~14-15h).
  - Contagens reajustadas: Fase 2 9→10 · Fase 3 19→22 · **total 58→62**.

- **2026-04-20 (fechamento pré-ACT):**
  - Fase 2 ganha item explícito de atualizar `app/api/calc/[...segments]/route.ts` (branch cookie/bearer + filtro manual por `tenantId`) — antes ficava implícito na tabela de arquivos de `AUTHZ_API_KEYS.md`. Fase 2: 8 → 9.
  - Fase 3 ganha sub-bloco "Settings > API Keys" com a página `app/tenants/[id]/settings/api-keys/page.tsx` (listar/criar/revogar). Fase 3: 17 → 19 (também inclui item de critério global abaixo).
  - Guard defensivo `CANNOT_REMOVE_LAST_OWNER` confirmado como **mantido** (código + critério global), mesmo com a separação primary/billing já cobrindo o caso na prática. Anotado em Fase 3 (DELETE members) e em "Critérios globais".
  - `AUTHZ_PLAN.md §Dependências` atualizado: fases 2 → 3 → 4 são estritamente sequenciais (Fase 3 depende do union `auth.via` de Fase 2). Sem mais "Fases 2/3 paralelas".
  - Contagens reajustadas: **total 55 → 58** (Fase 1: 21 · Fase 2: 9 · Fase 3: 19 · Fase 4: 9).

- **2026-04-20 (consistência entre docs — revisão pós-review):**
  - **Schema unificado de `tenant_invites`** em `AUTHZ_TENANT.md` §1 (inclui `revoked_at`, default de `expires_at`, `invited_by NOT NULL`, unique index `tenant_invites_pending_unique`). `AUTHZ_INVITES.md` §1 agora apenas referencia — TENANT é fonte única da verdade.
  - **Caminho da landing de convite corrigido:** `app/invites/[token]/page.tsx` (bate com `inviteUrl` `/invites/${token}` gerado no POST). Antes o PROGRESS listava `app/invites/accept/page.tsx` com query string.
  - **Tabela "Arquivos alterados" da Fase 1** passou a listar `db/authz_helpers.sql` e `db/authz_rpcs.sql` (antes estavam só no corpo do doc).
  - **Ordem de verificação da Fase 1** inclui `authz_rpcs.sql` (antes ficava implícito).
  - **Fase 1 Routes** expandida: `engines/active`, `engines/[id]`, `projects/[id]` (com soft-delete).
  - **Fase 4 Server** ganhou itens explícitos para `lib/invites.ts` e `lib/email.ts`.
  - **Critérios globais** alinhados com os 15 do `AUTHZ_PLAN.md` (faltavam "OWNER rebaixa MANAGER" e "bloqueio de primary/billing sem transferência").
  - Contagens reajustadas: Fase 1 16→21 · Fase 3 16→17 · Fase 4 8→9 · **total 43 → 55** (superseded — ver entrada "fechamento pré-ACT" acima para o total atual de 58).
