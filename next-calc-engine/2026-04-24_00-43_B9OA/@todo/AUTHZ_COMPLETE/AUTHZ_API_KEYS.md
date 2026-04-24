# AUTHZ Fase 2 — API Keys (tenant-scoped)

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md) · depende de [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md)

Consumidores externos (`/api/calc/*` e CRUDs de engines/projects) precisam de auth estática via Bearer. A chave pertence ao **tenant**, não ao user.

## Esforço

~2h.

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `db/api_keys.sql` | Criar (tabela `api_keys` + RLS) |
| `lib/api-keys.ts` | Criar (`generateRawKey`, `hashKey`, `validateApiKey`) |
| `lib/auth.ts` | Atualizar (branch Bearer → `AuthTenantKey`) |
| `app/api/tenants/[id]/api-keys/route.ts` | Criar (GET lista, POST cria — user-only) |
| `app/api/tenants/[id]/api-keys/[keyId]/route.ts` | Criar (DELETE revoga — user-only) |
| `app/api/calc/[...segments]/route.ts` | Atualizar (`requireTenantAccess` + filtro manual por `tenantId` quando `tenant_key`) |
| `app/api/engines/*` · `app/api/projects/*` | Atualizar (aceitar `tenant_key` editor+ em rotas CRUD via `requireTenantAccess`) |
| `proxy.ts` | Patchar (pular `getUser()` em `/api/calc/*` quando header Bearer presente) |
| `schemas/api.ts` | Atualizar (`CreateApiKeyRequest`, `ApiKeyRecord`, `ApiKeyCreatedResponse`) |
| `schemas/endpoints.ts` | Registrar rotas novas |
| `bruno/environments/local.bru`, `staging.bru` | Adicionar `apiKey` em `vars:secret` |
| `bruno/calc/calculate.bru` | Header `Authorization: Bearer {{apiKey}}` |

---

## Schema — `api_keys`

| Coluna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` | |
| `tenant_id` | uuid NOT NULL → `tenants(id) on delete cascade` | | |
| `name` | text NOT NULL | | human-readable, ex: `"app-produto-xyz"` |
| `key_hash` | text UNIQUE NOT NULL | | SHA-256 hex do raw |
| `role` | text NOT NULL CHECK in (`reader`,`editor`) | `reader` | escopo do Bearer |
| `created_by` | uuid → `auth.users(id) on delete set null` (nullable) | | auditoria — preserva a key e o registro de nome mesmo após deleção do criador |
| `last_used_at` | timestamptz | | aproximativo (fire-and-forget) |
| `created_at` | timestamptz NOT NULL | `now()` | |
| `deleted_at` | timestamptz | | soft-delete |

Índice: `(tenant_id) where deleted_at is null`.

### RLS

- **SELECT** para authenticated: `is_super_admin(auth.uid()) OR has_tenant_role(auth.uid(), tenant_id, 'editor')`.
- **INSERT** para authenticated: `is_super_admin(auth.uid()) OR has_tenant_role(auth.uid(), tenant_id, 'editor')`.
- **DELETE** para authenticated: `is_super_admin(auth.uid()) OR has_tenant_role(auth.uid(), tenant_id, 'editor')`.
- **UPDATE**: revogado — sem policy de UPDATE. Não há rename de key; revogar + criar substitui rotação.

Sem policy de UPDATE, um editor autenticado não consegue via PostgREST alterar `role`, `key_hash` ou `deleted_at` de uma key existente — elimina o vetor de escalação de privilégio e de hijack silencioso de key. O soft-delete é feito pelo handler de revogação via `createAdminClient()` (UPDATE `deleted_at = now()`), já que UPDATE está revogado para o client autenticado. Criação e listagem continuam via client autenticado com RLS.

**Nota sobre a DELETE policy:** a policy de DELETE para `authenticated` existe para hard-delete direto por admin via DB — edge case que não passa pelo produto. No fluxo normal o handler de revogação (`DELETE /api/tenants/[id]/api-keys/[keyId]`) faz soft-delete via `createAdminClient()` e a DELETE policy não é exercitada. Manter a policy não representa risco (requer `editor+` no tenant) mas é dead code no fluxo HTTP.

---

## Role da API key

- `reader` (default): consome **somente** `POST /api/calc/*`.
- `editor`: `/api/calc/*` + CRUD em `engines`/`projects`.

`manager`/`owner` **não existem** em key — key nunca convida, não muda billing, não auto-administra. **Toda** rota de gestão (`/api/tenants/*`, members, invites, api-keys, transfer/billing) retorna 401 `USER_IDENTITY_REQUIRED` independente do role da key.

---

## Helpers — `lib/api-keys.ts`

```ts
function generateRawKey(): string            // 32 bytes base64url (256-bit)
function hashKey(raw: string): string        // sha256(raw) hex

type ApiKeyRole = "reader" | "editor"

function validateApiKey(raw: string): Promise<
  { tenantId: string; keyId: string; role: ApiKeyRole } | null
>
```

`validateApiKey` usa **service-role** (admin client). Filtra:
- `key_hash = sha256(raw)`
- `api_keys.deleted_at is null`
- `tenants.deleted_at is null` (join `!inner` — cascata: tenant soft-deleted invalida todas as keys).

Se válido, retorna `{tenantId, keyId, role}` e atualiza `last_used_at` fire-and-forget.

### `tenantScopedQuery` — helper obrigatório para `tenant_key`

Quando `kind === "tenant_key"`, o cliente Supabase é service-role e **ignora RLS**. Qualquer query que esqueça o filtro de tenant resulta em cross-tenant data leak silencioso — não há erro, simplesmente retorna dados de outros tenants.

Para eliminar essa classe de erro, expor um helper em `lib/api-keys.ts` (ou `lib/tenant.ts`):

```ts
/**
 * Aplica automaticamente o filtro de tenant quando auth é tenant_key.
 * Para auth user, retorna o builder sem modificação (RLS cobre).
 *
 * Usar em TODA query de dados quando o handler aceita tenant_key.
 */
