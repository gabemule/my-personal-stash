# AUTHZ Fase 1 — Multi-tenant + RBAC (fundação)

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md)

## Context

Hoje o RLS é `authenticated full access` — qualquer user logado vê/edita tudo. Precisamos introduzir o conceito de **tenant** (isolamento) + **roles** (permissões dentro do tenant).

Esta fase é a **fundação**. Nada das fases 2-4 funciona sem isso.

## Esforço: médio-grande (~5h)

## Decisões-chave

- **Super admin**: flag `is_super_admin: true` em `auth.users.app_metadata`, consumida via `auth.jwt()`. Primeiro super admin setado via SQL.
- **4 roles por tenant**: `owner` > `manager` > `editor` > `reader`. Tenant pode ter **≥ 1 OWNER** (múltiplos permitidos).
  - `reader` = read-only (nome mais preciso que "user"; todo membro é "user" — só esse role é especificamente somente-leitura).
- **Dois "ownerships" em colunas separadas:**
  - `tenants.owner_id` → **primary owner** (dono canônico do tenant; poder máximo dentro dele).
  - `tenants.billing_id` → **billing owner** (responsável financeiro; recebe invoice).
  - No momento da criação: `owner_id = billing_id = creator`. Depois podem divergir.
- **Secondary owners:** qualquer row `role='owner'` em `tenant_members` que não é nem `owner_id` nem `billing_id`. Têm poder de OWNER, **mas não podem** convidar outros OWNERs, definir billing, ou transferir primary.
- **Quem pode criar novo OWNER:** super admin OU primary owner (`owner_id`). Ninguém mais.
- **Invariantes (protegidas por código server-side):**
  - (a) `owner_id` e `billing_id` sempre existem em `tenant_members` com `role='owner'`.
  - (b) Não se pode rebaixar/remover o user apontado por `owner_id` → transferir primary antes (`CANNOT_MODIFY_PRIMARY_OWNER`).
  - (c) Não se pode rebaixar/remover o user apontado por `billing_id` → trocar `billing_id` antes (`CANNOT_MODIFY_BILLING_OWNER`).
  - (d) Super admin forçando remoção do primary/billing precisa passar `newPrimaryOwnerId` / `newBillingId` na mesma operação (explícito, sem eleição automática).
- **Project → 1 tenant** (N:N fica pra migração futura se precisar).

- **Engine → herda** do tenant do project.
- **Soft-delete** em `tenants`, `projects`, `engines` (`deleted_at timestamptz`). Tenant soft-delete só por **primary owner** ou **super admin** (`ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT`).
- **Helpers SQL com caller explícito:** `has_tenant_role(_caller_id, _tenant_id, _min_role)` e `is_super_admin(_caller_id)`. O caller **nunca** é inferido via `auth.uid()` dentro de helpers/RPCs — é sempre passado como argumento. Isso concentra o acoplamento com Supabase Auth em apenas dois lugares: `db/rls.sql` (policies) e `lib/auth.ts` (extração do caller no handler). Portabilidade: migrar pra Postgres+outro auth = trocar o extrator; RPCs e helpers rodam inalterados.
- **Discriminator de identidade:** `requireAuth` retorna `kind: "user" | "tenant_key"` (não `via: "cookie" | "bearer"`). Separa *quem* é o caller do *como* o request chegou. Rotas de gestão exigem `kind === "user"` e respondem `USER_IDENTITY_REQUIRED` pra `tenant_key`.


## Arquivos alterados

| Arquivo | Ação | Descrição |
|---|---|---|
| `db/authz_tenants.sql` | Criar | Schema de tenants, tenant_members, tenant_invites |
| `db/authz_helpers.sql` | Criar | `is_super_admin()`, `has_tenant_role()` (§3) |
| `db/authz_rpcs.sql` | Criar | RPCs atômicas de ownership (§11) |
| `db/schema.sql` | Atualizar | `deleted_at` em projects/engines + `tenant_id` em projects |
| `db/rls.sql` | Reescrever | Policies usando `has_tenant_role` |
| `db/migration_authz.sql` | Criar | Migration one-off: tenant default + super admin + backfill |
| `lib/supabase/admin.ts` | Criar | Service-role client (bypassa RLS) |
| `lib/auth.ts` | Criar | `requireAuth(request)` — retorna `{ kind: "user", userId, isSuperAdmin, supabase }` ou 401 (Fase 2 adiciona `kind: "tenant_key"`) |
| `lib/tenant.ts` | Criar | `requireTenantRole(auth, tenantId, minRole)` — **user-identity only** (aceita só `kind: "user"`); valida role via `tenant_members` |

| `lib/session.ts` | Criar | `getSessionContext()` — helper SSR (§12) que retorna `{ user, tenants, currentTenantId, role, isSuperAdmin, menu }` |
| `lib/menu.ts` | Criar | `buildMenu(role, isSuperAdmin, tenantId)` — definição central do menu + filtro por role |
| `app/api/session/route.ts` | Criar | Wrapper HTTP de `getSessionContext()` (para trocas client-side) |
| `app/api/projects/route.ts` | Atualizar | `requireAuth` + validar `tenantId` no POST |
| `app/api/projects/[id]/route.ts` | Atualizar | `requireAuth` + PATCH (rename) + soft-delete no DELETE |
| `app/api/projects/active/route.ts` | Atualizar | `requireAuth` + tenant check |
| `app/api/projects/[id]/activate/route.ts` | Atualizar | `requireAuth` + tenant check |
| `app/api/projects/[id]/engines/route.ts` | Atualizar | `requireAuth` + tenant check |
| `app/api/projects/[id]/engines/active/route.ts` | Atualizar | `requireAuth` + tenant check |
| `app/api/engines/route.ts` | Atualizar | Validar acesso ao tenant do project |
| `app/api/engines/active/route.ts` | Atualizar | `requireAuth` + tenant check |
| `app/api/engines/[id]/route.ts` | Atualizar | `requireAuth` + soft-delete |
| `app/api/engines/[id]/activate/route.ts` | Atualizar | `requireAuth` + tenant check |
| `app/api/calc/[...segments]/route.ts` | Atualizar | Validar acesso |
| `schemas/api.ts` | Atualizar | Adicionar `TenantSummary`, `MenuItem`, `SessionContext`; atualizar `ProjectSchema` (+`tenant_id`) e `EngineRecordSchema` conforme novas colunas |
| `schemas/endpoints.ts` | Atualizar | Registrar `GET /api/session` + endpoints de tenants/members/transfer-ownership/billing-owner |
| `.env.example` | Atualizar | `SUPABASE_SERVICE_ROLE_KEY` |

## 1. SQL — `db/authz_tenants.sql`

