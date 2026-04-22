# AUTHZ — Multi-tenant + RBAC + API Keys + Invites

**Plano geral da leva de autorização.**

Docs relacionados:
- [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md) — tracking unificado das fases
- [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md) — Fase 1: fundação multi-tenant + RBAC
- [`AUTHZ_API_KEYS.md`](./AUTHZ_API_KEYS.md) — Fase 2: API keys tenant-scoped
- [`AUTHZ_RBAC_UI.md`](./AUTHZ_RBAC_UI.md) — Fase 3: UI de gestão de membros
- [`AUTHZ_INVITES.md`](./AUTHZ_INVITES.md) — Fase 4: convites por email
- [`AUTHZ_AUDIT_LOG.md`](./AUTHZ_AUDIT_LOG.md) — Leva 2 (plantado)

---

## Context

**Problema atual.** A autenticação (Supabase Auth / cookie de sessão) funciona, mas a *autorização* é grosseira e implícita:

- `db/rls.sql`: policies são `authenticated full access` em `projects` e `engines` — qualquer user logado vê/edita tudo.
- Não há coluna `user_id` nas tabelas de negócio.
- Routes confiam implicitamente em RLS; nenhuma chama `supabase.auth.getUser()` ou retorna 401 explícito.
- API keys (planejadas em `AUTHZ_API_KEYS.md`) não existem ainda.
- Sem `middleware.ts`.
- Sem modelo multi-tenant — não dá pra agrupar users em "empresa X" ou "time Y".

**Consequências.** Não dá pra onboardar mais de um cliente/empresa sem reescrever. Não dá pra oferecer auto-serviço. Não dá pra ter diferentes níveis de permissão.

## Goals

Ao final desta leva, o sistema terá:

1. **Isolamento multi-tenant** — `tenants`, `tenant_members`, RLS por tenant.
2. **RBAC por tenant** — 4 roles hierárquicos: `owner` > `manager` > `editor` > `reader` + super admin global via `app_metadata`. Tenant pode ter **≥ 1 OWNER**. Dois "ownerships" em colunas separadas em `tenants`: `owner_id` (primary owner) e `billing_id` (billing owner).
3. **Herança de permissão clara** — tenant → project → engine.
4. **API keys tenant-scoped** — criadas por EDITOR+, auth M2M via Bearer. Cada key tem `role` próprio (`reader` | `editor`, default `reader`): `reader` consome só `/api/calc/*`; `editor` também faz CRUD em engines/projects. Rotas de gestão (members, invites, tenants, api-keys, transfer/billing) são sempre `USER_IDENTITY_REQUIRED` — `tenant_key` nunca auto-administra.
5. **UI de gestão** — selector de tenant no header, listar/promover/remover membros, transferir ownership.
6. **Convites por email** — fluxo completo manager → email → aceite.
7. **Soft-delete** em tenants/projects/engines (`deleted_at`).

Auth base (login/senha via Supabase) permanece intacta — não há mudança no fluxo de signup/login.

## Escopo

**Dentro:**
- Schema novo (`tenants`, `tenant_members`, `tenant_invites`, `api_keys` refatorada)
- Coluna `tenant_id` em `projects`
- Soft-delete em `tenants`, `projects`, `engines`
- Helpers server: `requireAuth`, `requireTenantRole`, `logAudit` (este último só o stub)
- Helpers SQL: `has_tenant_role`, `is_super_admin`
- RLS refinada em todas as tabelas
- Rotas novas: `/api/tenants`, `/api/tenants/:id/members`, `/api/tenants/:id/invites`, `/api/api-keys`
- UI: selector de tenant, páginas de Settings (Members, API Keys), fluxo de aceite de convite

**Fora** (fica pra levas futuras):
- Billing/subscription (mesmo OWNER sendo o role responsável por isso)
- Audit log implementação (só doc plantado; quando a dor aparecer, a gente codifica)
- Refinamento de validação de email (rate limit de convites, etc.)
- i18n da UI de gestão
- Observabilidade externa (Sentry, PostHog)
- Extração do runtime para pacote standalone (ver `RUNTIME_REFACTOR_PLAN.md`, leva independente)

