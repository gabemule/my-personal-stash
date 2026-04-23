# AUTHZ Fase 1 — Multi-tenant + RBAC (fundação)

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md)

Fundação. Nada das fases 2-4 funciona sem isso.

## Esforço

~5h.

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `db/authz_tenants.sql` | Criar (schema `tenants`, `tenant_members`, `tenant_invites`) |
| `db/authz_helpers.sql` | Criar (`is_super_admin`, `has_tenant_role`) |
| `db/authz_rpcs.sql` | Criar (RPCs de ownership/member/invite — §RPCs) |
| `db/schema.sql` | Atualizar (`deleted_at` em projects/engines; `tenant_id` em projects; drop uniques de `name`; active-scope indexes) |
| `db/rls.sql` | Reescrever (policies por tenant; revoke de `tenants`/`tenant_members`/`tenant_invites`) |
| `db/migration_authz.sql` | Criar (one-off: tenant default + super admin + backfill) |
| `lib/supabase/admin.ts` | Criar (service-role client) |
| `lib/auth.ts` | Criar (`requireAuth`, `requireUserAuth`; tipos `Auth`, `AuthUser`, `AuthTenantKey`, `AuthFailure`) |
| `lib/tenant.ts` | Criar (`requireTenantRole`, `requireTenantAccess`, tipo `Role`) |
| `lib/session.ts` | Criar (`getSessionContext`; tipos `SessionContext`, `TenantSummary`) |
| `lib/menu.ts` | Criar (`buildMenu`; tipo `MenuItem`) |
| `app/api/session/route.ts` | Criar (GET wrapper HTTP de `getSessionContext`) |
| `app/api/projects/*` (all) | Atualizar (`requireAuth` + `requireTenantRole` + soft-delete + active-scope por tenant) |
| `app/api/engines/*` (all) | Atualizar (idem, escopo por `project.tenant_id`) |
| `app/api/calc/[...segments]/route.ts` | Atualizar (`requireTenantAccess`) |
| `schemas/api.ts` | Atualizar (adicionar schemas Zod de request/response das rotas novas; SSOT) |
| `schemas/endpoints.ts` | Atualizar (registrar endpoints novos) |
| `.env.example` | Adicionar `SUPABASE_SERVICE_ROLE_KEY` |

---

## Schema

### `tenants`

| Coluna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` | |
| `name` | text NOT NULL | | |
| `owner_id` | uuid NOT NULL → `auth.users(id) on delete restrict` | | Primary owner — deleção do user é bloqueada; super admin usa `force_remove_protected_member` primeiro |
| `billing_id` | uuid NOT NULL → `auth.users(id) on delete restrict` | | Default = `owner_id` no create; mesma regra de deleção |
| `created_at` | timestamptz NOT NULL | `now()` | |
| `deleted_at` | timestamptz | | Soft-delete |

Índices: `(owner_id)`, `(billing_id)`.

### `tenant_members`

| Coluna | Tipo | Notas |
|---|---|---|
| `tenant_id` | uuid NOT NULL → `tenants(id) on delete cascade` | PK(tenant_id, user_id) |
| `user_id` | uuid NOT NULL → `auth.users(id) on delete cascade` | |
| `role` | text NOT NULL CHECK in (`owner`,`manager`,`editor`,`reader`) | |
| `created_at` | timestamptz NOT NULL default `now()` | |

Índice: `(user_id)`.

### `tenant_invites`

| Coluna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` | |
| `tenant_id` | uuid NOT NULL → `tenants(id) on delete cascade` | | |
| `email` | text NOT NULL | | normalizado lowercase |
| `role` | text NOT NULL CHECK in (`owner`,`manager`,`editor`,`reader`) | | |
| `token` | text UNIQUE NOT NULL | | sha256 hex do raw (ver `AUTHZ_INVITES.md §Decisões-chave`) |
| `invited_by` | uuid → `auth.users(id) on delete set null` (nullable) | | Preserva histórico de convites mesmo após deleção do autor. Handler garante que está preenchido no momento da criação; `null` só acontece em deleção ex-post. |
| `expires_at` | timestamptz NOT NULL | `now() + interval '7 days'` | |
| `accepted_at` | timestamptz | | |
| `revoked_at` | timestamptz | | |
| `created_at` | timestamptz NOT NULL default `now()` | | |