```sql
-- =========================================================================
-- AUTHZ Fase 1 — Schema de tenants + RBAC
-- Rodar ANTES de db/migration_authz.sql
-- =========================================================================

create table tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references auth.users(id),   -- primary owner
  billing_id uuid not null references auth.users(id),   -- billing owner (default = owner_id)
  created_at timestamptz not null default now(),
  deleted_at timestamptz                                 -- soft-delete
);

create index tenants_owner_idx   on tenants(owner_id);
create index tenants_billing_idx on tenants(billing_id);

create table tenant_members (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner', 'manager', 'editor', 'reader')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index tenant_members_user_idx on tenant_members(user_id);

-- Invites — detalhado em AUTHZ_INVITES.md; tabela criada aqui para FK consistency.
-- Schema completo (com revoked_at + unique index pending) definido já na Fase 1
-- porque a Fase 4 assume todos esses campos.
create table tenant_invites (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('owner', 'manager', 'editor', 'reader')),
  token       text unique not null,
  invited_by  uuid not null references auth.users(id),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index tenant_invites_token_idx  on tenant_invites(token);
create index tenant_invites_tenant_idx on tenant_invites(tenant_id);
create index tenant_invites_email_idx  on tenant_invites(email);

-- Garante no máximo 1 convite pendente por (tenant, email).
-- Fluxo de reconvite: marcar revoked_at no anterior antes de inserir o novo
-- (ver AUTHZ_INVITES.md §4, branch `force=true`).
create unique index tenant_invites_pending_unique
  on tenant_invites(tenant_id, email)
  where accepted_at is null and revoked_at is null;
```

> **Policies de `tenant_invites`** ficam na seção §4 (RLS) junto das demais.
> O `role='owner'` é aceito pelo check, mas o **gate de quem pode inserir com `role='owner'`** (primary owner ou super admin) é validado no server — ver `AUTHZ_INVITES.md` §4.

## 2. SQL — atualizar `db/schema.sql`

Adicionar soft-delete + tenant_id e **remover as unique constraints em `name`**:

```sql
alter table projects add column tenant_id uuid references tenants(id);
alter table projects add column deleted_at timestamptz;
alter table engines  add column deleted_at timestamptz;

-- Drop dos uniques de name — projects e engines são identificados por `id`.
-- Nomes de display podem colidir entre tenants (ou até dentro do mesmo)
-- sem prejuízo, já que toda referência cruzada no código usa UUID.
alter table projects drop constraint if exists projects_name_key;
alter table engines  drop constraint if exists engines_name_project_unique;

create index projects_tenant_idx on projects(tenant_id) where deleted_at is null;
create index projects_active_idx on projects(deleted_at) where deleted_at is null;
create index engines_active_idx  on engines(deleted_at) where deleted_at is null;

-- Active-scope: no máximo 1 project ativo por tenant, no máximo 1 engine
-- ativo por project. Unique index parcial garante que um race condition
-- (dois ACTIVATEs simultâneos) falha com conflict em vez de deixar 2 ativos.
-- O handler trata como "retry" — o outro já ativou.
create unique index projects_one_active_per_tenant
  on projects(tenant_id)
  where is_active = true and deleted_at is null;

create unique index engines_one_active_per_project
  on engines(project_id)
  where is_active = true and deleted_at is null;
```

> `tenant_id` começa nullable. A migration (seção 4) faz backfill e depois aplica NOT NULL.
> O `db/schema.sql` base (para setups novos) também deixa de declarar `unique` em `projects.name` e o `constraint engines_name_project_unique`.
> Os unique indexes parciais de active-scope funcionam mesmo com `is_active` já existindo nas tabelas (criados em ALTER, não em CREATE) — a migration (§5) zera `is_active` antes de aplicar se houver histórico inconsistente.

## 3. SQL — helpers (`db/authz_helpers.sql`)

**Decisão-chave (portabilidade):** helpers recebem `_caller_id` explícito e
**nunca** chamam `auth.uid()` / `auth.jwt()` internamente. Toda a inferência
do caller fica concentrada em dois lugares:

1. **`db/rls.sql`** — policies passam `auth.uid()` como argumento.
2. **`lib/auth.ts`** — extrai `userId` + `isSuperAdmin` do request no server.

As RPCs (§11) recebem `_caller_id uuid` + `_caller_is_super_admin boolean`
do handler, sem reconsultar. Migrar pra Postgres puro + outro provider de
auth = trocar só o extrator em `lib/auth.ts` e o `auth.uid()` das policies;
helpers e RPCs rodam inalterados.

```sql
-- =========================================================================
-- Helpers de permissão
-- =========================================================================

-- Super admin: consulta direta em auth.users (fonte da verdade).
-- Recebe `_caller_id` explícito — não usa auth.uid() / auth.jwt() internamente.
create or replace function public.is_super_admin(_caller_id uuid)
  returns boolean
  language sql stable security definer set search_path = public
as $$
  select coalesce(
    (raw_app_meta_data->>'is_super_admin')::boolean,
    false
  )
  from auth.users
  where id = _caller_id;
$$;

-- Verifica se `_caller_id` tem role >= _min_role no tenant.
-- Hierarquia: owner > manager > editor > reader.
-- Super admin bypassa a hierarquia (via is_super_admin(_caller_id)).
create or replace function public.has_tenant_role(
  _caller_id uuid,
  _tenant_id uuid,
  _min_role  text
) returns boolean
  language sql stable security definer set search_path = public
as $$
  select
    is_super_admin(_caller_id)
    or exists (
      select 1 from tenant_members tm
      where tm.tenant_id = _tenant_id
        and tm.user_id = _caller_id
        and case _min_role
          when 'reader'  then tm.role in ('owner','manager','editor','reader')
          when 'editor'  then tm.role in ('owner','manager','editor')
          when 'manager' then tm.role in ('owner','manager')
          when 'owner'   then tm.role = 'owner'
        end
    );
$$;

-- Funções security definer são chamadas implicitamente pelas policies RLS
-- (rodam como owner do schema). Revogamos execute de anon/authenticated
-- para que ninguém consiga invocá-las via PostgREST (`supabase.rpc(...)`)
-- passando um `_caller_id` arbitrário e inferir memberships de terceiros.
revoke execute on function public.is_super_admin(uuid) from anon, authenticated;
revoke execute on function public.has_tenant_role(uuid, uuid, text) from anon, authenticated;
```

## 4. SQL — `db/rls.sql` (reescrita)

> **Único lugar** da base onde `auth.uid()` aparece. Todas as chamadas aos
> helpers passam `auth.uid()` como `_caller_id`. Isso torna o modelo portável
> pra Postgres puro: basta trocar `auth.uid()` pela fonte de identidade
> correspondente (ex: `current_setting('app.caller_id')::uuid` setado pelo
> middleware).

