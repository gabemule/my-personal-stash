# AUTHZ — Multi-tenant + RBAC + API Keys + Invites

Plano geral da leva de autorização. Os docs de fase descrevem **contratos** (schema, assinaturas de RPC, endpoints, erros, invariantes), não implementação.

Docs relacionados:
- [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md) — tracking unificado das fases
- [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md) — Fase 1: fundação multi-tenant + RBAC
- [`AUTHZ_API_KEYS.md`](./AUTHZ_API_KEYS.md) — Fase 2: API keys tenant-scoped
- [`AUTHZ_RBAC_UI.md`](./AUTHZ_RBAC_UI.md) — Fase 3: UI de gestão
- [`AUTHZ_INVITES.md`](./AUTHZ_INVITES.md) — Fase 4: convites por email
- [`AUTHZ_AUDIT_LOG.md`](./AUTHZ_AUDIT_LOG.md) — Leva 2 (plantado)

---

## Context

Hoje a autenticação (Supabase Auth) funciona, mas autorização é grosseira:

- `db/rls.sql` tem `authenticated full access` — qualquer user logado vê/edita tudo.
- Não há `user_id` nas tabelas de negócio; rotas confiam implicitamente em RLS.
- Sem modelo multi-tenant, sem API keys, sem `middleware.ts` real de auth.

## Goals

1. **Isolamento multi-tenant** via `tenants`/`tenant_members` + RLS por tenant.
2. **RBAC** hierárquico: `owner > manager > editor > reader` + super admin global (`app_metadata.is_super_admin`). Tenant pode ter ≥ 1 OWNER.
3. **Dois "ownerships"**: `tenants.owner_id` (primary) e `tenants.billing_id` (billing) — colunas separadas; default `owner_id = billing_id` no create.
4. **API keys tenant-scoped** (Bearer, M2M) com role próprio `reader | editor`. Nunca auto-administram.
5. **UI** de gestão (selector, membros, ownership, keys).
6. **Convites por email** self-service.
7. **Soft-delete** em tenants/projects/engines.

Auth base (login/senha Supabase) permanece intacta.

## Escopo

**Dentro:** schema novo (`tenants`, `tenant_members`, `tenant_invites`, `api_keys`), `tenant_id` em `projects`, soft-delete, helpers server (`requireAuth`, `requireTenantRole`, `requireTenantAccess`), helpers SQL (`has_tenant_role`, `is_super_admin`), RPCs de ownership, RLS refinada, rotas novas, UI de gestão.

**Fora:** billing real, audit log (plantado), rate limiting, i18n, observabilidade externa, restore de soft-delete (tenant/project/engine — recuperação via SQL direto pelo super admin; endpoint dedicado é follow-up).

## Fases

| # | Doc | Foco | Esforço |
|---|---|---|---|
| 1 | `AUTHZ_TENANT` | Schema, RLS, helpers, RPCs, migration, soft-delete | ~5h |
| 2 | `AUTHZ_API_KEYS` | Bearer tenant-scoped + `requireAuth` atualizado | ~2h |
| 3 | `AUTHZ_RBAC_UI` | Layout authed, selector, members, settings | ~4h |
| 4 | `AUTHZ_INVITES` | Convites por email + aceite | ~3h |
| — | `AUTHZ_AUDIT_LOG` | Plantado, leva 2 | — |

Execução **estritamente sequencial** (Fase 2 adiciona `kind: "tenant_key"` ao union `Auth`; Fase 3 depende disso; Fase 4 reusa UI de Fase 3).

## Decisões-chave

### Roles = hierarquia única

Um eixo só (`reader < editor < manager < owner`). Sem multi-role/capability matrix. Trigger pra revisitar: cliente pedindo role que faça X mas NÃO Y de forma inversa à hierarquia.

### Três conceitos de ownership

| | Onde | Qtd | Poderes exclusivos |
|---|---|---|---|
| Primary owner | `tenants.owner_id` | 1 | Cria/remove OWNERs; define billing; transfere primary |
| Billing owner | `tenants.billing_id` | 1 | Recebe invoices (default = primary; pode divergir) |
| Secondary owner | `role='owner'` em `tenant_members` (não é primary nem billing) | 0..N | Poder padrão de OWNER (rebaixar MANAGER etc); **não** cria OWNER, **não** muda primary/billing |

### Tenant creation é super-admin only

Onboarding é processo comercial. User sem tenant cai em `/no-tenant`. Super admin com zero tenants cai em `/admin/tenants/new`.

### Identidade discriminada por `kind`

`requireAuth` retorna união com discriminator `kind: "user" | "tenant_key"`:
- **Rotas de gestão** (members, invites, api-keys, transfer/billing) → `requireTenantRole` (user-only; rejeita `tenant_key` com 401 `USER_IDENTITY_REQUIRED`).
- **Rotas de dados** (calc, leituras) → `requireTenantAccess` (aceita os dois `kind`s).

### Mutações sensíveis concentradas em RPCs `security definer`

