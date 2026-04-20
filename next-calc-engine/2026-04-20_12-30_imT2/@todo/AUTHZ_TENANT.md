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
- **Soft-delete** em `tenants`, `projects`, `engines` (`deleted_at timestamptz`).
- **Helper SQL** `has_tenant_role(tenant_id, min_role)` centraliza toda checagem de permissão.

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
| `lib/auth.ts` | Criar | `requireAuth(request)` — retorna `{ userId, supabase }` ou 401 |
| `lib/tenant.ts` | Criar | `requireTenantRole(supabase, tenantId, minRole)` — **cookie-only** (valida role via `tenant_members`) |
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
```

> `tenant_id` começa nullable. A migration (seção 4) faz backfill e depois aplica NOT NULL.
> O `db/schema.sql` base (para setups novos) também deixa de declarar `unique` em `projects.name` e o `constraint engines_name_project_unique`.

## 3. SQL — helpers (`db/authz_helpers.sql`)

```sql
-- =========================================================================
-- Helpers de permissão
-- =========================================================================

-- Super admin: flag em app_metadata do JWT.
create or replace function public.is_super_admin() returns boolean
  language sql stable
as $$
  select coalesce(
    (auth.jwt()->'app_metadata'->>'is_super_admin')::boolean,
    false
  );
$$;

-- Verifica se o user atual tem o role mínimo no tenant.
-- Hierarquia: owner > manager > editor > reader
create or replace function public.has_tenant_role(
  _tenant_id uuid,
  _min_role  text
) returns boolean
  language sql stable security definer set search_path = public
as $$
  select
    is_super_admin()
    or exists (
      select 1 from tenant_members tm
      where tm.tenant_id = _tenant_id
        and tm.user_id = auth.uid()
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
-- e inferir memberships arbitrários.
revoke execute on function public.is_super_admin() from anon, authenticated;
revoke execute on function public.has_tenant_role(uuid, text) from anon, authenticated;
```

## 4. SQL — `db/rls.sql` (reescrita)

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
    and (is_super_admin() or has_tenant_role(id, 'reader'))
  );

create policy "owners update tenant" on tenants
  for update to authenticated
  using (has_tenant_role(id, 'owner'))
  with check (has_tenant_role(id, 'owner'));

-- SOMENTE super admin cria tenants. `owner_id` e `billing_id` são definidos
-- pelo super admin no payload (ambos podem apontar para usuários distintos).
-- Após a criação, o super admin precisa inserir uma row em `tenant_members`
-- com role='owner' para cada um (ou usar a RPC `create_tenant` — ver §11).
create policy "super admin creates tenant" on tenants
  for insert to authenticated
  with check (is_super_admin());

create policy "owners soft-delete tenant" on tenants
  for delete to authenticated
  using (false);  -- hard-delete nunca; soft via UPDATE deleted_at

-- ---------- TENANT_MEMBERS ----------
create policy "members read own membership" on tenant_members
  for select to authenticated
  using (
    is_super_admin()
    or user_id = auth.uid()
    or has_tenant_role(tenant_id, 'reader')
  );

-- Mutações em tenant_members acontecem EXCLUSIVAMENTE via as RPCs do §11
-- (`change_member_role`, `remove_member`, `accept_invite`). Isso concentra
-- as invariantes (CANNOT_MODIFY_PRIMARY_OWNER, ONLY_OWNER_CAN_DEMOTE_MANAGER,
-- etc.) num único lugar e impede que outro consumer (PostgREST direto,
-- futuro GraphQL) burle as regras.
--
-- Authenticated NÃO tem insert/update/delete direto na tabela.
-- Super admin usa as mesmas RPCs — elas checam `is_super_admin()` internamente.
revoke insert, update, delete on tenant_members from anon, authenticated;
-- (SELECT continua permitido pela policy acima.)


-- ---------- TENANT_INVITES ----------
-- SELECT: qualquer membro do tenant (reader+) pode ver convites pendentes.
-- ALL   : manager+ pode inserir/atualizar/deletar.
-- (Gate de role='owner' no insert é validado no server — ver AUTHZ_INVITES.md.)
create policy "members read invites" on tenant_invites
  for select to authenticated
  using (is_super_admin() or has_tenant_role(tenant_id, 'reader'));

create policy "managers manage invites" on tenant_invites
  for all to authenticated
  using (is_super_admin() or has_tenant_role(tenant_id, 'manager'))
  with check (is_super_admin() or has_tenant_role(tenant_id, 'manager'));

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
    and (is_super_admin() or has_tenant_role(tenant_id, 'reader'))
  );

create policy "editors manage projects" on projects
  for all to authenticated
  using (
    exists (
      select 1 from tenants t
      where t.id = projects.tenant_id
        and t.deleted_at is null
    )
    and (is_super_admin() or has_tenant_role(tenant_id, 'editor'))
  )
  with check (
    exists (
      select 1 from tenants t
      where t.id = projects.tenant_id
        and t.deleted_at is null
    )
    and (is_super_admin() or has_tenant_role(tenant_id, 'editor'))
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
        and (is_super_admin() or has_tenant_role(p.tenant_id, 'reader'))
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
        and (is_super_admin() or has_tenant_role(p.tenant_id, 'editor'))
    )
  )
  with check (
    exists (
      select 1 from projects p
      join tenants t on t.id = p.tenant_id
      where p.id = engines.project_id
        and t.deleted_at is null
        and (is_super_admin() or has_tenant_role(p.tenant_id, 'editor'))
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

```ts
import type { NextRequest } from "next/server"
import { createSupabaseClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type AuthSuccess = {
  ok: true
  userId: string
  supabase: SupabaseClient
  via: "cookie"   // "bearer" adicionado na Fase 2
}
export type AuthFailure = { ok: false; status: 401; error: string }

/**
 * Autentica o request via cookie de sessão.
 * Na Fase 2 (AUTHZ_API_KEYS) passará a aceitar Bearer também.
 */
export async function requireAuth(
  _request: NextRequest
): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, status: 401, error: "UNAUTHENTICATED" }
  }
  return { ok: true, userId: user.id, supabase, via: "cookie" }
}
```

## 9. Server — `lib/tenant.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js"