```sql
-- =========================================================================
-- RLS — substitui o "authenticated full access" anterior
-- =========================================================================

alter table tenants         enable row level security;
alter table tenant_members  enable row level security;
alter table tenant_invites  enable row level security;
alter table projects        enable row level security;
alter table engines         enable row level security;

-- ---------- TENANTS ----------
drop policy if exists "authenticated full access" on tenants;

create policy "members see own tenants" on tenants
  for select to authenticated
  using (
    deleted_at is null
    and (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), id, 'reader'))
  );

create policy "owners update tenant" on tenants
  for update to authenticated
  using (has_tenant_role(auth.uid(), id, 'owner'))
  with check (has_tenant_role(auth.uid(), id, 'owner'));

-- SOMENTE super admin cria tenants. `owner_id` e `billing_id` são definidos
-- pelo super admin no payload (ambos podem apontar para usuários distintos).
-- Após a criação, o super admin precisa inserir uma row em `tenant_members`
-- com role='owner' para cada um (ou usar a RPC `create_tenant` — ver §11).
create policy "super admin creates tenant" on tenants
  for insert to authenticated
  with check (is_super_admin(auth.uid()));

create policy "owners soft-delete tenant" on tenants
  for delete to authenticated
  using (false);  -- hard-delete nunca; soft via UPDATE deleted_at

-- ---------- TENANT_MEMBERS ----------
create policy "members read own membership" on tenant_members
  for select to authenticated
  using (
    is_super_admin(auth.uid())
    or user_id = auth.uid()
    or has_tenant_role(auth.uid(), tenant_id, 'reader')
  );

-- Mutações em tenant_members acontecem EXCLUSIVAMENTE via as RPCs do §11
-- (`change_member_role`, `remove_member`, `accept_invite`). Isso concentra
-- as invariantes (CANNOT_MODIFY_PRIMARY_OWNER, ONLY_OWNER_CAN_DEMOTE_MANAGER,
-- etc.) num único lugar e impede que outro consumer (PostgREST direto,
-- futuro GraphQL) burle as regras.
--
-- Authenticated NÃO tem insert/update/delete direto na tabela.
-- Super admin usa as mesmas RPCs — elas recebem `_caller_is_super_admin`
-- explícito do handler (ver §11).
revoke insert, update, delete on tenant_members from anon, authenticated;
-- (SELECT continua permitido pela policy acima.)


-- ---------- TENANT_INVITES ----------
-- SELECT: qualquer membro do tenant (reader+) pode ver convites pendentes.
-- ALL   : manager+ pode inserir/atualizar/deletar.
-- (Gate de role='owner' no insert é validado no server — ver AUTHZ_INVITES.md.)
create policy "members read invites" on tenant_invites
  for select to authenticated
  using (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), tenant_id, 'reader'));

create policy "managers manage invites" on tenant_invites
  for all to authenticated
  using (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), tenant_id, 'manager'))
  with check (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), tenant_id, 'manager'));

-- ---------- PROJECTS ----------
-- Cascata soft-delete: se o tenant está soft-deleted (tenants.deleted_at IS NOT NULL),
-- os projects ficam inacessíveis mesmo que projects.deleted_at seja NULL.
drop policy if exists "authenticated full access" on projects;

create policy "tenant members see projects" on projects
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from tenants t
      where t.id = projects.tenant_id
        and t.deleted_at is null
    )
    and (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), tenant_id, 'reader'))
  );

create policy "editors manage projects" on projects
  for all to authenticated
  using (
    exists (
      select 1 from tenants t
      where t.id = projects.tenant_id
        and t.deleted_at is null
    )
    and (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), tenant_id, 'editor'))
  )
  with check (
    exists (
      select 1 from tenants t
      where t.id = projects.tenant_id
        and t.deleted_at is null
    )
    and (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), tenant_id, 'editor'))
  );

-- ---------- ENGINES ----------
-- Mesma cascata: tenant soft-deleted => engine inacessível.
drop policy if exists "authenticated full access" on engines;

create policy "engines follow project tenant" on engines
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from projects p
      join tenants t on t.id = p.tenant_id
      where p.id = engines.project_id
        and p.deleted_at is null
        and t.deleted_at is null
        and (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), p.tenant_id, 'reader'))
    )
  );

create policy "editors manage engines" on engines
  for all to authenticated
  using (
    exists (
      select 1 from projects p
      join tenants t on t.id = p.tenant_id
      where p.id = engines.project_id
        and t.deleted_at is null
        and (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), p.tenant_id, 'editor'))
    )
  )
  with check (
    exists (
      select 1 from projects p
      join tenants t on t.id = p.tenant_id
      where p.id = engines.project_id
        and t.deleted_at is null
        and (is_super_admin(auth.uid()) or has_tenant_role(auth.uid(), p.tenant_id, 'editor'))
    )
  );
```

## 5. SQL — Migration one-off `db/migration_authz.sql`

Rodar **depois** dos SQLs anteriores.

```sql
-- =========================================================================
-- Migration — traz dados existentes para o modelo multi-tenant
-- =========================================================================

-- 1. Promover o primeiro user (você) a super admin
-- Descobrir o id: select id, email from auth.users order by created_at limit 1;
-- Depois rodar com o UUID correto:
-- update auth.users set raw_app_meta_data = raw_app_meta_data || '{"is_super_admin": true}'::jsonb
-- where id = '<seu-user-id>';

-- 2. Criar tenant default apontando para o super admin
--    (primary owner = billing owner no início)
insert into tenants (name, owner_id, billing_id)
select 'Default', id, id from auth.users where id = '<seu-user-id>'
returning id;
-- guardar o tenant_id retornado

-- 3. Adicionar super admin como owner do tenant default
insert into tenant_members (tenant_id, user_id, role)
values ('<default-tenant-id>', '<seu-user-id>', 'owner');

-- 4. Backfill — todos os projects órfãos vão pro tenant default
update projects set tenant_id = '<default-tenant-id>' where tenant_id is null;

-- 5. Agora sim, NOT NULL
alter table projects alter column tenant_id set not null;
```

> **Nota:** rodar cada passo individualmente no SQL Editor, substituindo os placeholders. Não é script idempotente — é one-off.

## 6. Env — `.env.example`

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # ← novo. Secret absoluto, server-only.
```

## 7. Server — `lib/supabase/admin.ts`

```ts
import { createClient } from "@supabase/supabase-js"

/**
 * Service-role client — bypassa RLS.
 * USAR APENAS em código server (route handlers, server actions).
 * Jamais importar em client components ou expor a key.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

## 8. Server — `lib/auth.ts`

Extrator único da identidade do request. Aqui — e **só aqui** — é que
`auth.uid()` / `getUser()` / headers são consultados. O resto do código
(`lib/tenant.ts`, RPCs, route handlers) recebe um objeto tipado `Auth`
com `kind` discriminando *quem* é o caller.

**Discriminator `kind`:**
- `"user"` — request autenticado por cookie de sessão (user humano no browser).
- `"tenant_key"` — request autenticado por API key tenant-scoped (Fase 2).

O **`kind`** separa *quem* é o caller do *como* o request chegou. Isso
permite que rotas de gestão (settings, members, invites) exijam
explicitamente `kind === "user"` sem bloquear headers futuros (ex: SAML,
service-to-service token), e que rotas de dados (calc) aceitem ambos.

```ts
import type { NextRequest } from "next/server"
import { createSupabaseClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type AuthUser = {
  ok: true
  kind: "user"
  userId: string
  isSuperAdmin: boolean
  supabase: SupabaseClient
}

// Fase 2 (AUTHZ_API_KEYS) adiciona esta variante; declarada aqui pra o
// tipo união já existir e os handlers poderem discriminar por `kind`.
export type AuthTenantKey = {
  ok: true
  kind: "tenant_key"
  tenantId: string
  role: "reader" | "editor"
  apiKeyId: string
  supabase: SupabaseClient
}

export type Auth = AuthUser | AuthTenantKey
export type AuthFailure = { ok: false; status: 401; error: string }

/**
 * Autentica o request. Na Fase 1 só retorna `kind: "user"`; Fase 2 adiciona
 * `kind: "tenant_key"` quando o header `Authorization: Bearer <key>` é válido.
 *
 * Respostas de erro:
 *   UNAUTHENTICATED      — nenhuma credencial válida encontrada.
 *   (Fase 2: INVALID_API_KEY — Bearer presente mas não resolve.)
 */
