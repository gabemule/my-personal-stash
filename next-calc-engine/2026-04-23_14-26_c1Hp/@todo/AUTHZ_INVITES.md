# AUTHZ Fase 4 — Convites por email

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md) · depende de [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md) e [`AUTHZ_RBAC_UI.md`](./AUTHZ_RBAC_UI.md)

## Contexto

Sem convite self-service, adicionar membro exige SQL direto. Esta fase fecha o loop:

1. MANAGER+ escolhe email + role → POST cria convite → email dispara (ou copia URL do response).
2. Destinatário clica no link → landing pública mostra detalhes → login se necessário → aceita.
3. Aceite cria `tenant_members` e marca `accepted_at`.

Schema de `tenant_invites` e todas as RPCs (`create_invite`, `revoke_invite`, `accept_invite`) já estão em `AUTHZ_TENANT`. Esta fase só entrega handlers HTTP + UI + email.

**Esforço:** médio (~3h).

## Decisões-chave

- **Token:** `crypto.randomBytes(32).toString("base64url")` — 256 bits de entropia, gerado server-side no POST.
- **Armazenamento:** `tenant_invites.token` guarda o **hash sha256** do raw (hex), não o token em si. Raw só existe in-memory no handler do POST e é retornado 1× na response (+ no `inviteUrl`). Lookup em `GET /api/invites/[token]` e em `accept_invite` faz `WHERE token = hashInviteToken(input)`. Isso garante que mesmo com dump do DB os tokens pendentes não são utilizáveis.
- **Expiração:** 7 dias, `expires_at default now() + interval '7 days'` (schema em `AUTHZ_TENANT`).
- **Unicidade:** unique index parcial `tenant_invites_pending_unique(tenant_id, email) where accepted_at is null and revoked_at is null`. Writes concorrentes → `23505` → RPC mapeia para `PENDING_INVITE_EXISTS`.
- **Reenvio:** flag `force=true` no POST pede à RPC `create_invite` que revogue (`revoked_at = now()`) o pendente e insira um novo.
- **Aceite autenticado:** user precisa estar logado com o email do convite. Comparação *case-insensitive* dentro da RPC `accept_invite` — handler não pré-valida.
- **Erros do aceite:** RPC agrupa `expired/revoked/accepted/email_mismatch` em `INVITE_NOT_USABLE` (410). GET `/api/invites/[token]` distingue pra UI (landing) mostrar mensagem certa.
- **Quem pode convidar com `role='owner'`:** primary owner (`tenants.owner_id`) ou super admin. Gate enforçado dentro de `create_invite` — não confiar no client.
- **Guard de primary/billing em aceite:** `accept_invite` rejeita se `_caller_id` já for primary/billing e o convite rebaixaria (ver `AUTHZ_TENANT §accept_invite`).
- **Email provider (MVP):** `lib/email.ts` em v1 faz `console.log` do payload. Manager copia o `inviteUrl` do response manualmente. Follow-up pós-MVP: integrar Supabase SMTP builtin ou Resend sem mexer em chamador (wrapper fino). Falha de envio NÃO desfaz criação.
- **Email em minúsculas:** normalizado em todos os writes/reads.

## Arquivos

| Arquivo | Ação | Descrição |
|---|---|---|
| `lib/invites.ts` | Criar | `generateInviteToken()`, `hashInviteToken(raw)`. |
| `lib/email.ts` | Criar | Wrapper `sendInviteEmail(args)` (fire-and-forget). |
| `app/api/tenants/[id]/invites/route.ts` | Criar | GET lista pendentes (reader+) · POST cria (manager+ → RPC `create_invite`). |
| `app/api/tenants/[id]/invites/[inviteId]/route.ts` | Criar | DELETE revoga (manager+ → RPC `revoke_invite`). |
| `app/api/invites/[token]/route.ts` | Criar | GET público (service-role) — detalhes do convite. |
| `app/api/invites/[token]/accept/route.ts` | Criar | POST (user-only → RPC `accept_invite`). |
| `app/invites/[token]/page.tsx` | Criar | Landing pública (fora do `(authed)`). |
| `app/(authed)/tenants/[id]/settings/members/page.tsx` | Atualizar | Modal "Convidar" + seção "Convites pendentes". |

## Schema

Fonte única: `AUTHZ_TENANT §Schema` (tabela `tenant_invites` com colunas `token`, `expires_at`, `accepted_at`, `revoked_at`, `invited_by` **nullable** `ON DELETE SET NULL` — preenchido no momento da criação, tornando-se `null` apenas após deleção ex-post do usuário convidante; unique index pendente; RLS com `insert/update/delete` revogado de `anon, authenticated`).

Mutações só via RPCs `create_invite` / `revoke_invite` / `accept_invite` — todas com `execute` revogado de `public, anon, authenticated`, invocadas via `createAdminClient().rpc(...)` nos handlers.

## Helpers

### `lib/invites.ts`

```ts
export function generateInviteToken(): string
export function hashInviteToken(raw: string): string
```