## Fases

| # | Doc | Foco | Esforço |
|---|---|---|---|
| 1 | `AUTHZ_TENANT` | Schema, RLS, helpers, migration, soft-delete | ~5h |
| 2 | `AUTHZ_API_KEYS` | API keys tenant-scoped + `requireAuth` | ~2-3h |
| 3 | `AUTHZ_RBAC_UI` | UI members/roles/tenant selector | ~4h |
| 4 | `AUTHZ_INVITES` | Convites por email + aceite | ~3h |
| — | `AUTHZ_AUDIT_LOG` | Plantado, leva 2 | — |

**Total estimado:** ~14-15h de implementação.

## Dependências entre fases

```
Fase 1 (TENANT) ──► Fase 2 (API_KEYS) ──► Fase 3 (RBAC_UI) ──► Fase 4 (INVITES)

(Leva 2) AUDIT_LOG ─── independente, pode entrar em qualquer fase
```

**Regra de ouro:** execução estritamente sequencial. Fase 3 depende do discriminator `auth.kind: "user" | "tenant_key"` introduzido em Fase 2 (as rotas de members/invites/transfer-ownership/billing-owner usam `requireTenantRole`, que rejeita `kind !== "user"` com 401 `USER_IDENTITY_REQUIRED`). Fase 4 reusa a UI de Fase 3 (modal convidar, lista de pendentes).

## Ordem recomendada de execução

1. **Fase 1 — `AUTHZ_TENANT`** (fundação; nada funciona sem isso)
2. **Fase 2 — `AUTHZ_API_KEYS`** (desbloqueia M2M; pequeno e bem isolado)
3. **Fase 3 — `AUTHZ_RBAC_UI`** (permite testar permissões visualmente)
4. **Fase 4 — `AUTHZ_INVITES`** (completa o fluxo self-service)
5. _(leva 2)_ **`AUTHZ_AUDIT_LOG`** quando a primeira dor aparecer

Até Fase 4 ficar pronta, o fluxo de adicionar membros é via SQL direto no Supabase SQL Editor — aceitável temporariamente.

## Critérios de sucesso globais

- [ ] Nenhuma rota de `/api/*` (exceto `/api/auth/*`) responde 200 sem auth (cookie OU Bearer válido)
- [ ] User A e User B em tenants distintos: User A não vê nada do tenant de User B (testes manuais)
- [ ] Super admin vê tudo em qualquer tenant
- [ ] Selector de tenant no header lista apenas tenants onde o user é membro (super admin vê todos, com badge "admin" onde não é membro)
- [ ] **Apenas super admin cria tenants** — user comum tentando `POST /api/tenants` → 403
- [ ] User sem nenhum tenant cai em `/no-tenant` com mensagem clara
- [ ] EDITOR+ consegue criar project; READER não vê o botão "Novo Projeto"
- [ ] MANAGER promove READER → EDITOR; promovido passa a ver botões de CRUD após refresh
- [ ] Apenas primary owner (`tenants.owner_id`) ou super admin consegue promover outro user a OWNER
- [ ] Apenas primary owner ou super admin consegue trocar `tenants.billing_id`
- [ ] Tentativa de rebaixar/remover o primary owner ou billing owner é bloqueada (precisa transferir/trocar antes)
- [ ] OWNER consegue rebaixar/remover MANAGER; outro MANAGER não consegue
- [ ] Convite por email chega, link abre página de aceite, aceite cria `tenant_members`
- [ ] API key gerada pelo tenant A não consegue ler dados do tenant B
- [ ] Delete de project marca `deleted_at` (não remove fisicamente); queries padrão filtram `deleted_at is null`
- [ ] Tenant soft-deleted esconde projects/engines via policies (mesmo com `tenant_id` direto na URL)

## Migration dos dados existentes

Os dados atuais (`projects`, `engines`) não têm `tenant_id`. Estratégia:

1. Criar tenant "default" (`name = 'Default'`, `owner_id = billing_id = <super_admin_user_id>`)
2. Adicionar super admin (você) como membro `owner` desse tenant
3. Backfill: `update projects set tenant_id = <default_tenant_id>`
4. Adicionar NOT NULL na coluna
5. Aplicar RLS