export type Role = "owner" | "manager" | "editor" | "reader"

const ROLE_RANK: Record<Role, number> = {
  reader: 1, editor: 2, manager: 3, owner: 4,
}

/**
 * Verifica se o user tem role >= minRole no tenant.
 * Consulta tenant_members via o cliente fornecido.
 *
 * Uso típico:
 *   const { supabase, userId } = auth
 *   await requireTenantRole(supabase, tenantId, "editor")
 */
export async function requireTenantRole(
  supabase: SupabaseClient,
  tenantId: string,
  minRole: Role,
): Promise<{ ok: true; role: Role } | { ok: false; status: 403; error: string }> {
  // Super admin bypass
  const { data: { user } } = await supabase.auth.getUser()
  const isSuper = !!user?.app_metadata?.is_super_admin
  if (isSuper) return { ok: true, role: "owner" }

  const { data } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user?.id ?? "")
    .maybeSingle()

  if (!data) return { ok: false, status: 403, error: "NOT_A_MEMBER" }

  const userRank = ROLE_RANK[data.role as Role]
  if (userRank < ROLE_RANK[minRole]) {
    return { ok: false, status: 403, error: "INSUFFICIENT_ROLE" }
  }
  return { ok: true, role: data.role as Role }
}
```

## 10. Routes — padrão a seguir

Exemplo `app/api/projects/route.ts`:

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

  const role = await requireTenantRole(auth.supabase, tenantId, "editor")
  if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status })

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

  // RLS filtra por tenant membership automaticamente
  const tenantId = request.nextUrl.searchParams.get("tenantId")
  let query = auth.supabase.from("projects").select("*").is("deleted_at", null)
  if (tenantId) query = query.eq("tenant_id", tenantId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

Aplicar o mesmo padrão em todas as rotas de negócio (`engines`, `engines/active`, `engines/[id]`, `calc/[...segments]`).

**Soft-delete** — para DELETE:
```ts
const { error } = await auth.supabase
  .from("projects")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", params.id)
```

## 11. SQL — RPCs atômicas de ownership (`db/authz_rpcs.sql`)

Mutações envolvendo `tenants.owner_id` / `tenants.billing_id` precisam rodar
em transação única para que as invariantes `CANNOT_MODIFY_PRIMARY_OWNER` /
`CANNOT_MODIFY_BILLING_OWNER` nunca sejam violadas durante a janela de
execução. Por isso são implementadas como funções Postgres `security definer`
e chamadas via `supabase.rpc(...)` nas rotas correspondentes.

```sql
-- =========================================================================
-- RPCs de ownership — chamar via supabase.rpc('<nome>', {...})
-- =========================================================================

