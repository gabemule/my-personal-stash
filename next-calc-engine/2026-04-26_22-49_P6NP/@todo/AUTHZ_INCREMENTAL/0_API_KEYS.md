# AUTHZ Incremental — API Keys (mínima, sem tenant)

> Abordagem lean decidida após revisão do plano completo em
> [`AUTHZ_COMPLETE/AUTHZ_PLAN.md`](../AUTHZ_COMPLETE/AUTHZ_PLAN.md).
>
> **Motivação:** evitar o overhead de cookie auth (`getUser()` ~800ms) em chamadas
> externas/M2M ao `/api/calc/*`, sem implementar multi-tenant agora.
>
> Quando tenants forem necessários, basta adicionar `tenant_id` + `role` à tabela
> `api_keys` e ajustar o handler — zero retrabalho no core.

---

## O que foi implementado

| Arquivo | Ação |
|---|---|
| `db/api_keys.sql` | Tabela `api_keys` mínima (5 colunas) |
| `lib/supabase/server.ts` | Service-role client (server-only) |
| `lib/api-keys.ts` | `generateRawKey`, `hashKey`, `validateApiKey` |
| `proxy.ts` | Skip `getUser()` em `/api/calc/*` quando Bearer presente |
| `app/api/calc/[...segments]/route.ts` | Aceita Bearer (valida via `api_keys`) |
| `app/api/api-keys/route.ts` | `GET` lista · `POST` cria (cookie auth only) |
| `app/api/api-keys/[id]/route.ts` | `DELETE` revoga (soft-delete + `revalidateTag`) |
| `.env.example` | Adiciona `SUPABASE_SERVICE_ROLE_KEY` |

---

## Schema

```sql
create table api_keys (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,           -- ex: "parceiro-X", "app-interno"
  key_hash    text unique not null,    -- sha256(raw) em hex
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz              -- soft-delete: revogar = setar deleted_at
);
```

RLS: `authenticated full access` (consistente com o resto do app por ora).

---

## Fluxo de autenticação no `/api/calc/*`

```
Request com Bearer
  ↓
proxy.ts — vê "Authorization: Bearer" + path /api/calc/*
  → NextResponse.next() direto (sem getUser())
  ↓
handler calc/[...segments]/route.ts
  → extrai raw token do header
  → hashKey(raw) → SELECT api_keys WHERE key_hash = hash AND deleted_at IS NULL
  → não encontrou → 401 INVALID_API_KEY
  → encontrou → usa createServerClient() (service-role) pra ler engine
  → executa calc → 200

Request com cookie (browser / sem Bearer)
  ↓
proxy.ts — fluxo normal (getUser() + redirect se necessário)
  ↓
handler — cria client autenticado via cookie → executa calc → 200
```

---

## Como criar uma API key

### Via endpoint (recomendado)

```
POST /api/api-keys
Content-Type: application/json
Cookie: <sessão válida>

{ "name": "parceiro-X" }
```

Response: `{ "id": "...", "name": "parceiro-X", "raw": "...", "created_at": "..." }`

> **O `raw` aparece uma única vez.** Guardar imediatamente — não é recuperável.

### Via SQL (alternativa)

```bash
# Gera raw:
openssl rand -base64 32 | tr -d '\n'

# No SQL Editor do Supabase:
INSERT INTO api_keys (name, key_hash)
VALUES ('parceiro-X', encode(sha256('<raw>'::bytea), 'hex'));
```

---

## Como usar

```
POST /api/calc/<engineId>
Authorization: Bearer <raw>
Content-Type: application/json

{ "inputs": { "campo": "valor" } }
```

---

## Como revogar

```
DELETE /api/api-keys/<id>
Cookie: <sessão válida>
```

Seta `deleted_at = now()`. Próxima chamada com aquele Bearer → 401.

---

## Evolução futura (sem retrabalho)

Quando tenants forem implementados:

```sql
-- Migration simples:
ALTER TABLE api_keys
  ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN role text NOT NULL DEFAULT 'reader' CHECK (role IN ('reader', 'editor'));
```

O handler de validação (`validateApiKey`) passa a retornar `{ id, name, tenantId, role }`
e o handler de calc usa `tenantId` pra filtrar os engines.

---

## O que ainda está pendente do plano completo

Ver [`AUTHZ_COMPLETE/AUTHZ_PROGRESS.md`](../AUTHZ_COMPLETE/AUTHZ_PROGRESS.md) para
tracking completo. Resumo do que fica pendente:

| Item | Quando fazer |
|---|---|
| `tenant_id` + `role` em `api_keys` | Quando criar tenants |
| Tabela `tenants` + `tenant_members` | Quando precisar multi-tenant / isolamento |
| Tabela `tenant_invites` | Quando precisar convites self-service |
| RLS por tenant | Junto com tenants |
| RBAC 4 níveis | Quando admin/member não bastar |
| 11 RPCs security definer | Junto com tenants + RBAC |
| Soft-delete em projects/engines | Fase 1 — ver [`1_RBAC.md`](./1_RBAC.md) |
| UI de gestão (selector, members) | Junto com tenants |
| Convites por email | Último |
| Audit log | Quando doer |
