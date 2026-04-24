# AUTHZ Incremental — Fase 2: Convites por Email

> **Depende de:** Fase 1 — [`1_RBAC.md`](./1_RBAC.md) (`user_roles` + `requireRole`)
> **Próxima fase:** [`3_SETTINGS.md`](./3_SETTINGS.md)
> **Referência completa:** [`../AUTHZ_COMPLETE/AUTHZ_INVITES.md`](../AUTHZ_COMPLETE/AUTHZ_INVITES.md)

Sem convite self-service, adicionar um user exige SQL direto. Esta fase fecha o loop:

1. Admin escolhe email + role → POST cria convite → email dispara (ou copia URL da response).
2. Destinatário clica no link → landing pública → login se necessário → aceita.
3. Aceite cria row em `user_roles` com o role do convite e marca `accepted_at`.

**Motivação:** controlar quem acessa a plataforma sem depender de SQL.

---

## Decisões-chave

### Token: hash, nunca raw no DB

- `generateInviteToken()` → `crypto.randomBytes(32).toString("base64url")` (256 bits).
- `hashInviteToken(raw)` → `sha256(raw)` em hex.
- `invites.token_hash` guarda **somente o hash**. Raw existe apenas em-memória no handler do POST e no `inviteUrl` do response.
- Lookups: `WHERE token_hash = hashInviteToken(input)`. DB comprometido não expõe tokens utilizáveis.

### Expiração: 7 dias

`expires_at DEFAULT now() + interval '7 days'`. Convite expirado → `INVITE_EXPIRED` (GET landing) / `INVITE_NOT_USABLE` (POST accept).

### Unicidade: um convite pendente por email

Unique index parcial: `(email) WHERE accepted_at IS NULL AND revoked_at IS NULL`.
Race entre dois POSTs concorrentes → `23505` capturado e mapeado para `409 PENDING_INVITE_EXISTS`.

### Reenvio: flag `force`

Body com `force: true` no POST revoga o pendente e insere novo atomicamente (sem race).

### Aceite exige login com o email do convite

Comparação case-insensitive `lower(invite.email) = lower(caller.email)`. Handler valida o email do user autenticado antes de mutar.

### Email v1: `console.log` do payload

`lib/email.ts` em v1 faz `console.log`. Admin copia `inviteUrl` da response manualmente.
Falha de email **não** desfaz a criação do convite — fire-and-forget.

### Roles disponíveis no convite

`admin` só pode convidar `editor` ou `reader`. Convidar com `admin` → `403 INSUFFICIENT_ROLE` (admin não pode criar outros admins via convite — apenas via `PATCH /api/users/[id]/role` após o aceite). Isso evita escalação de privilégio via convite aceito por email errado.

### Aceite em cima de role superior → bloqueado

Se o destinatário já existe em `user_roles` com role superior ao convite → `409 INVITE_WOULD_DEMOTE_USER`. Handler não faz upsert sem validar. Garante que convite não é vetor de rebaixamento acidental.

---

## Schema

### `invites` (nova tabela)

| Coluna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` | |
| `email` | text NOT NULL | | normalizado lowercase |
| `role` | text NOT NULL CHECK in (`editor`, `reader`) | | — `admin` não permitido via convite |
| `token_hash` | text UNIQUE NOT NULL | | sha256 hex do raw |
| `invited_by` | uuid → `auth.users(id) on delete set null` (nullable) | | preserva histórico; `null` só após deleção do autor |
| `expires_at` | timestamptz NOT NULL | `now() + interval '7 days'` | |
| `accepted_at` | timestamptz | | |
| `revoked_at` | timestamptz | | |
| `created_at` | timestamptz NOT NULL | `now()` | |

Unique index parcial: `invites_pending_unique(email) WHERE accepted_at IS NULL AND revoked_at IS NULL`.

Índices: `(token_hash)`, `(email)`.

RLS: `authenticated full access` (enforcement via `requireRole` nos handlers).

---

## Helpers (`lib/invites.ts`, `lib/email.ts`)

Fronteiras internas — funções TypeScript.

### `lib/invites.ts`

```ts
function generateInviteToken(): string
// → randomBytes(32).toString("base64url") — 256 bits de entropia

function hashInviteToken(raw: string): string
// → sha256(raw) em hex — usado em todos os writes e lookups
```

### `lib/email.ts`

```ts
interface SendInviteEmailArgs {
  to: string
  inviteUrl: string
  inviterEmail: string | null
  role: "editor" | "reader"
}

