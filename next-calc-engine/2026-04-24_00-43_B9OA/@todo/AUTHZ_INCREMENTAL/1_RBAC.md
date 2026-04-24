# AUTHZ Incremental — Fase 1: RBAC Global

> **Depende de:** Fase 0 — [`0_API_KEYS.md`](./0_API_KEYS.md)
> **Próxima fase:** [`2_INVITES.md`](./2_INVITES.md)
> **Referência completa:** [`../AUTHZ_COMPLETE/AUTHZ_RBAC_UI.md`](../AUTHZ_COMPLETE/AUTHZ_RBAC_UI.md) · [`../AUTHZ_COMPLETE/AUTHZ_PLAN.md`](../AUTHZ_COMPLETE/AUTHZ_PLAN.md)

Entrega roles globais (sem tenant): toda a plataforma tem um único espaço de autorização.
Hoje, qualquer user autenticado tem acesso total. Esta fase divide em 3 níveis.

**Motivação:** nem todo user deveria criar/editar engines. API keys também precisam de escopo definido.

---

## Decisões-chave

### 3 roles globais (simplificado)

| Role | Pode fazer |
|---|---|
| `admin` | Tudo — gerenciar users, API keys, projetos, engines, cálculos |
| `editor` | CRUD projetos/engines + cálculos. Sem gestão de users. |
| `reader` | Ver projetos/engines + rodar cálculos. Sem criar/editar. |

Hierarquia: `reader=1 · editor=2 · admin=3`.

`admin` nesta fase equivale ao `owner/super_admin` do plano completo. Quando tenant chegar (Fase 4), `admin` global se divide em `super_admin` (plataforma) e `owner` (scoped ao tenant). Ver `4_TENANT.md §Migration`.

### API keys têm role limitado

Keys nunca gerenciam a plataforma — só operam dados. `api_keys.role` aceita apenas `editor` ou `reader`:

- `reader` — `/api/calc/*` somente
- `editor` — `/api/calc/*` + CRUD engines/projects

`admin` **não existe** em keys. Toda rota de gestão (`/api/users/*`, `/api/api-keys/*`) retorna `401 USER_IDENTITY_REQUIRED` se chamada com Bearer.

### Enforcement na application layer (não RLS)

RLS permanece `authenticated full access`. Roles são enforçados nos handlers via `requireRole()`.

**Motivo:** quando tenant chegar (Fase 4), o RLS é reescrito **uma vez** (scoping por tenant). Se fizéssemos RBAC em RLS agora, reescreríamos duas vezes.

### Users sem role em `user_roles` → 403 `ROLE_NOT_ASSIGNED`

Sem row na tabela = sem acesso. Solução: migration insere todos os users existentes como `editor` (preserva comportamento atual). Novos users chegam via convite (Fase 2) com role pré-definido.

### Admin não pode rebaixar o próprio role

Guard anti-lockout: `PATCH /api/users/[id]/role` onde `id === caller.userId` → `409 CANNOT_MODIFY_OWN_ROLE`. Super admin retorna o controle via SQL direto se necessário.

---

## Schema

### `user_roles` (nova tabela)

| Coluna | Tipo | Notas |
|---|---|---|
| `user_id` | uuid PK → `auth.users(id) on delete cascade` | Um role por user |
| `role` | text NOT NULL CHECK in (`admin`, `editor`, `reader`) | |
| `created_at` | timestamptz NOT NULL default `now()` | |

RLS: `authenticated full access` (consistente com o resto do app).

**Migration one-off:** inserir todos os users existentes como `editor`:
```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'editor' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Promover o primeiro user (ou admin definitivo) a admin:
UPDATE user_roles SET role = 'admin'
WHERE user_id = '<admin-user-id>';
```

### Alteração em `api_keys` (migration)

```sql
ALTER TABLE api_keys
  ADD COLUMN role text NOT NULL DEFAULT 'reader'
    CHECK (role IN ('editor', 'reader'));
```

Keys existentes ficam como `reader` — conservador e seguro.

### Soft-delete em `projects` e `engines` (migration — junto com esta fase)