export async function requireAuth(
  _request: NextRequest
): Promise<Auth | AuthFailure> {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, status: 401, error: "UNAUTHENTICATED" }
  }
  return {
    ok: true,
    kind: "user",
    userId: user.id,
    isSuperAdmin: !!user.app_metadata?.is_super_admin,
    supabase,
  }
}

/**
 * Helper pra rotas de gestão (settings, members, transfer, billing, API keys).
 * Rejeita `kind: "tenant_key"` com 401 USER_IDENTITY_REQUIRED.
 */
export function requireUserAuth(auth: Auth): AuthUser | AuthFailure {
  if (auth.kind !== "user") {
    return { ok: false, status: 401, error: "USER_IDENTITY_REQUIRED" }
  }
  return auth
}
```

## 9. Server — `lib/tenant.ts`

Duas funções complementares:

- **`requireTenantRole(auth, tenantId, minRole)`** — rotas de **gestão**.
  Aceita apenas `kind === "user"`; rejeita `tenant_key` com
  `USER_IDENTITY_REQUIRED`. Valida role via `tenant_members`.
- **`requireTenantAccess(auth, tenantId, minRole)`** — rotas de **dados**
  (calc, leituras). Aceita os dois `kind`s. Para `tenant_key`, checa se
  `auth.tenantId === tenantId` e se `auth.role` satisfaz `minRole`.

```ts
import type { Auth, AuthUser } from "@/lib/auth"

export type Role = "owner" | "manager" | "editor" | "reader"

const ROLE_RANK: Record<Role, number> = {
  reader: 1, editor: 2, manager: 3, owner: 4,
}

type RoleCheckOk      = { ok: true; role: Role }
type RoleCheckFailure = { ok: false; status: 401 | 403; error: string }

/**
 * Rotas de gestão (settings, members, invites, api-keys).
 * Rejeita qualquer `kind !== "user"` com 401 USER_IDENTITY_REQUIRED.
 * Super admin passa como `role: "owner"` sintético.
 */
export async function requireTenantRole(
  auth: Auth,
  tenantId: string,
  minRole: Role,
): Promise<RoleCheckOk | RoleCheckFailure> {
  if (auth.kind !== "user") {
    return { ok: false, status: 401, error: "USER_IDENTITY_REQUIRED" }
  }

  if (auth.isSuperAdmin) return { ok: true, role: "owner" }

  const { data } = await auth.supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (!data) return { ok: false, status: 403, error: "NOT_A_MEMBER" }

  const userRank = ROLE_RANK[data.role as Role]
  if (userRank < ROLE_RANK[minRole]) {
    return { ok: false, status: 403, error: "INSUFFICIENT_ROLE" }
  }
  return { ok: true, role: data.role as Role }
}

/**
 * Rotas de dados (calc, leituras). Aceita user E tenant_key.
 * Para `tenant_key`, exige que o tenantId do request bata com o da key.
 */
export async function requireTenantAccess(
  auth: Auth,
  tenantId: string,
  minRole: Role,
): Promise<RoleCheckOk | RoleCheckFailure> {
  if (auth.kind === "tenant_key") {
    if (auth.tenantId !== tenantId) {
      return { ok: false, status: 403, error: "TENANT_MISMATCH" }
    }
    const keyRank = ROLE_RANK[auth.role as Role]
    if (keyRank < ROLE_RANK[minRole]) {
      return { ok: false, status: 403, error: "INSUFFICIENT_ROLE" }
    }
    return { ok: true, role: auth.role as Role }
  }

  // kind === "user" — delega pra requireTenantRole
  return requireTenantRole(auth, tenantId, minRole)
}