-- Criar tenant (somente super admin). Cria a row em tenants + a membership
-- inicial do owner_id/billing_id em tenant_members, atomicamente.
-- Se `_billing_id` não for passado, usa `_owner_id`.
create or replace function public.create_tenant(
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
  if not is_super_admin() then
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

  if not is_super_admin() and v_current_owner <> auth.uid() then
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

  if not is_super_admin() and v_owner_id <> auth.uid() then
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

-- Remoção forçada do primary owner (apenas super admin).
-- Super admin passa `_new_primary_id`/`_new_billing_id` explicitamente;
-- SEM inferência automática (invariante (d) em §Decisões-chave): se o target
-- também for billing, `_new_billing_id` é obrigatório.
create or replace function public.force_remove_primary_owner(
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
  if not is_super_admin() then
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
  v_is_super boolean := is_super_admin();
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

  v_is_primary := (v_owner_id = auth.uid());

  select role into v_caller_role
  from tenant_members where tenant_id = _tenant_id and user_id = auth.uid();

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
  v_is_super boolean := is_super_admin();
  v_is_primary boolean;
  v_owner_count int;
begin
  select owner_id, billing_id into v_owner_id, v_billing_id
  from tenants where id = _tenant_id and deleted_at is null;

  if v_owner_id is null then
    raise exception 'TENANT_NOT_FOUND';
  end if;

  v_is_primary := (v_owner_id = auth.uid());

  select role into v_caller_role
  from tenant_members where tenant_id = _tenant_id and user_id = auth.uid();

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
-- Faz o upsert em tenant_members e marca accepted_at, em transação.
-- Todas as validações (token existe, não expirado, não revogado, email bate)
-- ficam no server antes de chamar essa RPC; aqui a função apenas persiste.
create or replace function public.accept_invite(
  _invite_id uuid,
  _user_id uuid
) returns uuid   -- retorna tenant_id
  language plpgsql security definer set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_role text;
begin
  select tenant_id, role into v_tenant_id, v_role
  from tenant_invites
  where id = _invite_id
    and accepted_at is null
    and revoked_at is null
    and expires_at > now();

  if v_tenant_id is null then
    raise exception 'INVITE_NOT_USABLE';
  end if;

  insert into tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, _user_id, v_role)
  on conflict (tenant_id, user_id) do update set role = excluded.role;

  update tenant_invites set accepted_at = now() where id = _invite_id;

  return v_tenant_id;
end;
$$;
```

> **Uso nas rotas:**
> - `POST /api/tenants` → `supabase.rpc('create_tenant', { _name, _owner_id, _billing_id })` (super admin only).
> - `POST /api/tenants/[id]/transfer-ownership` → `rpc('transfer_primary_ownership', ...)`.
> - `POST /api/tenants/[id]/billing-owner` → `rpc('set_billing_owner', ...)`.
> - `PATCH /api/tenants/[id]/members` → `rpc('change_member_role', { _tenant_id, _user_id, _new_role })`.
> - `DELETE /api/tenants/[id]/members/[userId]` → `rpc('remove_member', ...)` (target regular) ou `rpc('force_remove_primary_owner', ...)` quando target = `owner_id` (super admin, com `newPrimaryOwnerId` + `newBillingId` se aplicável).
> - `POST /api/invites/[token]/accept` → `rpc('accept_invite', { _invite_id, _user_id })`.

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
  menu: MenuItem[]
  // isSuperAdmin e role NÃO são exportados — ficam internos ao server.
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const isSuperAdmin = !!user.app_metadata?.is_super_admin

  // Monta lista de tenants (mesma lógica de `GET /api/tenants` — centralizar aqui
  // evita duplicação; a rota vira wrapper).
  const tenants = isSuperAdmin
    ? await loadTenantsForSuperAdmin(supabase, user.id)
    : await loadTenantsForMember(supabase, user.id)

  const cookieStore = await cookies()
  const cookieTenantId = cookieStore.get(CURRENT_TENANT_COOKIE)?.value ?? null
  const currentTenantId =
    tenants.find(t => t.id === cookieTenantId)?.id ?? tenants[0]?.id ?? null

  const current = tenants.find(t => t.id === currentTenantId) ?? null
  const role = current?.role ?? null
  const menu = buildMenu(role, isSuperAdmin, currentTenantId)

  return {
    user: { id: user.id, email: user.email ?? null },
    tenants,
    currentTenantId,
    menu,
  }
}
```

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

### Por que `role` e `isSuperAdmin` não vazam pro client

O `SessionContext` **exposto ao client** só tem `user`, `tenants`, `currentTenantId`
e `menu` (já filtrado). O `PermissionGate` (Fase 3) deriva "posso ver X" a
partir da presença/ausência do item no `menu`, não de `role` bruto. Isso
reduz a superfície de inferência de permissão no client — mas não elimina
(inferir role a partir da presença de `api-keys` no menu ainda é trivial).
Gate autoritativo continua sendo as policies RLS + as checagens nas rotas.

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
8. **`/api/session` shape:** logado, `GET /api/session` retorna `{ user, tenants, currentTenantId, menu }` — **sem** campos `role`/`isSuperAdmin` no payload.
9. **Bruno flows** — atualizar requests que hoje não passam tenant para incluir `tenantId` no body/query conforme aplicável (projects POST, engines list, etc).

## Observações

- **Super admin é "sempre autenticado":** `is_super_admin()` sozinho concede tudo. Cuidado ao setar essa flag — só para você / suporte.
- **Super admin view no UI:** RLS já permite que super admin leia qualquer tenant via `is_super_admin() or has_tenant_role(...)`. A "visão ampliada" no `TenantSelector` (ver todos os tenants, inclusive os sem membership) é responsabilidade da **rota** `GET /api/tenants` — basta a rota detectar `is_super_admin` e fazer query direto em `tenants` em vez de só `tenant_members`. Nenhuma mudança de RLS é necessária.

- **JWT precisa refletir `app_metadata`:** mudanças em `app_metadata` só aparecem após o user relogar (ou ter o token renovado).
- **RLS não substitui validação no server** para casos de negócio (ex: "manager não pode rebaixar outro manager"). Isso fica em `lib/tenant.ts` ou na própria route.
- **Fase 2** (API keys) introduz auth via Bearer e modifica `requireAuth` para aceitar ambos.
- **Testes automatizados** não estão neste escopo; se quiser adicionar, PT de testes em `tests/authz/` seria o caminho (não incluído aqui para não inflar).