Tabelas `tenants`, `tenant_members`, `tenant_invites` têm `insert/update/delete` **revogados** em RLS. Toda mutação passa por RPCs nomeadas (listadas em `AUTHZ_TENANT.md`). A RPC é a **única** camada que enforça invariantes nomeadas (veja abaixo). Sem bypass via PostgREST.

**Exceção consciente — `api_keys`.** A tabela `api_keys` (Fase 2) usa RLS com policies separadas `SELECT`/`INSERT`/`DELETE` para `authenticated` com `has_tenant_role(..., 'editor')`, sem RPC dedicada. `UPDATE` é revogado — sem policy de UPDATE. Justificativa: (1) o payload tem só `name`/`role`/`key_hash` — não há invariante cross-row a enforçar (diferente de `tenant_members`, onde "último owner" e "primary owner" exigem lógica atômica); (2) o raw da key é gerado no handler antes do INSERT e só faz sentido em fluxo de response HTTP — migrar pra RPC forçaria passar raw como parâmetro sem ganho; (3) key é sempre tenant-scoped, então RLS cobre o isolamento. `UPDATE` é revogado explicitamente para eliminar o vetor de escalação de privilégio via PostgREST (ex: editor alterando `role` ou `key_hash` diretamente). O handler de revogação usa `createAdminClient()` para o soft-delete. Se no futuro surgir invariante nova (quota de keys, expiração, rotação atômica), migrar para padrão RPC como o resto.

### Invariantes nomeadas (enforçadas nas RPCs)

| Invariante | Onde enforça |
|---|---|
| `CANNOT_MODIFY_PRIMARY_OWNER` | `change_member_role`, `remove_member`, `accept_invite` |
| `CANNOT_MODIFY_BILLING_OWNER` | `change_member_role`, `remove_member`, `accept_invite` |
| `CANNOT_REMOVE_LAST_OWNER` | `remove_member`, `change_member_role` (guards defensivos em ambos) |
| `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_CREATE_OWNER` | `change_member_role` |
| `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_MODIFY_OWNER` | `change_member_role`, `remove_member` |
| `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_INVITE_OWNER` | `create_invite` |
| `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT` | `delete_tenant` |
| `ONLY_OWNER_CAN_DEMOTE_MANAGER` | `change_member_role`, `remove_member` |
| `ONLY_SUPER_ADMIN_CAN_CREATE_TENANT` | `create_tenant` |
| `ONLY_SUPER_ADMIN_CAN_FORCE_REMOVE` | `force_remove_protected_member` |

Cada invariante é enforçada em **exatamente uma RPC** (ou guarda simétrica se duas RPCs cobrem o mesmo cenário, como member modification em dois endpoints). A permission matrix completa está em `AUTHZ_RBAC_UI.md §Permission matrix`.

### Portabilidade — caller explícito nas RPCs

Toda RPC e helper SQL recebe `_caller_id uuid` + `_caller_is_super_admin boolean` (quando aplicável) como primeiros parâmetros. `auth.uid()` é invocado **apenas** em:
1. `db/rls.sql` (policies passam `auth.uid()` como arg ao helper).
2. `lib/auth.ts` (extrator do request).

Isso mantém helpers/RPCs puros em relação à fonte de identidade.

### `revoke execute from public` em todas as RPCs

Funções com `security definer` concedem `EXECUTE` a `PUBLIC` por default. Sem revogar de `PUBLIC`, revogar só de `anon/authenticated` **não tem efeito**. A revogação certa é:

```
revoke execute on function <name>(<signature>) from public, anon, authenticated;
```

Handlers invocam via service-role (`createAdminClient().rpc(...)`), nunca pelo client authenticated.

## Critérios de sucesso globais

Ver checklist completa em `AUTHZ_PROGRESS.md §Critérios de sucesso globais`. Resumo:

- Nenhuma rota `/api/*` (exceto `/api/auth/*`) responde 200 sem auth.
- Isolamento user-A/user-B em tenants distintos.
- Super admin acessa qualquer tenant; selector mostra todos com badge "admin" nos não-membros.
- Apenas super admin cria tenants; user comum → 403.
- Matriz de permissões (RBAC_UI §Permission matrix) validada end-to-end.
- Soft-delete em cascata: tenant soft-deleted esconde projects/engines via policies; API key do tenant soft-deleted → 401.
- Rotas de gestão com Bearer → 401 `USER_IDENTITY_REQUIRED`.
- RPCs invocáveis apenas via service-role (`supabase.rpc(...)` direto = permission denied).

## Migration dos dados existentes

Dados atuais (`projects`, `engines`) não têm `tenant_id`. Passos one-off (detalhados em `AUTHZ_TENANT.md §Migration`):

1. Promover primeiro user a super admin (`app_metadata.is_super_admin = true`).
2. Criar tenant "Default" com `owner_id = billing_id = <super admin>`.
3. Adicionar super admin como `owner` em `tenant_members`.
4. Backfill `update projects set tenant_id = <default>` e aplicar `NOT NULL`.