export type { Auth, AuthUser }
```

## 10. Routes — padrão a seguir

Exemplo `app/api/projects/route.ts` (rota de gestão → user-only):

```ts
import { requireAuth } from "@/lib/auth"
import { requireTenantRole } from "@/lib/tenant"
import { NextResponse, type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { tenantId, name, isActive = false } = await request.json()
  if (!tenantId || !name) {
    return NextResponse.json({ error: "TENANT_AND_NAME_REQUIRED" }, { status: 400 })
  }

  // Rejeita tenant_key com USER_IDENTITY_REQUIRED automaticamente.
  const check = await requireTenantRole(auth, tenantId, "editor")
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { data, error } = await auth.supabase
    .from("projects")
    .insert({ name, tenant_id: tenantId, is_active: isActive })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.kind !== "user") {
    return NextResponse.json({ error: "USER_IDENTITY_REQUIRED" }, { status: 401 })
  }

  // RLS filtra por tenant membership automaticamente
  const tenantId = request.nextUrl.searchParams.get("tenantId")
  let query = auth.supabase.from("projects").select("*").is("deleted_at", null)
  if (tenantId) query = query.eq("tenant_id", tenantId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

Aplicar o mesmo padrão em todas as rotas de gestão (`engines`, `engines/[id]`, `projects/[id]`, `invites/*`, `tenants/*`).

### Rotas que aceitam tenant_key (dados, não gestão)

Calc e leituras de dados aceitam tanto `kind: "user"` quanto `kind: "tenant_key"`.
Usar `requireTenantAccess` em vez de `requireTenantRole`:

```ts
// app/api/calc/[...segments]/route.ts (trecho)
import { requireAuth } from "@/lib/auth"
import { requireTenantAccess } from "@/lib/tenant"

export async function POST(request: NextRequest, ctx: { params: { segments: string[] } }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // Resolver tenantId a partir do engine/projeto do path. Depois:
  const check = await requireTenantAccess(auth, tenantId, "reader")
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  // ... continua com a execução do calc
}
```

**Soft-delete** — para DELETE:
```ts
const { error } = await auth.supabase
  .from("projects")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", params.id)
```

### Ativação escopada por tenant

O unique index parcial `projects_one_active_per_tenant` (§2) garante em DB
que, para cada `tenant_id`, no máximo um project está ativo. O handler do
`POST /api/projects/[id]/activate` precisa ser explícito ao zerar os outros
para não tentar desativar projects de outros tenants e para não depender da
RLS sozinha (a RLS garante acesso, mas não escopo da operação).

Padrão:

```ts
// app/api/projects/[id]/activate/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // 1. Descobre o tenant do project-alvo
  const { data: project } = await auth.supabase
    .from("projects")
    .select("tenant_id")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle()
  if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

  // 2. Checa permissão no tenant correto (rota de gestão → user-only)
  const role = await requireTenantRole(auth, project.tenant_id, "editor")
  if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status })

  // 3. Desativa qualquer outro project ATIVO DO MESMO TENANT (escopo explícito).
  await auth.supabase
    .from("projects")
    .update({ is_active: false })
    .eq("tenant_id", project.tenant_id)
    .eq("is_active", true)
    .neq("id", params.id)

  // 4. Ativa o alvo. Se o unique index parcial disparar conflict, significa
  //    race com outro ACTIVATE — trata como sucesso (o outro já ativou).
  const { error } = await auth.supabase
    .from("projects")
    .update({ is_active: true })
    .eq("id", params.id)

  if (error && !error.message.includes("projects_one_active_per_tenant")) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
```

Mesma estrutura se aplica a `POST /api/engines/[id]/activate` — resolver
`project_id` do engine, checar role via tenant do project, zerar outros
ativos com `.eq("project_id", engine.project_id)`.

## 11. SQL — RPCs atômicas de ownership (`db/authz_rpcs.sql`)

Mutações envolvendo `tenants.owner_id` / `tenants.billing_id` precisam rodar
em transação única para que as invariantes `CANNOT_MODIFY_PRIMARY_OWNER` /
`CANNOT_MODIFY_BILLING_OWNER` nunca sejam violadas durante a janela de
execução. Por isso são implementadas como funções Postgres `security definer`
e chamadas via `supabase.rpc(...)` nas rotas correspondentes.

**Convenção de portabilidade:** toda RPC recebe **`_caller_id uuid`** +
**`_caller_is_super_admin boolean`** como primeiros parâmetros. O handler
HTTP (`app/api/...`) lê esses valores do objeto `Auth` (§8-9) e passa
explicitamente. As RPCs **não chamam `auth.uid()` nem `is_super_admin()`**
internamente — são puras em relação à fonte de identidade. Migrar pra
Postgres + outro auth = trocar só o extrator em `lib/auth.ts`.

> Consequência: revogamos `execute` das RPCs para `anon`/`authenticated` e
> só o service-role (ou a própria sessão via policy controlada) as invoca.
> Ver `revoke execute` no fim desta seção.

```sql
-- =========================================================================
-- RPCs de ownership — chamar via supabase.rpc('<nome>', {...})
-- Todas recebem `_caller_id` + `_caller_is_super_admin` explícitos.
-- =========================================================================

-- Criar tenant (somente super admin). Cria a row em tenants + a membership
-- inicial do owner_id/billing_id em tenant_members, atomicamente.
-- Se `_billing_id` não for passado, usa `_owner_id`.
create or replace function public.create_tenant(
  _caller_id uuid,
  _caller_is_super_admin boolean,
  _name text,
  _owner_id uuid,
  _billing_id uuid default null
) returns uuid
  language plpgsql security definer set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_billing_id uuid := coalesce(_billing_id, _owner_id);
begin
  if not _caller_is_super_admin then
    raise exception 'ONLY_SUPER_ADMIN_CAN_CREATE_TENANT';
  end if;

  insert into tenants (name, owner_id, billing_id)
  values (_name, _owner_id, v_billing_id)
  returning id into v_tenant_id;

  -- Garante que primary e billing estão em tenant_members com role='owner'
  insert into tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, _owner_id, 'owner')
  on conflict (tenant_id, user_id) do update set role = 'owner';

  if v_billing_id <> _owner_id then
    insert into tenant_members (tenant_id, user_id, role)
    values (v_tenant_id, v_billing_id, 'owner')
    on conflict (tenant_id, user_id) do update set role = 'owner';
  end if;

  return v_tenant_id;
end;
$$;

-- Transferência do primary owner. Caller tem que ser o primary atual
-- (tenants.owner_id) ou super admin. `_new_owner_id` precisa já ter
-- role='owner' no tenant (super admin pode auto-promover antes — a função
-- não promove sozinha para evitar escalação silenciosa).
create or replace function public.transfer_primary_ownership(
  _caller_id uuid,
  _caller_is_super_admin boolean,
  _tenant_id uuid,
  _new_owner_id uuid
) returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_current_owner uuid;
  v_new_is_member boolean;
begin
  select owner_id into v_current_owner
  from tenants where id = _tenant_id and deleted_at is null;

  if v_current_owner is null then
    raise exception 'TENANT_NOT_FOUND';
  end if;

  if not _caller_is_super_admin and v_current_owner <> _caller_id then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select exists (
    select 1 from tenant_members
    where tenant_id = _tenant_id and user_id = _new_owner_id and role = 'owner'
  ) into v_new_is_member;

  if not v_new_is_member then
    raise exception 'NEW_OWNER_NOT_OWNER_ROLE';
  end if;

  update tenants set owner_id = _new_owner_id where id = _tenant_id;
end;
$$;

-- Troca do billing owner. Mesmas regras de autorização do transfer_primary.
-- `_user_id` precisa ter role='owner' no tenant.
create or replace function public.set_billing_owner(
  _caller_id uuid,
  _caller_is_super_admin boolean,
  _tenant_id uuid,
  _user_id uuid
) returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_is_member_owner boolean;
begin
  select owner_id into v_owner_id
  from tenants where id = _tenant_id and deleted_at is null;

  if v_owner_id is null then
    raise exception 'TENANT_NOT_FOUND';
  end if;

  if not _caller_is_super_admin and v_owner_id <> _caller_id then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select exists (
    select 1 from tenant_members
    where tenant_id = _tenant_id and user_id = _user_id and role = 'owner'
  ) into v_is_member_owner;

  if not v_is_member_owner then
    raise exception 'USER_NOT_OWNER_ROLE';
  end if;

  update tenants set billing_id = _user_id where id = _tenant_id;
end;
$$;

-- Soft-delete do tenant inteiro. Apenas primary owner ou super admin
-- (invariante ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT).
-- Policies de projects/engines já fazem cascata via join em tenants.deleted_at.
create or replace function public.delete_tenant(
  _caller_id uuid,
  _caller_is_super_admin boolean,
  _tenant_id uuid
) returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id
  from tenants where id = _tenant_id and deleted_at is null;

  if v_owner_id is null then
    raise exception 'TENANT_NOT_FOUND';
  end if;

  if not _caller_is_super_admin and v_owner_id <> _caller_id then
    raise exception 'ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT';
  end if;

  update tenants set deleted_at = now() where id = _tenant_id;
end;
$$;

-- Remoção forçada do primary owner (apenas super admin).
-- Super admin passa `_new_primary_id`/`_new_billing_id` explicitamente;
-- SEM inferência automática (invariante (d) em §Decisões-chave): se o target
-- também for billing, `_new_billing_id` é obrigatório.
create or replace function public.force_remove_primary_owner(
  _caller_id uuid,
  _caller_is_super_admin boolean,
  _tenant_id uuid,
  _target_user_id uuid,
  _new_primary_id uuid,
  _new_billing_id uuid default null
) returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_billing_id uuid;
  v_effective_billing uuid;
begin
  if not _caller_is_super_admin then
    raise exception 'ONLY_SUPER_ADMIN_CAN_FORCE_REMOVE';
  end if;

  if _new_primary_id = _target_user_id then
    raise exception 'NEW_PRIMARY_SAME_AS_TARGET';
  end if;

  select owner_id, billing_id into v_owner_id, v_billing_id
  from tenants where id = _tenant_id and deleted_at is null;

  if v_owner_id is null then
    raise exception 'TENANT_NOT_FOUND';
  end if;

  -- Se o target é o billing atual, o super admin PRECISA passar o novo
  -- billing explicitamente. Não inferimos "novo billing = novo primary".
  if v_billing_id = _target_user_id and _new_billing_id is null then
    raise exception 'NEW_BILLING_ID_REQUIRED';
  end if;

  -- Se _new_billing_id foi passado, ele é o novo billing. Senão, billing
  -- mantém (só chega aqui se target != billing).
  v_effective_billing := coalesce(_new_billing_id, v_billing_id);

  -- Novo primary precisa ser owner. Se ainda não for, promove.
  insert into tenant_members (tenant_id, user_id, role)
  values (_tenant_id, _new_primary_id, 'owner')
  on conflict (tenant_id, user_id) do update set role = 'owner';

  -- Idem pro novo billing, se for diferente do anterior.
  if v_effective_billing <> v_billing_id then
    insert into tenant_members (tenant_id, user_id, role)
    values (_tenant_id, v_effective_billing, 'owner')
    on conflict (tenant_id, user_id) do update set role = 'owner';
  end if;

  update tenants
     set owner_id   = _new_primary_id,
         billing_id = v_effective_billing
   where id = _tenant_id;

  -- Agora a membership do antigo pode ser removida sem violar invariantes.
  delete from tenant_members
   where tenant_id = _tenant_id and user_id = _target_user_id;
end;
$$;

-- =========================================================================
-- RPCs de gestão de membros — tenant_members é append/mutate ONLY via RPC.
-- (A policy de UPDATE/DELETE direto em tenant_members foi revogada em §4.)
-- =========================================================================

-- Muda o role de um membro. Centraliza todas as regras:
--   * callers: manager+ do tenant (ou super admin)
--   * promover pra 'owner'           → primary owner atual ou super admin
--   * rebaixar/alterar owner secundário → primary owner ou super admin
--   * rebaixar manager               → OWNER (qualquer) ou super admin
--   * tocar em primary (owner_id)    → bloqueado (usar transfer_primary_ownership)
--   * tocar em billing (billing_id)  → bloqueado (usar set_billing_owner)
create or replace function public.change_member_role(
  _caller_id uuid,
  _caller_is_super_admin boolean,
  _tenant_id uuid,
  _user_id uuid,
  _new_role text
) returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_billing_id uuid;
  v_target_role text;
  v_caller_role text;
  v_is_super boolean := _caller_is_super_admin;
  v_is_primary boolean;
begin
  if _new_role not in ('owner','manager','editor','reader') then
    raise exception 'INVALID_ROLE';
  end if;

  select owner_id, billing_id into v_owner_id, v_billing_id
  from tenants where id = _tenant_id and deleted_at is null;

  if v_owner_id is null then
    raise exception 'TENANT_NOT_FOUND';
  end if;

  v_is_primary := (v_owner_id = _caller_id);

  select role into v_caller_role
  from tenant_members where tenant_id = _tenant_id and user_id = _caller_id;

  -- Caller precisa ser manager+ (ou super admin).
  if not v_is_super and v_caller_role not in ('owner','manager') then
    raise exception 'INSUFFICIENT_ROLE';
  end if;

  select role into v_target_role
  from tenant_members where tenant_id = _tenant_id and user_id = _user_id;

  if v_target_role is null then
    raise exception 'TARGET_NOT_A_MEMBER';
  end if;

  -- Bloqueios de primary/billing
  if _user_id = v_owner_id and _new_role <> 'owner' then
    raise exception 'CANNOT_MODIFY_PRIMARY_OWNER';
  end if;
  if _user_id = v_billing_id and _new_role <> 'owner' then
    raise exception 'CANNOT_MODIFY_BILLING_OWNER';
  end if;

  -- Promover pra owner: só primary ou super admin
  if _new_role = 'owner' and not v_is_super and not v_is_primary then
    raise exception 'ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER';
  end if;

  -- Alterar owner secundário: só primary ou super admin
  if v_target_role = 'owner' and not v_is_super and not v_is_primary then
    raise exception 'ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER';
  end if;

  -- Rebaixar manager: só OWNER (qualquer) ou super admin
  if v_target_role = 'manager' and _new_role <> 'manager'
     and not v_is_super and v_caller_role <> 'owner' then
    raise exception 'ONLY_OWNER_CAN_DEMOTE_MANAGER';
  end if;

  update tenant_members
     set role = _new_role
   where tenant_id = _tenant_id and user_id = _user_id;
end;
$$;

-- Remove um membro. Mesmas regras hierárquicas do change_member_role.
-- Para remover primary/billing owner: super admin usa force_remove_primary_owner
-- (esta função rejeita com CANNOT_MODIFY_PRIMARY_OWNER / CANNOT_MODIFY_BILLING_OWNER).
create or replace function public.remove_member(
  _caller_id uuid,
  _caller_is_super_admin boolean,
  _tenant_id uuid,
  _user_id uuid
) returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_billing_id uuid;
  v_target_role text;
  v_caller_role text;
  v_is_super boolean := _caller_is_super_admin;
  v_is_primary boolean;
  v_owner_count int;
begin
  select owner_id, billing_id into v_owner_id, v_billing_id
  from tenants where id = _tenant_id and deleted_at is null;

  if v_owner_id is null then
    raise exception 'TENANT_NOT_FOUND';
  end if;

  v_is_primary := (v_owner_id = _caller_id);

  select role into v_caller_role
  from tenant_members where tenant_id = _tenant_id and user_id = _caller_id;

  if not v_is_super and v_caller_role not in ('owner','manager') then
    raise exception 'INSUFFICIENT_ROLE';
  end if;

  select role into v_target_role
  from tenant_members where tenant_id = _tenant_id and user_id = _user_id;

  if v_target_role is null then
    raise exception 'TARGET_NOT_A_MEMBER';
  end if;

  if _user_id = v_owner_id then
    raise exception 'CANNOT_MODIFY_PRIMARY_OWNER';
  end if;
  if _user_id = v_billing_id then
    raise exception 'CANNOT_MODIFY_BILLING_OWNER';
  end if;

  if v_target_role = 'owner' and not v_is_super and not v_is_primary then
    raise exception 'ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER';
  end if;

  if v_target_role = 'manager' and not v_is_super and v_caller_role <> 'owner' then
    raise exception 'ONLY_OWNER_CAN_DEMOTE_MANAGER';
  end if;

  -- Guard defensivo: os bloqueios de primary/billing já cobrem, mas mantemos
  -- o check caso alguma invariante seja relaxada no futuro.
  if v_target_role = 'owner' then
    select count(*) into v_owner_count
    from tenant_members where tenant_id = _tenant_id and role = 'owner';
    if v_owner_count <= 1 then
      raise exception 'CANNOT_REMOVE_LAST_OWNER';
    end if;
  end if;

  delete from tenant_members
   where tenant_id = _tenant_id and user_id = _user_id;
end;
$$;

-- Aceite de convite — chamada em /api/invites/[token]/accept.
-- Recebe o email autenticado do caller e compara com invite.email dentro
-- da própria RPC (não dá pra confiar em validação no handler, que roda antes
-- da transação). Erros agrupados em INVITE_NOT_USABLE (token/expirado/revogado
-- /email). O GET /api/invites/[token] continua distinguindo os códigos
-- (EXPIRED, REVOKED, EMAIL_MISMATCH) porque pode ler sem efetivar.
create or replace function public.accept_invite(
  _caller_id uuid,
  _caller_email text,
  _invite_id uuid
) returns uuid   -- retorna tenant_id
  language plpgsql security definer set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_role text;
  v_invite_email text;
begin
  select tenant_id, role, email
    into v_tenant_id, v_role, v_invite_email
  from tenant_invites
  where id = _invite_id
    and accepted_at is null
    and revoked_at is null
    and expires_at > now();

  if v_tenant_id is null then
    raise exception 'INVITE_NOT_USABLE';
  end if;

  -- Email bate? Case-insensitive. Se não, mesmo código agrupado.
  if lower(v_invite_email) <> lower(_caller_email) then
    raise exception 'INVITE_NOT_USABLE';
  end if;

  insert into tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, _caller_id, v_role)
  on conflict (tenant_id, user_id) do update set role = excluded.role;

  update tenant_invites set accepted_at = now() where id = _invite_id;

  return v_tenant_id;
end;
$$;

-- =========================================================================
-- Revoke execute — todas as RPCs acima são invocadas pelas rotas server
-- com service-role (ou em nome do caller, mas sempre passando _caller_id
-- validado). Revogar de anon/authenticated impede que alguém invoque
-- diretamente via PostgREST passando _caller_id/_caller_is_super_admin
-- arbitrários (o que seria uma escalação trivial).
-- =========================================================================
revoke execute on function public.create_tenant(uuid, boolean, text, uuid, uuid)                   from anon, authenticated;
revoke execute on function public.transfer_primary_ownership(uuid, boolean, uuid, uuid)            from anon, authenticated;
revoke execute on function public.set_billing_owner(uuid, boolean, uuid, uuid)                     from anon, authenticated;
revoke execute on function public.delete_tenant(uuid, boolean, uuid)                               from anon, authenticated;
revoke execute on function public.force_remove_primary_owner(uuid, boolean, uuid, uuid, uuid, uuid) from anon, authenticated;
revoke execute on function public.change_member_role(uuid, boolean, uuid, uuid, text)              from anon, authenticated;
revoke execute on function public.remove_member(uuid, boolean, uuid, uuid)                         from anon, authenticated;
revoke execute on function public.accept_invite(uuid, text, uuid)                                  from anon, authenticated;
```

> **Uso nas rotas:** todas chamam via `auth.supabase.rpc(...)` com os dois
> primeiros args extraídos de `auth` (kind === "user"). Exemplo canônico:
> ```ts
> // POST /api/tenants/[id]/transfer-ownership
> const user = requireUserAuth(auth)
> if (!user.ok) return NextResponse.json({ error: user.error }, { status: user.status })
> await user.supabase.rpc("transfer_primary_ownership", {
>   _caller_id: user.userId,
>   _caller_is_super_admin: user.isSuperAdmin,
>   _tenant_id: tenantId,
>   _new_owner_id: newOwnerId,
> })
> ```
>
> - `POST /api/tenants` → `rpc('create_tenant', { _caller_id, _caller_is_super_admin, _name, _owner_id, _billing_id })`.
> - `POST /api/tenants/[id]/transfer-ownership` → `rpc('transfer_primary_ownership', { _caller_id, _caller_is_super_admin, _tenant_id, _new_owner_id })`.
> - `POST /api/tenants/[id]/billing-owner` → `rpc('set_billing_owner', { _caller_id, _caller_is_super_admin, _tenant_id, _user_id })`.
> - `DELETE /api/tenants/[id]` → `rpc('delete_tenant', { _caller_id, _caller_is_super_admin, _tenant_id })`.
> - `PATCH /api/tenants/[id]/members` → `rpc('change_member_role', { _caller_id, _caller_is_super_admin, _tenant_id, _user_id, _new_role })`.
> - `DELETE /api/tenants/[id]/members/[userId]` → `rpc('remove_member', ...)` (target regular) ou `rpc('force_remove_primary_owner', { _caller_id, _caller_is_super_admin, _tenant_id, _target_user_id, _new_primary_id, _new_billing_id })` quando target = `owner_id` (super admin).
> - `POST /api/invites/[token]/accept` → `rpc('accept_invite', { _caller_id, _caller_email, _invite_id })`.

## 12. Server — sessão SSR (`lib/session.ts`, `lib/menu.ts`, `/api/session`)

Para a Fase 3 renderizar o shell autenticado **via SSR** sem expor `role` no HTML,
centralizamos a montagem do contexto da sessão num único helper server.

### `lib/menu.ts`

Definição central do menu. Cada entrada declara o role mínimo — `"super_admin"`
é tratado como caso especial (não faz parte de `Role`).

```ts
import type { Role } from "@/lib/tenant"

export type MenuItem = {
  id: string
  label: string
  href: string
  section: "main" | "settings" | "admin"
}

type MenuDef = MenuItem & { minRole: Role | "super_admin" }

const ROLE_RANK: Record<Role, number> = {
  reader: 1, editor: 2, manager: 3, owner: 4,
}

const ALL_ITEMS: MenuDef[] = [
  { id: "projects",          label: "Projetos",        href: "/projects",                 section: "main",     minRole: "reader"      },
  { id: "engines",           label: "Motores",         href: "/engines",                  section: "main",     minRole: "reader"      },
  { id: "calc",              label: "Calcular",        href: "/calc",                     section: "main",     minRole: "reader"      },
  { id: "builder",           label: "Builder",         href: "/builder",                  section: "main",     minRole: "editor"      },
  { id: "settings",          label: "Configurações",   href: "/tenants/:tenantId/settings",                  section: "settings", minRole: "reader"      },
  { id: "settings/members",  label: "Membros",         href: "/tenants/:tenantId/settings/members",          section: "settings", minRole: "reader"      },
  { id: "settings/api-keys", label: "API Keys",        href: "/tenants/:tenantId/settings/api-keys",         section: "settings", minRole: "editor"      },
  { id: "admin/tenants/new", label: "Novo tenant",     href: "/admin/tenants/new",        section: "admin",    minRole: "super_admin" },
]

export function buildMenu(
  role: Role | null,
  isSuperAdmin: boolean,
  tenantId: string | null,
): MenuItem[] {
  return ALL_ITEMS
    .filter(it => {
      if (it.minRole === "super_admin") return isSuperAdmin
      if (!role) return false
      return ROLE_RANK[role] >= ROLE_RANK[it.minRole]
    })
    .map(({ minRole: _m, ...rest }) => ({
      ...rest,
      href: rest.href.replace(":tenantId", tenantId ?? ""),
    }))
}
```

### `lib/session.ts`

Fonte da verdade para "o que renderizar pro user atual". Consumido pelo
layout autenticado (SSR) e pelo wrapper HTTP `/api/session`.

```ts
import { cookies } from "next/headers"
import { createSupabaseClient } from "@/lib/supabase/client"
import { buildMenu, type MenuItem } from "@/lib/menu"
import type { Role } from "@/lib/tenant"

const CURRENT_TENANT_COOKIE = "next-calc-current-tenant"

export type TenantSummary = {
  id: string
  name: string
  role: Role
  isPrimaryOwner: boolean
  isBillingOwner: boolean
  isSuperAdminView: boolean   // true se super admin visualizando tenant sem ser membro real
}

export type SessionContext = {
  user: { id: string; email: string | null }
  tenants: TenantSummary[]
  currentTenantId: string | null
  role: Role | null           // role do user no currentTenantId (null se nenhum)
  isSuperAdmin: boolean
  menu: MenuItem[]
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const isSuperAdmin = !!user.app_metadata?.is_super_admin

  const tenants: TenantSummary[] = isSuperAdmin
    ? await loadTenantsForSuperAdmin(supabase, user.id)
    : await loadTenantsForMember(supabase, user.id)

  const cookieStore = await cookies()
  const cookieTenantId = cookieStore.get(CURRENT_TENANT_COOKIE)?.value ?? null
  const currentTenantId =
    tenants.find(t => t.id === cookieTenantId)?.id ?? tenants[0]?.id ?? null

  const role = tenants.find(t => t.id === currentTenantId)?.role ?? null
  const menu = buildMenu(role, isSuperAdmin, currentTenantId)

  return {
    user: { id: user.id, email: user.email ?? null },
    tenants,
    currentTenantId,
    role,
    isSuperAdmin,
    menu,
  }
}
```

> **Segurança.** `role` e `isSuperAdmin` são expostos ao client para simplificar a UI (`PermissionGate` checa role diretamente em vez de inferir do menu). Isso **não é vazamento** — a fronteira de segurança é server-side (RLS + `requireTenantRole` + RPCs). Um client malicioso pode forjar qualquer valor; o server jamais confia no payload. O shape público existe só pra o renderer saber o que mostrar.

### `app/api/session/route.ts`

Wrapper HTTP — retorna o **mesmo shape** de `SessionContext`. Usado em casos
onde o client precisa re-hidratar (raro, dado que a troca de tenant faz full
reload via `router.refresh()`).

```ts
import { NextResponse } from "next/server"
import { getSessionContext } from "@/lib/session"

export async function GET() {
  const ctx = await getSessionContext()
  if (!ctx) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
  return NextResponse.json(ctx)
}
```

### Troca de tenant

A seleção do tenant atual é guardada num **cookie HTTP-only**
(`next-calc-current-tenant`) setado por um endpoint dedicado
`POST /api/session/current-tenant` com body `{ tenantId }`. Depois de setar,
o client faz `router.refresh()` — o layout SSR re-executa com o novo contexto
e o menu volta filtrado corretamente.

> Usar cookie (server) em vez de localStorage (client) é o que mantém o
> SSR como fonte única da verdade: sem cookie, o server não saberia qual
> tenant renderizar e precisaríamos de um fetch client pra corrigir o menu.

## Verificação


1. **Rodar SQL** na ordem: `authz_tenants.sql` → `schema.sql` (alter) → `authz_helpers.sql` → `authz_rpcs.sql` → `rls.sql` → `migration_authz.sql` (com placeholders substituídos).
2. **Promover super admin** via SQL (`update auth.users set raw_app_meta_data = ...`); deslogar e relogar para JWT refletir.
3. **Smoke test isolamento:**
   - User A (membro do tenant Acme) vê só projects de Acme
   - User B (membro do tenant Foo) não vê Acme
   - Super admin vê ambos
4. **Soft-delete:** delete project via API → `deleted_at` populado, `GET /api/projects` não retorna
5. **403 em vez de 500/200:** USER tentando criar project → 403 `INSUFFICIENT_ROLE`
6. **401 sem cookie:** `curl /api/projects` sem nada → 401 `UNAUTHENTICATED`
7. **Helpers protegidos:** `supabase.rpc('has_tenant_role', ...)` direto via cliente authenticated retorna erro de permissão (não é possível inferir memberships).
8. **`/api/session` shape:** logado, `GET /api/session` retorna `{ user, tenants, currentTenantId, role, isSuperAdmin, menu }`. Cada `TenantSummary` inclui `role`.
9. **Active-scope escopado por tenant:** User A cria project ativo no tenant Acme; user B ativa project no tenant Foo; ambos permanecem ativos (cada um no seu tenant). Tentativa de inserir dois projects ativos no mesmo tenant via SQL direto falha com unique violation (`projects_one_active_per_tenant`).
10. **Bruno flows** — atualizar requests que hoje não passam tenant para incluir `tenantId` no body/query conforme aplicável (projects POST, engines list, etc).

## Observações

- **Super admin é "sempre autenticado":** a flag em `app_metadata` concede tudo via `is_super_admin(auth.uid())` na RLS e via `_caller_is_super_admin=true` nas RPCs. Cuidado ao setar — só para você / suporte.
- **Super admin view no UI:** RLS já permite que super admin leia qualquer tenant. A "visão ampliada" no `TenantSelector` (ver todos os tenants, inclusive os sem membership) é responsabilidade da rota `GET /api/tenants` — basta detectar `auth.isSuperAdmin` e fazer query direto em `tenants` em vez de só `tenant_members`. Nenhuma mudança de RLS é necessária.

- **JWT precisa refletir `app_metadata`:** mudanças em `app_metadata` só aparecem após o user relogar (ou ter o token renovado). Como `is_super_admin(_caller_id)` consulta `auth.users` direto, a flag vale imediatamente; mas `auth.jwt()` (se usado em outro lugar) só reflete após novo login.
- **RLS não substitui validação no server** para casos de negócio (ex: "manager não pode rebaixar outro manager"). Isso fica nas RPCs do §11 e em `lib/tenant.ts`.
- **Fase 2** (API keys) introduz auth via Bearer e adiciona a variante `kind: "tenant_key"` a `requireAuth`; rotas de gestão rejeitam com `USER_IDENTITY_REQUIRED`.
- **Testes automatizados** não estão neste escopo; se quiser adicionar, PT de testes em `tests/authz/` seria o caminho (não incluído aqui para não inflar).