- `generateInviteToken` retorna `randomBytes(32).toString("base64url")`.
- `hashInviteToken` retorna `sha256(raw)` em hex. Usado em todos os writes/reads de token.

### `lib/email.ts`

```ts
interface SendInviteEmailArgs {
  to: string
  inviteUrl: string
  tenantName: string
  inviterName: string | null
  role: Role
}

export async function sendInviteEmail(args: SendInviteEmailArgs): Promise<void>
```

Contrato:
- v1: `console.log` do payload. Sempre resolve.
- v2: provider real (Resend / SMTP Supabase). Falha **não** deve lançar pro chamador — log interno + `.catch(console.error)` no POST.

## Endpoints

Salvo onde marcado, todos exigem `requireAuth` com `kind === "user"`. Erros não listados → `500`.

### `GET /api/tenants/[id]/invites`

- Auth: `requireTenantRole(auth, id, "reader")` (user-only).
- Query: nenhuma.
- Retorno: array `{ id, email, role, expires_at, created_at, invited_by }` filtrado por `accepted_at is null`, `revoked_at is null`, `expires_at > now()`.

### `POST /api/tenants/[id]/invites`

- Auth: `requireTenantRole(auth, id, "manager")` (user-only).
- Body: `{ email: string, role: "reader" | "editor" | "manager" | "owner", force?: boolean }`.
- Fluxo:
  1. Valida body; 400 `EMAIL_AND_ROLE_REQUIRED` se faltar.
  2. `token = generateInviteToken()` — raw 256-bit; nunca sai do handler.
  3. `const inviteId = await admin.rpc("create_invite", { _caller_id, _caller_is_super_admin, _tenant_id, _email, _role, _token: hashInviteToken(token), _force })` — RPC recebe **somente o hash** sha256 do raw; o raw nunca trafega para o banco nem para query logs do Postgres.
  4. Dispara `sendInviteEmail(...)` em fire-and-forget.
- Retorno: `{ id: inviteId, email: email.toLowerCase(), role, inviteUrl }` (inclui URL pro manager copiar manualmente se email falhar).
- Erros RPC → HTTP:
  - `INVALID_ROLE` → 400
  - `TENANT_NOT_FOUND` → 404
  - `INSUFFICIENT_ROLE`, `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_INVITE_OWNER` → 403
  - `PENDING_INVITE_EXISTS` → 409

### `DELETE /api/tenants/[id]/invites/[inviteId]`

- Auth: user-only.
- Fluxo: `admin.rpc("revoke_invite", { _caller_id, _caller_is_super_admin, _tenant_id, _invite_id })`.
- Erros RPC → HTTP:
  - `INVITE_NOT_FOUND` → 404
  - `INSUFFICIENT_ROLE` → 403

### `GET /api/invites/[token]` (público)

- Auth: **nenhuma** (landing funciona deslogado). Usa `createAdminClient()` pra bypass da RLS.
- Fluxo: `hashInviteToken(token)` → lookup em `tenant_invites` by hash; join `tenants(name)`. Não expõe o token (nem o hash) no payload.
- Retorno: `{ email, role, tenantName, expiresAt }`.
- Erros:
  - Lookup vazio → 404 `INVITE_NOT_FOUND`
  - `revoked_at is not null` → 410 `INVITE_REVOKED`
  - `accepted_at is not null` → 410 `INVITE_ALREADY_ACCEPTED`
  - `expires_at < now()` → 410 `INVITE_EXPIRED`

Códigos distintos são seguros aqui porque a rota é read-only (sem race entre leitura e efetivação).

### `POST /api/invites/[token]/accept`

- Auth: user-only.
- Fluxo:
  1. Resolve `invite_id` a partir do token da URL: o token raw é hasheado (`hashInviteToken`) antes do lookup em `tenant_invites`. 404 `INVITE_NOT_FOUND` se não encontrado.
  2. Lê email do usuário autenticado na sessão. 400 `USER_EMAIL_REQUIRED` se ausente.
  3. `admin.rpc("accept_invite", { _caller_id, _caller_email, _invite_id })`.
  4. Sucesso: seta cookie `next-calc-current-tenant = tenantId` (`httpOnly`, `sameSite: "lax"`, `path: "/"`) — caller acabou de ganhar acesso ao tenant, que deve virar o atual. Evita depender do fallback "primeiro da lista" em `getSessionContext` após o redirect da landing.
  5. Retorna `{ ok: true, tenantId }`.
- Erros RPC → HTTP:
  - `INVITE_NOT_USABLE` → 410 (agrupa expired/revoked/accepted/email_mismatch — cliente que quer aceitar não se beneficia de distinguir)
  - `CANNOT_MODIFY_PRIMARY_OWNER`, `CANNOT_MODIFY_BILLING_OWNER` → 409
  - demais → 500

## Landing — `app/invites/[token]/page.tsx`

Client component (token já está na URL; SSR não agrega segurança).