Independente de tenant, mas sem isso `DELETE /api/projects/:id` hard-deleta dados irrecuperáveis. Incluído aqui por ser pequeno e estar na mesma janela de migration.

```sql
-- Adicionar deleted_at
ALTER TABLE projects ADD COLUMN deleted_at timestamptz;
ALTER TABLE engines  ADD COLUMN deleted_at timestamptz;

-- Substituir unique global de projects.name por partial (nomes de deletados ficam livres para reuso)
ALTER TABLE projects DROP CONSTRAINT projects_name_key;
CREATE UNIQUE INDEX projects_name_active_unique ON projects (name) WHERE deleted_at IS NULL;

-- Substituir unique de engines(name, project_id) por partial
ALTER TABLE engines DROP CONSTRAINT engines_name_project_unique;
CREATE UNIQUE INDEX engines_name_project_active_unique ON engines (name, project_id) WHERE deleted_at IS NULL;
```

**Impacto nos handlers:**
- `DELETE /api/projects/:id` → `UPDATE SET deleted_at = now(), is_active = false` (+ cascade: mesmo UPDATE nas engines do project).
- `DELETE /api/engines/:id` → `UPDATE SET deleted_at = now(), is_active = false`.
- Todos os `GET` e checks de unicidade → adicionar `.is("deleted_at", null)`.
- `PATCH` de resources → filtrar `deleted_at IS NULL` (não mutar soft-deletados).

Restore de soft-delete é fora de escopo — via SQL direto pelo admin.

---

## Tipos server (`lib/auth.ts`, `lib/rbac.ts`)

Fronteiras internas — tipos TypeScript, não Zod (Zod é SSOT apenas para schemas HTTP em `schemas/api.ts`).

### `GlobalRole` e `KeyRole`

```ts
type GlobalRole = "admin" | "editor" | "reader"
type KeyRole = "editor" | "reader"
```

### `AuthResult` (evolução de `resolveAuth`)

```ts
type AuthUser = {
  kind: "user"
  userId: string
  role: GlobalRole            // carregado eager de user_roles
  supabase: SupabaseClient    // sessão cookie autenticada
}

type AuthKey = {
  kind: "key"
  apiKeyId: string
  role: KeyRole               // de api_keys.role
  supabase: SupabaseClient    // service-role
}

type AuthResult = AuthUser | AuthKey | null   // null = Bearer inválido
```

`resolveAuth` carrega o role eagerly (query em `user_roles` ou `api_keys`) para evitar round-trips adicionais dentro dos handlers.

**Prioridade Bearer sobre cookie:** quando a request contém ambos (`Authorization: Bearer` + cookie de sessão), `resolveAuth` avalia o branch Bearer primeiro. Cookie é ignorado nesse caso. Isso preserva o comportamento atual do `proxy.ts` (Fase 0) e evita ambiguidade no `AuthResult`.

### `requireRole(auth, minRole)`

```ts
function requireRole(
  auth: AuthUser | AuthKey,
  minRole: GlobalRole
): { ok: true } | { ok: false; status: 401 | 403; error: string }
```

Contrato:
- `kind: "key"` + `minRole === "admin"` → `401 USER_IDENTITY_REQUIRED` (keys não gerenciam).
- Hierarquia numérica: ok se `RANK[auth.role] >= RANK[minRole]`.
- `kind: "user"` + role insuficiente → `403 INSUFFICIENT_ROLE`.

Erros possíveis: `UNAUTHENTICATED` (401) · `USER_IDENTITY_REQUIRED` (401) · `INSUFFICIENT_ROLE` (403).

---

## Matriz de permissões

| Ação | reader | editor | admin | Bearer reader | Bearer editor |
|---|:---:|:---:|:---:|:---:|:---:|
| Ver projects/engines | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar/editar projects/engines | ❌ | ✅ | ✅ | ❌ | ✅ |
| Ativar project/engine | ❌ | ✅ | ✅ | ❌ | ✅ |
| Rodar cálculos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar/revogar API keys | ❌ | ✅ | ✅ | ❌ | ❌ |
| Gerenciar roles de users | ❌ | ❌ | ✅ | ❌ | ❌ |
| Convidar user (Fase 2) | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## Endpoints — contratos