function tenantScopedQuery<T>(
  builder: PostgrestFilterBuilder<T>,
  auth: AuthTenantKey | AuthUser,
  tenantIdColumn = "tenant_id"
): PostgrestFilterBuilder<T> {
  if (auth.kind === "tenant_key") {
    return builder.eq(tenantIdColumn, auth.tenantId)
  }
  return builder
}
```

**Regra:** toda query de dados em handler que aceita `tenant_key` passa pelo `tenantScopedQuery`. Não é redundante com `requireTenantAccess` — aquela checa role, esta checa ownership do recurso. Para engines (tenant via `project_id`), usar `projects!inner(tenant_id)` com `.eq("projects.tenant_id", auth.tenantId)`.

---

## `requireAuth` atualizado

Pseudocódigo do branching:

1. Header `Authorization: Bearer <raw>`:
   - `validateApiKey(raw)` → se válido: retorna `AuthTenantKey` com `supabase = createAdminClient()`.
   - Senão: 401 `INVALID_API_KEY`.
2. Caso contrário: fluxo cookie da Fase 1 (`AuthUser` ou 401 `UNAUTHENTICATED`).

**Bearer tem prioridade sobre cookie.** Se um request chega com ambos (sessão de usuário via cookie + header `Authorization: Bearer`), o Bearer ganha e o request é tratado como `tenant_key`. O custo de `getUser()` no proxy é aceito para rotas fora de `/api/calc/*` (scope conservador do bypass — ver §Patch em `proxy.ts`).

**Atenção:** para `kind: "tenant_key"`, o `supabase` é service-role e **ignora RLS**. O isolamento tenant-a-tenant passa a depender de `requireTenantAccess` + `tenantScopedQuery` no handler (ver §Helpers acima).

---

## Endpoints — contratos

| Método + path | Auth | Request | Response | Erros |
|---|---|---|---|---|
| `GET /api/tenants/[id]/api-keys` | **user** (editor+) | — | `ApiKeyRecord[]` (sem `key_hash`) | 401 `USER_IDENTITY_REQUIRED` |
| `POST /api/tenants/[id]/api-keys` | **user** (editor+) | `{ name, role?: "reader" \| "editor" }` | `ApiKeyRecord & { raw: string }` (raw aparece **1x**) | 400 `NAME_REQUIRED`, 400 `INVALID_KEY_ROLE`, 401 `USER_IDENTITY_REQUIRED` |
| `DELETE /api/tenants/[id]/api-keys/[keyId]` | **user** (editor+) | — | `{ ok: true }` | 401 `USER_IDENTITY_REQUIRED` |
| `POST /api/calc/[...segments]` | user OU tenant_key (reader+) | `CalcRequest` | `CalcResponse` | 404 `ENGINE_NOT_FOUND`, 403 `TENANT_MISMATCH`/`INSUFFICIENT_ROLE` |
| CRUD engines/projects | user OU tenant_key (**editor+**) | conforme | conforme | 403 `INSUFFICIENT_ROLE` se key=`reader` |

> `GET /api/tenants/[id]/api-keys` é **user-only** deliberadamente. Listar suas "irmãs" seria passo zero de uma escalação via key comprometida.

### `/api/calc/*` com `tenant_key`

Service-role ignora RLS, então o handler filtra manualmente:

1. Carrega engine com join em `projects.tenant_id`.
2. Se `kind === "tenant_key"`, aplica `.eq("projects.tenant_id", auth.tenantId)` na query — impede leitura cross-tenant.
3. `requireTenantAccess(auth, engine.project.tenant_id, "reader")` — valida tenant match + role.

### CRUD de `engines`/`projects` com `tenant_key`

`requireTenantAccess(auth, tenantId, "editor")` cobre role check, mas **não** garante que o recurso alvo (`:id` na URL) pertence a `auth.tenantId` — service-role ignora RLS. Handlers **precisam** filtrar manualmente antes de mutar:

1. `GET /api/projects/[id]`, `PATCH`, `DELETE`, `POST activate`: selecionar o project filtrando `id = :id AND tenant_id = <auth.tenantId>` (ou `<tenantId>` da URL para user); se vazio → 404 `PROJECT_NOT_FOUND`.
2. Para `engines` (tenant vive via `project_id`): selecionar com `select *, projects!inner(tenant_id)` filtrando `engines.id = :id AND projects.tenant_id = <auth.tenantId>`; se vazio → 404 `ENGINE_NOT_FOUND`.
3. Para `POST /api/engines` / `POST /api/projects/[id]/engines`: validar que o `project_id` do body/URL tem `tenant_id = auth.tenantId` antes do INSERT.

Key `reader` em rota CRUD editor+ → 403 `INSUFFICIENT_ROLE` (via `requireTenantAccess`, sem precisar carregar o recurso).

**Regra geral:** qualquer query de dados com `kind === "tenant_key"` tem que incluir um `.eq("tenant_id", auth.tenantId)` (direto ou via `!inner`). Isso **não é redundante** com `requireTenantAccess` — aquela checa role, esta checa ownership do recurso.

---

## Patch em `proxy.ts` — bypass de `getUser()` para Bearer

Supabase SSR chama `auth.getUser()` em toda request (~800ms round-trip observado em dev). Quando o request chega com Bearer em rota que aceita Bearer, pulamos.

**Regra:**
- Se `pathname` começa com `/api/calc/` **e** header `Authorization: Bearer ...` presente → `NextResponse.next({ request })` direto (sem `getUser`).
- Caso contrário, fluxo atual (cookie validation + redirects).

**Escopo conservador:** apenas `/api/calc/*`. CRUDs de engines/projects continuam passando pelo middleware cookie — se algum handler esquecer o gate `requireTenantAccess`, o middleware ainda é rede de segurança. Se dor de latência aparecer em CRUDs, expandir depois.

**Verificação:**
- `curl -X POST /api/calc/<id> -H "Authorization: Bearer <raw>"` em dev sem ~800ms do proxy.
- `curl -X POST /api/calc/<id>` sem header → redirect `/login` como antes.
- `curl -X POST /api/tenants/<id>/api-keys -H "Authorization: Bearer <raw>"` → middleware segue fluxo normal; handler devolve `USER_IDENTITY_REQUIRED`.

---

## Verificação

1. Rodar `db/api_keys.sql`.
2. Confirmar `SUPABASE_SERVICE_ROLE_KEY` no env (adicionado em Fase 1).
3. Criar key manual via SQL (até Fase 3 trazer UI): `openssl rand -base64 32 | tr -d '=' | tr '/+' '_-'` → `insert into api_keys (tenant_id, name, key_hash, role, created_by) values (...)`.
4. `POST /api/calc/<engineId>` com `Bearer <raw>` → 200.
5. Key errada → 401 `INVALID_API_KEY`.
6. Sem cookie e sem Bearer → 401 `UNAUTHENTICATED`.
7. Key do tenant A tentando engine do tenant B via `/api/calc/*` → 404 `ENGINE_NOT_FOUND` (filtro manual).
8. Key editor do tenant A tentando `PATCH /api/engines/<id-do-tenant-B>` → 404 `ENGINE_NOT_FOUND` (filtro manual, não 200).
9. Key editor do tenant A tentando `DELETE /api/projects/<id-do-tenant-B>` → 404 `PROJECT_NOT_FOUND`.
10. Key `reader` em rota CRUD editor+ → 403 `INSUFFICIENT_ROLE`.
11. `DELETE /api/tenants/<id>/api-keys/<keyId>` como editor+ → 200; próxima chamada com aquela key → 401 `INVALID_API_KEY`.
12. Bearer em `POST /api/tenants/<id>/api-keys` → 401 `USER_IDENTITY_REQUIRED`.
13. Bearer em `GET /api/tenants/<id>/api-keys` → 401 `USER_IDENTITY_REQUIRED`.
14. Soft-delete tenant → chamadas com Bearer de key daquele tenant → 401 `INVALID_API_KEY` (cascata via join).

---

## Observações

- **Nunca logar `raw`.** Só aparece no response do POST.
- **Service-role** = secret absoluto, server-only.
- **Filtro manual obrigatório** quando usar service-role: `.eq("tenant_id", auth.tenantId)` em toda query de dados sob `kind === "tenant_key"`.
- **Sem rotate endpoint.** Revogar + criar nova.
- **`last_used_at` fire-and-forget** — aproximativo. Se virar relevante pra compliance, migrar pra `audit_log` ou job batch.
- **Rate limit** fora do escopo. Adicionar se houver abuso.