Contrato:
1. `GET /api/invites/[token]` → mostra `{ tenantName, role, email, expiresAt }`.
2. Se erro 410/404 → mensagem específica + link pra home.
3. Se deslogado → CTA "Entrar" (preserva `/invites/[token]` como redirect) / "Criar conta" (mantém token).
4. Se logado e `user.email === invite.email` (case-insensitive) → botão "Aceitar convite" → POST.
5. Se logado mas email diferente → mensagem "faça logout e entre com `<email>`".
6. Aceite ok → cookie `next-calc-current-tenant` já foi setado pelo handler; `router.push(\`/tenants/${tenantId}\`)` navega e `(authed)/layout.tsx` re-hidrata `tenantStore` com o novo tenant ativo.

## UI — `settings/members/page.tsx` (atualizar)

Adicionar:
- **Botão "+ Convidar membro"** (`PermissionGate minRole="manager"`) → modal:
  - Inputs: `email`, `role`.
  - Opções de `role` filtradas: MANAGER/OWNER 2° → `reader/editor/manager`; PRIMARY/SUPER → + `owner`.
  - Submit → POST `/api/tenants/[id]/invites`. Sucesso: toast + botão "Copiar link" com `inviteUrl` (fallback se email falhou).
  - Se o email convidado já for membro com role superior ao selecionado, o convite é criado mas falha no aceite com `INVITE_WOULD_DEMOTE_MEMBER` (409). Para UX mais clara, o modal pode fazer um check client-side em `GET /api/tenants/[id]/members` antes do POST e avisar "este email já é membro com role X" — não obrigatório, mas recomendado.
- **Seção "Convites pendentes"** (accordion ou tab) listando `email · role · expira em Xd · [revogar]`. Revogar → DELETE + refresh da lista.

## Verificação

1. MANAGER convida `foo@bar.com` como `editor` → 200 com `inviteUrl`; aparece em "Convites pendentes"; email chega (ou log console em dev).
2. Abrir link em anônima → "Faça login com foo@bar.com".
3. Login como `foo@bar.com` → landing mostra detalhes + botão "Aceitar".
4. Aceitar → redireciona pro tenant; user é `editor`.
5. POST aceitar de novo o mesmo token → 410 `INVITE_NOT_USABLE`.
6. MANAGER revoga pendente → destinatário abre link → GET retorna 410 `INVITE_REVOKED` (landing); POST accept → 410 `INVITE_NOT_USABLE`.
7. Convite expirado → GET → 410 `INVITE_EXPIRED`; POST → 410 `INVITE_NOT_USABLE`.
8. MANAGER convida com `role = "owner"` → 403 `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_INVITE_OWNER`.
9. OWNER 2° tenta convidar `role = "owner"` → 403 (mesmo código).
10. PRIMARY OWNER convida `role = "owner"` → 200; aceite cria OWNER 2° (primary/billing inalterados).
11. SUPER ADMIN convida `role = "owner"` → 200; mesmo efeito.
12. READER/EDITOR tenta POST → 403 `INSUFFICIENT_ROLE`.
13. Dois POSTs concorrentes pro mesmo `(tenant, email)` sem `force` → um 200 + um 409 `PENDING_INVITE_EXISTS` (mapeado do `23505`, não 500).
14. POST com `force=true` → pendente antigo fica `revoked_at`, novo token gerado.
15. Primary owner tenta aceitar convite com role < owner → 409 `CANNOT_MODIFY_PRIMARY_OWNER`.
16. Rota `POST /api/tenants/[id]/invites` com Bearer válido → 401 `USER_IDENTITY_REQUIRED`.

## Observações

- **Token como hash.** DB armazena `sha256(raw)`. Raw só existe em memória no handler e no `inviteUrl` do response. Lookups fazem `hashInviteToken(input)` antes de consultar. DB comprometido não expõe tokens utilizáveis.
- **Rate limiting.** Fora de escopo. O endpoint de criar convite é vetor de spam — follow-up obrigatório (50/hora por `invited_by` via middleware).
- **Token na URL.** Padrão da indústria (GitHub, Supabase Auth, etc.). OK porque é one-shot e expira.
- **Signup com token.** UX mais fluida: `/signup?invite=<token>` poderia tentar aceitar pós-signup. Fora do escopo desta fase.
- **Upsert no aceite.** Se destinatário já era membro e foi re-convidado com role diferente, `accept_invite` atualiza a row em `tenant_members`. Intencional — intenção do manager é clara.
- **Edge case — downgrade via invite.** Um MANAGER pode criar convite com `role: "editor"` para um email que já pertence a um secondary OWNER. Se o OWNER aceitar, seria rebaixado — algo que o MANAGER não consegue fazer via `change_member_role`. Para fechar o bypass: `accept_invite` **rejeita** a operação quando o role do convite é inferior ao role atual do membro (raise `INVITE_WOULD_DEMOTE_MEMBER`; handler mapeia para 409). Apenas um primário/super admin pode criar um convite que resulte em rebaixamento. **Guards de primary/billing owners já cobertos pelos checks 4 e 5 da RPC; este guard adicional cobre secondary owners.**