async function sendInviteEmail(args: SendInviteEmailArgs): Promise<void>
```

Contrato:
- v1: `console.log` do payload. Sempre resolve sem lançar.
- v2: provider real (Resend / SMTP Supabase). Falha não lança ao chamador — `.catch(console.error)` interno.

---

## Endpoints — contratos

| Método | Rota | Auth | Request | Response | Erros principais |
|---|---|---|---|---|---|
| `GET /api/invites` | user, admin | — | `InviteRecord[]` | 403 |
| `POST /api/invites` | user, admin | `{ email, role, force? }` | `{ id, email, role, inviteUrl }` | 400 `EMAIL_AND_ROLE_REQUIRED` · 400 `INVALID_ROLE` · 403 · 409 `PENDING_INVITE_EXISTS` |
| `DELETE /api/invites/[id]` | user, admin | — | `{ ok: true }` | 403 · 404 `INVITE_NOT_FOUND` |
| `GET /api/invites/[token]` | **público** (sem auth) | — | `{ email, role, expiresAt }` | 404 `INVITE_NOT_FOUND` · 410 `INVITE_REVOKED` · 410 `INVITE_ALREADY_ACCEPTED` · 410 `INVITE_EXPIRED` |
| `POST /api/invites/[token]/accept` | user (qualquer role) | — | `{ ok: true }` | 400 `USER_EMAIL_REQUIRED` · 404 · 409 `INVITE_WOULD_DEMOTE_USER` · 410 `INVITE_NOT_USABLE` |

### `GET /api/invites/[token]` (público)

Usa service-role para bypass do RLS. Não expõe `token_hash`.
Lookup: `hashInviteToken(token)` → `SELECT * FROM invites WHERE token_hash = ?`.
Retorna detalhes apenas se não revogado/aceito/expirado — códigos distintos são seguros aqui porque é read-only (sem race entre leitura e efetivação).

### `POST /api/invites/[token]/accept`

1. Hash do token → lookup em `invites`; 404 se não encontrar.
2. Lê email do user autenticado; 400 `USER_EMAIL_REQUIRED` se ausente.
3. Valida: `invite.accepted_at IS NULL AND invite.revoked_at IS NULL AND invite.expires_at > now()` + `lower(invite.email) = lower(caller.email)`. Qualquer falha → 410 `INVITE_NOT_USABLE`.
4. Verifica se `user_roles` já existe para o caller com role > invite.role → 409 `INVITE_WOULD_DEMOTE_USER`.
5. Upsert em `user_roles` (INSERT ou UPDATE se role superior); seta `accepted_at = now()`.
6. Retorna `{ ok: true }`.

---

## Proxy — atualização

`proxy.ts` deve excluir `/invites/*` e `/api/invites/*` do redirect de auth:
- `GET /api/invites/[token]` — endpoint público (landing funciona sem sessão).
- `app/invites/[token]` — landing pública (fora do grupo autenticado).

---

## Landing — `app/invites/[token]/page.tsx`

Client component. Adicionar `Referrer-Policy: no-referrer` nos response headers desta rota (via `next.config.ts`) — evita vazamento do token via `Referer` header se a página carregar recursos externos.

Contrato:
1. `GET /api/invites/[token]` → mostra `{ email, role, expiresAt }`.
2. Erro 404/410 → mensagem específica + link pra home.
3. Deslogado → CTA "Entrar" (preserva `/invites/[token]` como redirect após login).
4. Logado com email correto → botão "Aceitar convite" → POST accept.
5. Logado com email diferente → "Faça logout e entre com `<email>`".
6. Aceite ok → `router.push("/")` (home; Fase 3 entrega settings de users).

---

## Evolução para Fase 4 (tenant)

| Global (Fase 2) | Tenant (Fase 4) |
|---|---|
| `invites` sem `tenant_id` | `tenant_invites` com `tenant_id` |
| Aceite cria row em `user_roles` | Aceite cria row em `tenant_members` |
| Mutação direta no handler | Mutação via RPC `accept_invite` (invariantes de ownership) |
| Roles: `editor/reader` | Roles: `owner/manager/editor/reader` (com guards de ownership) |
| Qualquer admin convida | Manager+ convida; primary owner/super admin convida `owner` |

O schema de `invites` ganha `tenant_id` via migration aditiva (nullable, depois NOT NULL).

---

## Verificação

1. Admin convida `foo@bar.com` como `editor` → 200 com `inviteUrl`; aparece em `GET /api/invites`.
2. Abre link em anônimo → landing mostra email/role/expiração.
3. Login como `foo@bar.com` → botão "Aceitar" disponível.
4. Aceita → user existe em `user_roles` com `role='editor'`.
5. POST de aceite de novo no mesmo token → `410 INVITE_NOT_USABLE`.
6. Admin revoga convite → destinatário abre link → `410 INVITE_REVOKED`.
7. Convite expirado → GET → `410 INVITE_EXPIRED`; POST accept → `410 INVITE_NOT_USABLE`.
8. Admin tenta convidar com `role='admin'` → `400 INVALID_ROLE`.
9. Dois POSTs concorrentes para mesmo email sem `force` → um 200 + um `409 PENDING_INVITE_EXISTS`.
10. POST com `force=true` → pendente antigo fica `revoked_at`, novo token gerado.
11. User já com `editor`, aceita convite como `reader` → `409 INVITE_WOULD_DEMOTE_USER`.
12. Bearer qualquer em `POST /api/invites` → `401 USER_IDENTITY_REQUIRED`.