Índices: `(token)`, `(tenant_id)`, `(email)`.

Unique parcial nomeado `tenant_invites_pending_unique`: `(tenant_id, email) where accepted_at is null and revoked_at is null` — no máximo 1 convite pendente por (tenant, email). Race na criação mapeada para `PENDING_INVITE_EXISTS` **dentro** da RPC `create_invite` via `exception when unique_violation`.

### Alterações em `projects` e `engines`

- `projects`: adicionar `tenant_id uuid NOT NULL references tenants(id)` (nullable durante migration, depois `set not null`), `deleted_at timestamptz`.
- `engines`: adicionar `deleted_at timestamptz`. Herda tenant via `project_id`.
- **`engines.project_id`**: mantém `ON DELETE SET NULL` do schema original. Com soft-delete como padrão do sistema, hard deletes não acontecem pelo produto — o `SET NULL` é aceito como risco residual de SQL direto. Se no futuro for necessário mais rigidez, substituir por `RESTRICT`.
- **Unicidade de nomes** — scoped com filtro de soft-delete:
  - `tenants_name_unique`: `unique (name) where deleted_at is null` em `tenants` — nome de tenant único globalmente entre tenants ativos.
  - `projects_name_tenant_unique`: `unique (tenant_id, name) where deleted_at is null` em `projects` — nome de project único dentro do tenant ativo.
  - `engines_name_project_unique`: `unique (project_id, name) where deleted_at is null` em `engines` — nome de engine único dentro do project. **Requer DROP da constraint original** (`alter table engines drop constraint engines_name_project_unique`) seguido de CREATE INDEX UNIQUE parcial — Postgres não permite `ALTER` de constraint existente para adicionar cláusula `WHERE`.
  - **Drop de** `projects_name_key` (única global de project, substituída pela scoped acima) **e** da constraint `engines_name_project_unique` original (substituída pelo índice parcial acima). Ambas precisam de `DROP CONSTRAINT` explícito antes dos `CREATE UNIQUE INDEX`.
- Active-scope indexes parciais (garantem ativação única via DB, não só via handler):
  - `unique (tenant_id) where is_active = true and deleted_at is null` em `projects` (nome: `projects_one_active_per_tenant`).
  - `unique (project_id) where is_active = true and deleted_at is null` em `engines` (nome: `engines_one_active_per_project`).

---

## Helpers SQL

### `is_super_admin(_caller_id uuid) returns boolean`

Consulta `auth.users.raw_app_meta_data->>'is_super_admin'`. `stable`, `security definer`, `set search_path = ''`.

### `has_tenant_role(_caller_id uuid, _tenant_id uuid, _min_role text) returns boolean`

`true` se caller é super admin OU tem row em `tenant_members` com role ≥ `_min_role`. Hierarquia: `owner > manager > editor > reader`. `stable`, `security definer`, `set search_path = ''`.

### Revocação

```
revoke execute on function is_super_admin(uuid) from public, anon, authenticated;
revoke execute on function has_tenant_role(uuid, uuid, text) from public, anon, authenticated;
```

Revogar só de `anon/authenticated` **não basta** — `PUBLIC` continua com o privilégio herdado por default no `CREATE FUNCTION`.

Policies invocam `auth.uid()` como primeiro arg para o helper (único lugar junto com `lib/auth.ts` onde `auth.uid()` aparece).

---

## RLS — regras por tabela

### `tenants`