Schemas Zod de request/response vivem em `schemas/api.ts` (SSOT). Aqui só a tabela de alto nível.

| Método | Rota | Auth | Request | Response | Erros principais |
|---|---|---|---|---|---|
| `GET /api/users` | user, admin | — | `UserRecord[]` | 403 `INSUFFICIENT_ROLE` |
| `GET /api/users/[id]/role` | user, admin | — | `{ userId, role }` | 403, 404 `USER_NOT_FOUND` |
| `PATCH /api/users/[id]/role` | user, admin | `{ role }` | `{ userId, role }` | 400 `INVALID_ROLE`, 403, 404, 409 `CANNOT_MODIFY_OWN_ROLE` |

`UserRecord`: `{ id, email, role, createdAt }` — email vem de `createAdminClient()` (schema `auth` não é navegável via PostgREST com client autenticado).

---

## Proteção das rotas existentes

| Rota | Mínimo exigido |
|---|---|
| `GET /api/projects`, `GET /api/engines/*` | `reader` |
| `POST /api/projects`, `POST /api/engines` | `editor` |
| `PATCH`, `DELETE` `/api/projects/[id]` | `editor` |
| `POST /api/projects/[id]/activate` | `editor` |
| `POST /api/engines/[id]/activate` | `editor` |
| `POST /api/calc/*` | `reader` (user) · key qualquer |
| `GET /api/api-keys` | `editor` (user-only) |
| `POST /api/api-keys` | `editor` (user-only) |
| `DELETE /api/api-keys/[id]` | `editor` (user-only) |
| `GET /api/users`, `PATCH /api/users/[id]/role` | `admin` (user-only) |
| `GET /api/schema`, `GET /api/schemas/*` | `reader` — critério global: nenhuma rota `/api/*` (exceto `/api/auth/*`) responde 200 sem auth |

---

## Evolução para Fase 4 (tenant)

| Global (Fase 1) | Tenant (Fase 4) |
|---|---|
| `user_roles` (global) | `tenant_members` (scoped) + `super_admin` em `app_metadata` |
| `GlobalRole` = `admin/editor/reader` | `Role` = `owner/manager/editor/reader` |
| `requireRole(auth, 'admin')` | `requireTenantRole(auth, tenantId, 'owner')` |
| `api_keys.role` sem `tenant_id` | `api_keys.role` + `tenant_id` |
| RLS: `authenticated full access` | RLS: policies por tenant (reescrita **uma vez só**) |

`user_roles` é migrada para `tenant_members` adicionando `tenant_id` — migration aditiva, sem drop.

---

## Verificação

1. User sem row em `user_roles` tenta qualquer rota protegida → `403 ROLE_NOT_ASSIGNED`.
2. `reader` tenta `POST /api/projects` → `403 INSUFFICIENT_ROLE`.
3. `editor` cria project → 200.
4. `admin` altera role de outro user → 200.
5. `editor` tenta `PATCH /api/users/[id]/role` → `403 INSUFFICIENT_ROLE`.
6. Bearer `reader` tenta `POST /api/projects` → `403 INSUFFICIENT_ROLE`.
7. Bearer qualquer em `PATCH /api/users/[id]/role` → `401 USER_IDENTITY_REQUIRED`.
8. `admin` tenta alterar próprio role → `409 CANNOT_MODIFY_OWN_ROLE`.
9. Keys existentes sem `role` → `reader` após migration (default conservador).
10. Smoke: dois roles distintos em users distintos acessando rotas distintas — sem vazamento cross-user.
11. `DELETE /api/projects/:id` → `deleted_at` setado; `GET /api/projects` não retorna o item.
12. `GET /api/projects` com item soft-deletado → lista não inclui o deletado (`.is("deleted_at", null)` ativo).
13. Criar project com mesmo nome de um soft-deletado → 200 (partial unique index libera o nome).