Detalhado em `AUTHZ_TENANT.md` seção de Migration.

## Decisão: role única hierárquica (não multi-role)

Considerei separar roles em dois eixos (conteúdo × gestão de pessoas) ou migrar pra capability matrix. **Decisão: manter role única hierárquica.** Motivos:

- Hierarquia já resolve "MANAGER também edita conteúdo" automaticamente (MANAGER ≥ EDITOR).
- Matriz (eixo conteúdo × eixo pessoas) = 9 combinações, UI vira checkbox matrix, RLS dobra, testes dobram.
- Os casos que matriz resolveria ("manager que não edita", "analista só leitura") ou não existem no produto ou são cobertos adicionando **um role novo** à hierarquia (ex: `reader` já cumpre "só leitura"; no futuro `auditor` / `billing` se precisar).

**Trigger pra revisitar:** quando aparecer cliente pedindo "role que faz X mas NÃO Y" de forma inversa à hierarquia (ex: "gerencia pessoas mas não edita dados").

## Múltiplos OWNERs: primary vs billing vs secondary

Três conceitos distintos, propositalmente separados:

| | Coluna / localização | Quantos | Privilégios exclusivos |
|---|---|---|---|
| **Primary owner** | `tenants.owner_id` | 1 | Único (fora super admin) que cria/remove OWNERs, define billing, transfere primary |
| **Billing owner** | `tenants.billing_id` | 1 | Recebe invoices. Default = primary no create; pode ser trocado pelo primary. |
| **Secondary owner** | `tenant_members.role='owner'` (não é primary nem billing) | 0..N | Tem o poder padrão de OWNER (rebaixar MANAGER, etc.). Não pode criar outro OWNER, não define billing, não transfere primary. |

**Invariantes (checadas server-side, não via RLS):**
- `owner_id` e `billing_id` sempre existem em `tenant_members` com `role='owner'`.
- `CANNOT_MODIFY_PRIMARY_OWNER` — não dá pra rebaixar/remover o `owner_id`; transferir primary antes.
- `CANNOT_MODIFY_BILLING_OWNER` — não dá pra rebaixar/remover o `billing_id`; trocar `billing_id` antes.
- Super admin forçando remoção precisa passar `newPrimaryOwnerId` / `newBillingId` explicitamente.

**Quem pode o quê:**
- Criar OWNER (convite com `role='owner'` ou PATCH member): **primary owner** ou **super admin**.
- Transferir `owner_id`: **primary owner atual** ou **super admin** (endpoint `transfer-ownership`).
- Mudar `billing_id`: **primary owner** ou **super admin** (endpoint `billing-owner`).
- Rebaixar/remover OWNER secundário: **primary owner** ou **super admin**.

**Casos de uso cobertos:**
1. Founder pequeno — `owner_id = billing_id = founder`. Default.
2. Founder passa operação, continua pagando — transfere `owner_id`, mantém `billing_id` nele.
3. CFO paga, CTO manda — `owner_id = CTO`, `billing_id = CFO`.
4. Trocar só quem paga — primary muda `billing_id`, nada mais muda.

## Criação de tenants (super admin only)

Diferente do fluxo inicial considerado, **a criação de tenants NÃO é self-service**. Apenas super admin cria, via `POST /api/tenants` (kind: "user" + flag `is_super_admin`) → chama a RPC `create_tenant(_caller_id, _caller_is_super_admin, _name, _owner_id, _billing_id)`. Motivos:

- Onboarding de cliente é processo comercial (contrato, cobrança, setup); não faz sentido liberar criação anônima.
- Evita "lixo" de tenants vazios criados acidentalmente.
- Super admin decide quem é primary e quem é billing no ato da criação.

**Consequências:**
- User que fez signup sem ser convidado NÃO tem tenant e cai em `/no-tenant` (tela com mensagem "sua conta ainda não foi associada a nenhum workspace — fale com o admin").
- Fluxo típico de onboarding: super admin cria tenant apontando `owner_id = email_do_cliente`, depois o cliente recebe convite (ou já existe como user) e acessa.
- "Restaurar tenant soft-deleted" = pedir pro suporte (super admin). Sem endpoint público.