- **SELECT**: `is_super_admin(auth.uid()) OR (deleted_at is null AND has_tenant_role(auth.uid(), id, 'reader'))`. Super admin vê **todos** os tenants, incluindo soft-deleted (necessário para restauração e visão operacional). Usuários regulares só veem tenants ativos onde são membros.
- **INSERT/UPDATE/DELETE**: `revoke` total. Mutações só via RPCs `create_tenant`, `rename_tenant`, `transfer_primary_ownership`, `set_billing_owner`, `delete_tenant`, `force_remove_protected_member`.

### `tenant_members`

- **SELECT**: super admin, o próprio user, ou membro `reader+` do tenant.
- **INSERT/UPDATE/DELETE**: `revoke` total. Mutações só via RPCs `change_member_role`, `remove_member`, `accept_invite`, `force_remove_protected_member`, `create_tenant`.

### `tenant_invites`

- **SELECT**: super admin ou `has_tenant_role(_, tenant_id, 'reader')`.
- **INSERT/UPDATE/DELETE**: `revoke` total. Mutações só via `create_invite`, `revoke_invite`, `accept_invite`.

### `projects`

- **SELECT**: `deleted_at is null AND tenant.deleted_at is null AND (super_admin OR has_tenant_role(_, tenant_id, 'reader'))`.
- **ALL** (mutações): `tenant.deleted_at is null AND (super_admin OR has_tenant_role(_, tenant_id, 'editor'))`.

Cascata soft-delete: join em `tenants.deleted_at is null` nos `using`/`with check` — tenant soft-deleted esconde projects mesmo com `tenant_id` direto na URL.

### `engines`

- **SELECT**: `engines.deleted_at is null AND project.deleted_at is null AND tenant.deleted_at is null AND role ≥ reader` no tenant.
- **ALL** (mutações): mesmo com `role ≥ editor`.

---

## Server types (`lib/auth.ts`, `lib/tenant.ts`, `lib/session.ts`, `lib/menu.ts`)

Estas são **fronteiras internas**, não HTTP — ficam como tipos TypeScript (não Zod). Zod é SSOT apenas para schemas de request/response HTTP em `schemas/api.ts`.

### `Auth` (union discriminado)

```ts
type AuthUser = {
  ok: true
  kind: "user"
  userId: string
  isSuperAdmin: boolean
  supabase: SupabaseClient     // sessão authenticated
}

type AuthTenantKey = {           // implementado em Fase 2
  ok: true
  kind: "tenant_key"
  tenantId: string
  role: "reader" | "editor"
  apiKeyId: string
  supabase: SupabaseClient     // service-role (ignora RLS)
}

type AuthFailure = { ok: false; status: 401; error: string }
type Auth = AuthUser | AuthTenantKey
```

### `requireAuth(request): Promise<Auth | AuthFailure>`

Extrator único. Fase 1 só retorna `AuthUser` (via cookie) ou `AuthFailure: UNAUTHENTICATED`. Fase 2 adiciona branch Bearer retornando `AuthTenantKey`.

**Bearer tem prioridade sobre cookie.** Quando ambos estão presentes no mesmo request, o branch Bearer é avaliado primeiro. O custo de `getUser()` no proxy é aceito para rotas fora de `/api/calc/*` (ver `AUTHZ_API_KEYS §Patch em proxy.ts` para o bypass conservador de latência).

### `requireUserAuth(auth: Auth): AuthUser | AuthFailure`

Narrowing para rotas de gestão. Rejeita `kind !== "user"` com `USER_IDENTITY_REQUIRED` (401).

### `Role` e checks

```ts
type Role = "owner" | "manager" | "editor" | "reader"
// rank: reader=1, editor=2, manager=3, owner=4
```

- `requireTenantRole(auth, tenantId, minRole)` — **gestão**. User-only (rejeita `tenant_key`). Super admin passa como `role: "owner"`. Consulta `tenant_members`.
- `requireTenantAccess(auth, tenantId, minRole)` — **dados**. Aceita `user` (delega em `requireTenantRole`) e `tenant_key` (compara `auth.tenantId === tenantId` + hierarquia de `auth.role`).

Ambas retornam `{ ok: true, role } | { ok: false, status: 401|403, error }` com erros: `USER_IDENTITY_REQUIRED`, `NOT_A_MEMBER`, `TENANT_MISMATCH`, `INSUFFICIENT_ROLE`.

### `SessionContext` e `TenantSummary`

```ts
type TenantSummary = {
  id: string
  name: string
  role: Role                    // para super admin em tenant sem membership: "owner" sintético
  isPrimaryOwner: boolean
  isBillingOwner: boolean
  isSuperAdminView: boolean     // true se super admin e NÃO é membro real
  isDeleted: boolean            // true se tenant está soft-deleted (visível apenas ao super admin via RLS)
}

type SessionContext = {
  user: { id: string; email: string | null }
  tenants: TenantSummary[]
  currentTenantId: string | null
  role: Role | null              // role no currentTenantId
  isSuperAdmin: boolean
  menu: MenuItem[]
}
```

`getSessionContext()` (SSR) lê user via `auth.getUser()`, lista `tenants`, determina `currentTenantId` a partir do cookie HTTP-only `next-calc-current-tenant` (fallback: primeiro tenant), e retorna o shape acima ou `null` (não autenticado).

### `MenuItem` e `buildMenu`

```ts
type MenuItem = {
  id: string
  label: string
  href: string                   // com ":tenantId" expandido para o currentTenantId
  section: "main" | "settings" | "admin"
}
```

`buildMenu(role, isSuperAdmin, tenantId)` filtra um array interno de definições por `minRole` (ou `"super_admin"`) e substitui `:tenantId` no `href`.

---

## RPCs (`db/authz_rpcs.sql`)

Convenção geral:
- Todas recebem `_caller_id uuid` + `_caller_is_super_admin boolean` como primeiros parâmetros (exceto onde indicado).
- `security definer`, `set search_path = ''` — `search_path` vazio é mais defensivo contra shadowing de objetos em `public`.
- **Invocadas via `createAdminClient().rpc(...)`** — `execute` é revogado de `public, anon, authenticated`.
- Erros são `raise exception '<CODE>'`; os handlers HTTP mapeiam para status (ver `AUTHZ_RBAC_UI.md §Error mapping`).

Ordem de deploy SQL: `authz_tenants.sql` → `schema.sql` (alter) → `authz_helpers.sql` → `authz_rpcs.sql` → `rls.sql` → `migration_authz.sql`.

### `create_tenant(_caller_id, _caller_is_super_admin, _name, _owner_id, _billing_id default null) returns uuid`

- Apenas super admin. Cria row em `tenants` + memberships iniciais em `tenant_members` (owner + billing se diferente) atomicamente. Ambos recebem `role='owner'`.
- Erros: `ONLY_SUPER_ADMIN_CAN_CREATE_TENANT`.

### `rename_tenant(_caller_id, _caller_is_super_admin, _tenant_id, _new_name) returns void`

- Super admin ou qualquer OWNER do tenant (primary ou secundário).
- Erros: `NAME_REQUIRED`, `TENANT_NOT_FOUND`, `INSUFFICIENT_ROLE`, `TENANT_NAME_TAKEN` (captura `unique_violation` 23505 do unique index `tenants_name_unique`).

### `delete_tenant(_caller_id, _caller_is_super_admin, _tenant_id) returns void`

- Super admin ou primary owner. Seta `deleted_at = now()`.
- Opcionalmente revoga convites pendentes (`update tenant_invites set revoked_at = now() where tenant_id = _tenant_id and accepted_at is null and revoked_at is null`) para evitar aceite em tenant morto.
- Erros: `TENANT_NOT_FOUND`, `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT`.

### `transfer_primary_ownership(_caller_id, _caller_is_super_admin, _tenant_id, _new_owner_id) returns void`