**Visão de super admin no UI.** Super admin vê **todos os tenants** do sistema (não só onde é membro) no `TenantSelector`, com badge "admin" nos tenants em que não é membro real. `GET /api/tenants` detecta `is_super_admin` e retorna a visão ampliada com a flag `isSuperAdminView: true`. Super admin com zero tenants no sistema cai em `/admin/tenants/new`, não em `/no-tenant`. Detalhes em `AUTHZ_RBAC_UI`.

## Changelog

- **2026-04-22 (portabilidade + fusão de stores + RPC delete_tenant):**
  - **Portabilidade A — discriminator `kind`:** `requireAuth` retorna `kind: "user" | "tenant_key"` em vez de `via: "cookie" | "bearer"`. Separa *quem* é o caller do *como* o request chegou; renomeia o erro `COOKIE_REQUIRED` → `USER_IDENTITY_REQUIRED`.
  - **Portabilidade B — RPCs com caller explícito:** toda RPC em `db/authz_rpcs.sql` recebe `_caller_id uuid` + `_caller_is_super_admin boolean` como primeiros parâmetros. Nenhuma chama `auth.uid()` / `is_super_admin()` internamente. Ordem SQL de deploy: `authz_helpers` **antes** de `authz_rpcs`.
  - **Portabilidade C — Helpers SQL com caller explícito:** `has_tenant_role(_caller_id, _tenant_id, _min_role)` e `is_super_admin(_caller_id)`. `auth.uid()` fica isolado em **exatamente dois lugares**: `db/rls.sql` (policies passam `auth.uid()` como arg) e `lib/auth.ts` (extrator do request). Migrar pra Postgres puro = trocar só esses dois.
  - **Fundido `sessionStore` + `tenantStore`:** um único store em `stores/tenantStore.ts` carregando `user`, `tenants`, `currentTenantId`, `role`, `isSuperAdmin`, `menu`. Simplifica a UI; `PermissionGate` consome só `useTenantStore`.
  - **Nova RPC `delete_tenant`:** soft-delete do tenant inteiro é atômico e só primary owner ou super admin (`ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_SOFT_DELETE_TENANT`). `DELETE /api/tenants/[id]` passa a chamá-la.
  - **`lib/tenant.ts` ganha duas funções complementares:** `requireTenantRole` (gestão — user-only, rejeita `tenant_key` com `USER_IDENTITY_REQUIRED`) e `requireTenantAccess` (dados — aceita user + tenant_key).
  - **Critical fix — `GET /api/tenants/[id]/api-keys` é user-only.** Antes aceitava Bearer por omissão; agora rejeita `tenant_key` com `USER_IDENTITY_REQUIRED` (key não auto-administra — listar suas "irmãs" é passo zero de uma escalação).
  - **Critical fix — `accept_invite` valida email DENTRO da RPC.** O handler antigo validava no server antes de chamar a RPC, abrindo janela de race condition entre lookup e escrita. Agora o handler passa `_caller_email` e a RPC compara *case-insensitive* dentro da transação; todos os erros de negócio (expired/revoked/accepted/email_mismatch) agrupados em `INVITE_NOT_USABLE`.
  - **POST `/api/tenants/[id]/invites`** passa a tratar `23505` (unique violation em `tenant_invites_pending_unique`) mapeando pra `PENDING_INVITE_EXISTS` — fecha race entre o `select maybeSingle()` e o `insert`.
  - **`revoke execute`** em todas as RPCs e helpers para `anon`/`authenticated` (só handler com service-role ou sessão controlada invoca).
- **2026-04-20 (ajustes pré-ACT)** — API keys passam a ter `role` (`reader`/`editor`, default `reader`); mutações em `tenant_members` concentradas em RPCs (`change_member_role`, `remove_member`, `accept_invite`); `force_remove_primary_owner` revisto com guards explícitos. Detalhes em `AUTHZ_PROGRESS.md`.
- **2026-04-20** — Plano criado. Decisões arquiteturais fechadas (ver `AUTHZ_PROGRESS.md` changelog).