- Super admin ou primary owner atual.
- `_new_owner_id` **precisa já ter** `role='owner'` em `tenant_members` (promoção prévia separada). Caller antigo permanece como OWNER secundário.
- Erros: `TENANT_NOT_FOUND`, `NOT_AUTHORIZED`, `NEW_OWNER_NOT_OWNER_ROLE`.

### `set_billing_owner(_caller_id, _caller_is_super_admin, _tenant_id, _user_id) returns void`

- Super admin ou primary owner atual.
- `_user_id` precisa ter `role='owner'`.
- Erros: `TENANT_NOT_FOUND`, `NOT_AUTHORIZED`, `USER_NOT_OWNER_ROLE`.

### `force_remove_protected_member(_caller_id, _caller_is_super_admin, _tenant_id, _target_user_id, _new_primary_id, _new_billing_id default null) returns void`

> **Nota:** O nome cobre tanto remoção de primary owner quanto de billing owner (caso billing ≠ primary). "Protected" porque o target é um user com proteção especial (`owner_id` ou `billing_id`).

- Apenas super admin.
- Se `_target_user_id = tenants.billing_id`, `_new_billing_id` é obrigatório (sem fallback implícito).
- Promove `_new_primary_id` (e `_new_billing_id` se divergir) a `role='owner'` antes de atualizar `tenants` e remover a membership antiga. Tudo atômico.
- Erros: `ONLY_SUPER_ADMIN_CAN_FORCE_REMOVE`, `NEW_PRIMARY_SAME_AS_TARGET`, `TENANT_NOT_FOUND`, `NEW_BILLING_ID_REQUIRED`.

> Invocada via handler tanto para remoção de primary owner quanto de billing owner (≠ primary). O handler resolve qual dos casos é antes de chamar a RPC.

### `change_member_role(_caller_id, _caller_is_super_admin, _tenant_id, _user_id, _new_role) returns void`

Concentra todas as regras de promoção/rebaixamento (matriz em `AUTHZ_RBAC_UI.md`).

**Locking:** antes de avaliar qualquer guard, a RPC adquire lock exclusivo nas rows de `tenant_members` do tenant (`SELECT … FOR UPDATE`). Isso serializa escritas concorrentes e elimina a race condition no guard `CANNOT_REMOVE_LAST_OWNER`.

Gate resumido:
- Caller precisa ser manager+ (ou super admin).
- Rebaixar/mexer em `role='owner'` existente ou promover para `owner`: apenas primary owner ou super admin.
- Rebaixar `role='manager'`: apenas OWNER (qualquer) ou super admin.
- Row que é `owner_id` ou `billing_id` **não pode** ser rebaixada aqui (usar transfer/billing).
- **Guard defensivo `CANNOT_REMOVE_LAST_OWNER`:** se a mudança rebaixa um `role='owner'` para qualquer role inferior e o tenant ficaria sem nenhum outro OWNER, abortar. Hoje a invariante é mantida por acidente (primary owner sempre existe e é protegido por `CANNOT_MODIFY_PRIMARY_OWNER`), mas o guard blinda o caso futuro em que alguém relaxe outras regras. Simétrico ao guard de `remove_member`.

Erros: `INVALID_ROLE`, `TENANT_NOT_FOUND`, `INSUFFICIENT_ROLE`, `TARGET_NOT_A_MEMBER`, `CANNOT_MODIFY_PRIMARY_OWNER`, `CANNOT_MODIFY_BILLING_OWNER`, `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER`, `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER`, `ONLY_OWNER_CAN_DEMOTE_MANAGER`, `CANNOT_REMOVE_LAST_OWNER`.

### `remove_member(_caller_id, _caller_is_super_admin, _tenant_id, _user_id) returns void`

Mesma hierarquia de autorização do `change_member_role`. Bloqueia remoção de primary/billing owner (usar `force_remove_protected_member` via super admin). Guard defensivo `CANNOT_REMOVE_LAST_OWNER`. **Self-removal não é suportada** — `_user_id = _caller_id` é rejeitado (exceto super admin removendo a si mesmo de tenant onde não é primary/billing). User que quiser sair de um tenant deve pedir a um manager+ que o remova.

**Locking:** idem `change_member_role` — lock exclusivo nas rows `tenant_members` do tenant antes dos guards.

Erros: `TENANT_NOT_FOUND`, `INSUFFICIENT_ROLE`, `TARGET_NOT_A_MEMBER`, `CANNOT_MODIFY_PRIMARY_OWNER`, `CANNOT_MODIFY_BILLING_OWNER`, `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER`, `ONLY_OWNER_CAN_DEMOTE_MANAGER`, `CANNOT_REMOVE_LAST_OWNER`.

### `create_invite(_caller_id, _caller_is_super_admin, _tenant_id, _email, _role, _token, _force default false) returns uuid`

> `_token` recebe o **sha256 hex** do raw token — nunca o raw em si. O handler chama `hashInviteToken(rawToken)` antes de invocar a RPC. O raw nunca trafega para o banco nem aparece em query logs do Postgres.

- Caller: manager+ ou super admin.
- Se `_role = 'owner'`: apenas primary owner ou super admin.
- Se já existe convite pendente pra `(tenant, email)` e `_force = false` → `PENDING_INVITE_EXISTS`. Com `_force = true`, revoga o anterior e insere o novo atomicamente.
- **Captura `unique_violation` (SQLSTATE 23505)** no INSERT final e converte para `PENDING_INVITE_EXISTS` — fecha a race entre o SELECT de pending e o INSERT em POSTs concorrentes.
- Email normalizado para lowercase.
- Retorna o `id` (uuid) do convite criado.

Erros: `INVALID_ROLE`, `TENANT_NOT_FOUND`, `INSUFFICIENT_ROLE`, `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_INVITE_OWNER`, `PENDING_INVITE_EXISTS`.

### `revoke_invite(_caller_id, _caller_is_super_admin, _tenant_id, _invite_id) returns void`

- Caller: manager+ ou super admin.
- Idempotente (já revogado/aceito → no-op).
- Erros: `INVITE_NOT_FOUND`, `INSUFFICIENT_ROLE`.

### `accept_invite(_caller_id, _caller_email, _invite_id) returns uuid` (tenant_id)

Recebe email autenticado do caller (não `_caller_is_super_admin` — aceite não tem privilégio admin).

**Locking:** quando o role do invite é `owner`, a RPC adquire lock exclusivo nas rows `tenant_members` do tenant antes dos guards (mesmo mecanismo de `change_member_role` e `remove_member`), para serializar um aceite de owner simultâneo com uma remoção.

Validações dentro da transação:
1. Invite existe, `accepted_at is null`, `revoked_at is null`, `expires_at > now()`. Senão `INVITE_NOT_USABLE`.
2. **Tenant do invite tem `deleted_at is null`**. Senão `INVITE_NOT_USABLE`. (Evita aceitar em tenant soft-deleted.)
3. `lower(invite.email) = lower(_caller_email)`. Senão `INVITE_NOT_USABLE`.
4. Se caller é `tenants.owner_id` e `invite.role <> 'owner'` → `CANNOT_MODIFY_PRIMARY_OWNER`.
5. Se caller é `tenants.billing_id` e `invite.role <> 'owner'` → `CANNOT_MODIFY_BILLING_OWNER`.

Antes do upsert, se o membro já existe e o role do convite é **inferior** ao role atual → `INVITE_WOULD_DEMOTE_MEMBER`. Isso fecha o bypass pelo qual um MANAGER poderia rebaixar um secondary OWNER via convite (algo impossível via `change_member_role`). Upsert em `tenant_members` e marca `accepted_at = now()`. Retorna `tenant_id`.

Erros: `INVITE_NOT_USABLE`, `CANNOT_MODIFY_PRIMARY_OWNER`, `CANNOT_MODIFY_BILLING_OWNER`, `INVITE_WOULD_DEMOTE_MEMBER`.

### Revocação de execute

Todas as RPCs acima: `revoke execute on function <name>(<signature>) from public, anon, authenticated;`. Handler HTTP invoca via `createAdminClient().rpc(...)` passando `_caller_id` + `_caller_is_super_admin` extraídos do `requireAuth`.

---

## Endpoints — contratos

Request/response schemas vivem em `schemas/api.ts` (Zod, SSOT). Aqui só a tabela de alto nível.

| Método + path | Auth | Request | Response | Erros (status · code) |
|---|---|---|---|---|
| `GET /api/session` | user | — | `SessionContext` | 401 `UNAUTHENTICATED` |
| `POST /api/projects` | user, editor+ | `{ tenantId, name, isActive? }` | `Project` | 401 `USER_IDENTITY_REQUIRED`, 403 `NOT_A_MEMBER`/`INSUFFICIENT_ROLE`, 400 `TENANT_AND_NAME_REQUIRED` |
| `GET /api/projects?tenantId=` | user, reader+ | — | `Project[]` | — |
| `PATCH /api/projects/[id]` | user, editor+ do tenant | `{ name? }` | `Project` | — |
| `DELETE /api/projects/[id]` | user, editor+ | — | `{ ok: true }` (soft) | — |
| `POST /api/projects/[id]/activate` | user, editor+ do tenant | — | `{ ok: true }` | 404 `NOT_FOUND` |
| `GET /api/projects/active?tenantId=` | user | — | `Project` | 404 |
| `POST /api/engines/[id]/activate` | user, editor+ do tenant do project | — | `{ ok: true }` | 404 |
| demais engines/* | user (reader+/editor+) | conforme `schemas/api.ts` | conforme | — |
| `POST /api/calc/[...segments]` | user OU tenant_key (reader+) | `CalcRequest` | `CalcResponse` | 404 `ENGINE_NOT_FOUND`, 403 `TENANT_MISMATCH`/`INSUFFICIENT_ROLE` |

### Active-scope: ativação escopada por tenant/project

Handler do `POST /api/projects/[id]/activate`:
1. Resolve `tenant_id` do project alvo (404 se não existe).
2. `requireTenantRole(auth, project.tenant_id, "editor")`.
3. `update projects set is_active = false where tenant_id = <project.tenant_id> and is_active = true and id <> <target>`.
4. `update projects set is_active = true where id = <target>`. Se unique `projects_one_active_per_tenant` disparar (race com outro ACTIVATE concorrente), trata como sucesso idempotente.

Mesmo pattern em `POST /api/engines/[id]/activate` (escopo por `project_id`).

---

## Cookie de tenant atual

`next-calc-current-tenant` — HTTP-only, setado por `POST /api/session/current-tenant` (Fase 3) com `{ tenantId }`. Validação: user precisa ser membro (exceto super admin). `getSessionContext()` lê; se o cookie aponta pra tenant inválido, fallback pro primeiro da lista.

---

## Migration one-off (`db/migration_authz.sql`)

Não é idempotente. Rodar cada passo individualmente substituindo placeholders.

**Step 0 (verificação pré-migration):** verificar engines órfãos antes de prosseguir:
`select id, name from engines where project_id is null;`
Se retornar rows, decidir o destino de cada engine (associar a um project ou deletar) antes de aplicar o RLS novo — engines sem `project_id` ficam invisíveis para todos (exceto via service-role) após a RLS entrar em vigor.

1. `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"is_super_admin": true}'::jsonb where id = '<super-admin-user-id>';`
2. `insert into tenants (name, owner_id, billing_id) values ('Default', '<user-id>', '<user-id>') returning id;` — guardar `<tenant-id>`.
3. `insert into tenant_members (tenant_id, user_id, role) values ('<tenant-id>', '<user-id>', 'owner');`
4. `update projects set tenant_id = '<tenant-id>' where tenant_id is null;`
5. `alter table projects alter column tenant_id set not null;`

---

## Env

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # secret; server-only; usado em createAdminClient()
```

---

## Verificação

1. Rodar SQL na ordem documentada em §RPCs.
2. Promover super admin via SQL e relogar (JWT refresh).
3. Isolamento: User A (tenant Acme) vê só Acme; User B (tenant Foo) não vê Acme; super admin vê ambos.
4. Soft-delete project: `DELETE /api/projects/:id` popula `deleted_at`; `GET /api/projects` não retorna.
5. Cascata soft-delete: `update tenants set deleted_at = now()` esconde projects/engines mesmo com `tenant_id` direto.
6. 401/403: rota de dados sem cookie → 401 `UNAUTHENTICATED`; READER em rota editor+ → 403 `INSUFFICIENT_ROLE`.
7. Simetria R↔E via `change_member_role`: MANAGER promove READER → EDITOR (sucesso); MANAGER rebaixa EDITOR → READER (sucesso).
8. Helpers protegidos: `rpc('has_tenant_role', ...)` via client authenticated → permission denied.
9. RPCs protegidas: `rpc('change_member_role', ...)` / `create_tenant` / `create_invite` via authenticated → permission denied. Só admin client invoca.
10. Mutações bloqueadas: `insert/update/delete` direto em `tenants`/`tenant_invites` via authenticated → erro de RLS.
11. `GET /api/session` retorna `{ user, tenants, currentTenantId, role, isSuperAdmin, menu }`; cada `TenantSummary` tem `role`.
12. Active-scope: users em tenants distintos mantêm seus próprios ativos; `insert` de dois ativos no mesmo tenant via SQL falha com unique violation `projects_one_active_per_tenant`.
13. `accept_invite` contra tenant soft-deleted → `INVITE_NOT_USABLE`.
14. Rebaixar o último OWNER via `change_member_role` → 409 `CANNOT_REMOVE_LAST_OWNER` (guard defensivo).

---

## Observações

- **Super admin é "sempre autenticado":** a flag em `app_metadata` concede tudo via `is_super_admin(auth.uid())` em RLS e `_caller_is_super_admin=true` nas RPCs.
- **Super admin view no selector:** RLS permite super admin ler **todos** os tenants (incluindo soft-deleted). `GET /api/tenants` (Fase 3) usa admin client sem filtro de `deleted_at` para o super admin; user regular filtra `deleted_at is null`. Tenants soft-deleted aparecem como muted/não-selecionáveis no selector (ver `AUTHZ_RBAC_UI §TenantSelector`).
- **`app_metadata` precisa de relogin** para refletir no JWT. `is_super_admin(_caller_id)` consulta `auth.users` direto, então vale imediatamente; mas qualquer uso de `auth.jwt()` só vê a mudança após novo login.
- **RLS não substitui validação de negócio** ("manager não rebaixa manager" etc.) — isso fica nas RPCs e em `lib/tenant.ts`.
- **`members.GET` não lê `auth.users` via sessão** — schema `auth` não é navegável via PostgREST. Usar `createAdminClient()` só para o join de email/metadata de membros, ou manter `public.profiles` denormalizada. Decidido em `AUTHZ_RBAC_UI.md §Members listing`.
- **`lib/supabase/admin.ts` deve importar `server-only`** (pacote Next.js) como primeira declaração do arquivo — garante erro de build se importado acidentalmente em Client Component, evitando exposição do `SUPABASE_SERVICE_ROLE_KEY` no bundle.
- **Testes automatizados** não estão neste escopo — verificação é smoke manual na lista acima.
- **`getSessionContext` latência:** chamado em toda SSR de `(authed)/layout.tsx`; potencialmente 3+ round-trips. Se latência incomodar, candidato a `React.cache` (memoiza por request no mesmo RSC tree) — sem impacto em segurança.
- **Super admin management (grant/revoke):** via SQL direto — `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"is_super_admin": true}'::jsonb WHERE id = '<id>'`. Requer relogin do usuário afetado para refletir no JWT (RLS já reflete imediatamente via `is_super_admin()` que lê `auth.users` direto).
