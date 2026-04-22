# AUTHZ Fase 4 — Convites por email

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md) · depende de [`AUTHZ_TENANT.md`](./AUTHZ_TENANT.md) e [`AUTHZ_RBAC_UI.md`](./AUTHZ_RBAC_UI.md)

## Context

Hoje adicionar um membro a um tenant exige SQL direto no Supabase (inserir em `tenant_members`). O fluxo self-service precisa:

1. MANAGER+ escolhe um email e um role → sistema gera token, grava em `tenant_invites`, dispara email.
2. Destinatário clica no link → abre página pública (ou login) → se autenticado, vê detalhes do convite e aceita.
3. Aceite cria `tenant_members` e marca o convite como `accepted_at`.

A tabela `tenant_invites` já foi criada na Fase 1 (`AUTHZ_TENANT.md`). Esta fase foca no fluxo de ponta a ponta: routes, email, UI.

## Esforço: médio (~3h)

## Decisões-chave

- **Token único:** `crypto.randomBytes(32).toString("base64url")` (server-only).
- **Expiração padrão:** 7 dias (`expires_at = now() + interval '7 days'`).
- **Reuso de email:** se já existe convite pendente (não expirado, não aceito) para o mesmo `email+tenant`, retornamos 409 com opção `?force=true` que regenera o token (invalida o anterior marcando `revoked_at`).
- **Aceite autenticado:** o user precisa estar logado (com o email que recebeu o convite — senão 403 `EMAIL_MISMATCH`). Se não logado, landing da `/invites/[token]` redireciona para `/login?redirect=/invites/[token]`.
- **Email não cadastrado:** landing do convite mostra "Crie uma conta com este email para aceitar" + link para signup mantendo o token no retorno.
- **Manager convida qualquer role ≤ manager** (reader/editor/manager). **Primary owner (`tenants.owner_id`) OU super admin podem convidar com `role='owner'`** (múltiplos owners permitidos — ver `AUTHZ_TENANT.md`). OWNER secundário (row `role='owner'` que não é `owner_id`) **não pode** convidar outro owner. Primary ownership (`tenants.owner_id`) e billing ownership (`tenants.billing_id`) não são alterados via convite — só via `transfer-ownership` / `billing-owner`.
- **Provider de email:** **Supabase SMTP builtin** (zero dep), com possibilidade de trocar por Resend se volume crescer — isolado em `lib/email.ts`.

## Arquivos alterados

| Arquivo | Ação | Descrição |
|---|---|---|
| `app/api/tenants/[id]/invites/route.ts` | Criar | POST cria convite; GET lista pendentes |
| `app/api/tenants/[id]/invites/[inviteId]/route.ts` | Criar | DELETE revoga convite |
| `app/api/invites/[token]/route.ts` | Criar | GET detalhes públicos do token |
| `app/api/invites/[token]/accept/route.ts` | Criar | POST aceita (requer auth) |
| `app/invites/[token]/page.tsx` | Criar | Landing do convite (pública — fora do `(authed)`) |
| `app/(authed)/tenants/[id]/settings/members/page.tsx` | Atualizar | Modal "Convidar" + seção "Convites pendentes" |
| `lib/email.ts` | Criar | Wrapper fino para `sendInviteEmail({ to, inviteUrl, tenantName, inviterName })` |
| `lib/invites.ts` | Criar | `generateInviteToken`, `hashInviteToken` (se quisermos guardar só hash — ver observações) |

## 1. Schema (já aplicado na Fase 1)

O CREATE TABLE completo (colunas, defaults, `revoked_at`, índices, unique index
de convite pendente) está em **`AUTHZ_TENANT.md` §1** — que é a única fonte
da verdade. Resumo dos campos usados nesta fase:

- `token` — raw em texto claro (ver §Observações sobre a alternativa de hash).
- `expires_at` — default `now() + interval '7 days'`.
- `accepted_at` / `revoked_at` — controlam o estado do convite.
- Unique index `tenant_invites_pending_unique(tenant_id, email) where accepted_at is null and revoked_at is null` — no máximo 1 convite pendente por (tenant, email).

Se precisar alterar o schema, editar em `AUTHZ_TENANT.md` primeiro para manter as duas docs sincronizadas.

**RLS:**
- `select`: membro do tenant vê convites do próprio tenant (via `has_tenant_role('reader')`).
- `insert/update/delete`: **bloqueados** (`revoke insert, update, delete on tenant_invites from anon, authenticated`, ver `AUTHZ_TENANT.md §4`). Toda criação/revogação passa pelas RPCs `create_invite` / `revoke_invite` (`AUTHZ_TENANT.md §11`), invocadas pelo handler via `createAdminClient().rpc(...)`.
- Gate `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_INVITE_OWNER` (quem pode convidar com `role='owner'`) é enforçado **dentro** da RPC `create_invite` — não dá pra burlar via PostgREST direto.
- Guard pra primary/billing owner no aceite (`CANNOT_MODIFY_PRIMARY_OWNER` / `CANNOT_MODIFY_BILLING_OWNER`) vive em `accept_invite` (`AUTHZ_TENANT.md §11`).
- Rota pública `/api/invites/[token]` usa **service-role client** (sem RLS) pra lookup por token.

## 2. Helper — `lib/invites.ts`

```ts
import { randomBytes, createHash } from "node:crypto"

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}
```

## 3. Helper — `lib/email.ts`

```ts
// Wrapper mínimo — implementação inicial pode usar Supabase Admin email
// ou Resend via fetch. O importante é manter a assinatura estável.

interface SendInviteEmailArgs {
  to: string
  inviteUrl: string
  tenantName: string
  inviterName: string | null
  role: string
}

export async function sendInviteEmail(args: SendInviteEmailArgs): Promise<void> {
  // v1: stub console.log + envio via Supabase/Resend
  console.log("[invite email]", args)
  // TODO: integrar Resend/SMTP. Falha aqui NÃO deve desfazer a criação do convite
  // (manager pode copiar o link manualmente do response).
}
```

## 4. Route — `app/api/tenants/[id]/invites/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"
import { requireTenantRole } from "@/lib/tenant"
import { generateInviteToken } from "@/lib/invites"
import { sendInviteEmail } from "@/lib/email"

// GET — lista convites pendentes do tenant (user-only)
export async function GET(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // requireTenantRole rejeita kind: "tenant_key" com USER_IDENTITY_REQUIRED.
  const role = await requireTenantRole(auth, params.id, "reader")
  if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status })
  if (auth.kind !== "user") {
    return NextResponse.json({ error: "USER_IDENTITY_REQUIRED" }, { status: 401 })
  }

  const { data, error } = await auth.supabase
    .from("tenant_invites")
    .select("id, email, role, expires_at, created_at, invited_by")
    .eq("tenant_id", params.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — cria convite (user-only; manager+).
// Toda a lógica (check pending, revogar anterior com force=true, gate
// role='owner' via primary/super admin, insert) vive na RPC `create_invite`
// (`AUTHZ_TENANT.md §11`). O handler só:
//   1. Valida identidade (kind === "user") e role mínima (manager+).
//   2. Gera o token (entropy client-side não nos interessa — quem gera é o
//      server; a RPC só persiste).
//   3. Mapeia erros da RPC pra HTTP codes.
//   4. Dispara email (fire-and-forget).
export async function POST(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const role = await requireTenantRole(auth, params.id, "manager")
  if (!role.ok) return NextResponse.json({ error: role.error }, { status: role.status })
  if (auth.kind !== "user") {
    return NextResponse.json({ error: "USER_IDENTITY_REQUIRED" }, { status: 401 })
  }

  const { email, role: newRole, force } = await request.json() as {
    email: string; role: "reader" | "editor" | "manager" | "owner"; force?: boolean
  }

  if (!email || !newRole) return NextResponse.json({ error: "EMAIL_AND_ROLE_REQUIRED" }, { status: 400 })

  const token = generateInviteToken()
  const admin = createAdminClient()

  const { data, error } = await admin.rpc("create_invite", {
    _caller_id: auth.userId,
    _caller_is_super_admin: auth.isSuperAdmin,
    _tenant_id: params.id,
    _email: email,
    _role: newRole,
    _token: token,
    _force: force ?? false,
  })

  if (error) {
    const code = error.message
    if (code === "INVALID_ROLE")       return NextResponse.json({ error: code }, { status: 400 })
    if (code === "TENANT_NOT_FOUND")   return NextResponse.json({ error: code }, { status: 404 })
    if (code === "INSUFFICIENT_ROLE")  return NextResponse.json({ error: code }, { status: 403 })
    if (code === "ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_INVITE_OWNER") {
      return NextResponse.json({ error: code }, { status: 403 })
    }
    if (code === "PENDING_INVITE_EXISTS") {
      return NextResponse.json({ error: code }, { status: 409 })
    }
    return NextResponse.json({ error: code }, { status: 500 })
  }

  // A RPC retorna `table (id uuid, token text)`; Supabase devolve como array.
  const invite = Array.isArray(data) ? data[0] : data

  // Dispara email (não bloqueia falha). `tenants.name` lido via admin pra
  // não depender da RLS da sessão do caller.
  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/invites/${token}`
  const { data: tenant } = await admin
    .from("tenants").select("name").eq("id", params.id).single()
  const { data: { user } } = await auth.supabase.auth.getUser()

  sendInviteEmail({
    to: email,
    inviteUrl,
    tenantName: tenant?.name ?? "",
    inviterName: user?.user_metadata?.name ?? user?.email ?? null,
    role: newRole,
  }).catch(console.error)

  // Devolvemos o `inviteUrl` pro manager conseguir copiar manualmente se o
  // email falhar.
  return NextResponse.json({
    id: invite.id,
    email: email.toLowerCase(),
    role: newRole,
    inviteUrl,
  })
}
```

## 5. Route — `app/api/tenants/[id]/invites/[inviteId]/route.ts`

```ts
// DELETE — manager+ revoga convite pendente (user-only). Delega pra RPC
// `revoke_invite` — que checa role do caller + consistência tenant↔invite.
export async function DELETE(request, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.kind !== "user") {
    return NextResponse.json({ error: "USER_IDENTITY_REQUIRED" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { error } = await admin.rpc("revoke_invite", {
    _caller_id: auth.userId,
    _caller_is_super_admin: auth.isSuperAdmin,
    _tenant_id: params.id,
    _invite_id: params.inviteId,
  })

  if (error) {
    const code = error.message
    if (code === "INVITE_NOT_FOUND")   return NextResponse.json({ error: code }, { status: 404 })
    if (code === "INSUFFICIENT_ROLE")  return NextResponse.json({ error: code }, { status: 403 })
    return NextResponse.json({ error: code }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
```

## 6. Route pública — `app/api/invites/[token]/route.ts`

Precisa de **service-role** porque o visitante pode estar deslogado.

```ts
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET — detalhes do convite (não expõe token, só metadados)
export async function GET(_req, { params }) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("tenant_invites")
    .select("email, role, expires_at, accepted_at, revoked_at, tenants(name)")
    .eq("token", params.token)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: "INVITE_NOT_FOUND" }, { status: 404 })
  if (data.revoked_at) return NextResponse.json({ error: "INVITE_REVOKED" }, { status: 410 })
  if (data.accepted_at) return NextResponse.json({ error: "INVITE_ALREADY_ACCEPTED" }, { status: 410 })
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "INVITE_EXPIRED" }, { status: 410 })
  }

  return NextResponse.json({
    email: data.email,
    role: data.role,
    tenantName: (data as any).tenants?.name ?? "",
    expiresAt: data.expires_at,
  })
}
```

## 7. Route — `app/api/invites/[token]/accept/route.ts`

O handler resolve `invite_id` a partir do `token` (o token não é público —
só quem tem o link consegue chegar aqui) e delega **todas** as validações de
negócio pra RPC `accept_invite` (§11 de `AUTHZ_TENANT.md`):

- A RPC agrupa `expired/revoked/accepted/email_mismatch` em um único erro
  `INVITE_NOT_USABLE`. Isso elimina race conditions entre o lookup do handler
  e a escrita (o handler podia ver "válido" e a RPC falhar por revoke
  concorrente, ou vice-versa). Do ponto de vista do cliente que está tentando
  aceitar, os códigos distintos não ajudam — se não dá pra aceitar, não dá.
- O **`GET /api/invites/[token]`** (§6) continua distinguindo `INVITE_EXPIRED`
  / `INVITE_REVOKED` / `INVITE_ALREADY_ACCEPTED` pra UI mostrar mensagem
  correta na landing; ali não há efetivação, então a leitura "esticada" é
  segura.
- A RPC recebe `_caller_email` do handler (extraído de `auth.supabase.auth.getUser()`)
  e compara *case-insensitive* dentro da transação.

```ts
// POST — user autenticado aceita o convite (user-only)
export async function POST(request, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (auth.kind !== "user") {
    return NextResponse.json({ error: "USER_IDENTITY_REQUIRED" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Lookup apenas pra resolver token → invite_id (o token não é exposto
  // pra RPC, que só aceita UUID). Estado do convite é validado DENTRO da RPC.
  const { data: invite } = await admin
    .from("tenant_invites")
    .select("id")
    .eq("token", params.token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ error: "INVITE_NOT_FOUND" }, { status: 404 })

  const { data: { user } } = await auth.supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: "USER_EMAIL_REQUIRED" }, { status: 400 })
  }

  // RPC: valida estado + email-match + insere membership + marca accepted_at
  // em transação única. Chamada via admin (service-role) pra garantir que
  // passa independente de a role atual do user já cobrir o insert.
  const { data: tenantId, error } = await admin.rpc("accept_invite", {
    _caller_id: auth.userId,
    _caller_email: user.email,
    _invite_id: invite.id,
  })

  if (error) {
    // INVITE_NOT_USABLE agrupa expired/revoked/accepted/email_mismatch.
    // Qualquer um desses códigos = 410 Gone; demais = 500.
    const status = error.message === "INVITE_NOT_USABLE" ? 410 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ ok: true, tenantId })
}
```

## 8. Landing — `app/invites/[token]/page.tsx`

```tsx
// Fluxo:
// 1. fetch GET /api/invites/[token] → mostra {tenantName, role, email, expiresAt}
// 2. se user logado E email bate → botão "Aceitar convite" (POST accept)
// 3. se user logado E email NÃO bate → mensagem "faça logout e entre com <email>"
// 4. se user NÃO logado → CTA "Entrar" (guarda token no localStorage ou query) / "Criar conta"
// 5. após aceite → router.push(`/tenants/${tenantId}`)
// 6. se erro (expirado/revogado/404) → mensagem clara com link pra home

// Componente é client-side simples. Sem SSR especial necessário — o token
// não é sensível o suficiente pra justificar server-rendering (já é usado na URL).
```

## 9. UI — atualizar `app/(authed)/tenants/[id]/settings/members/page.tsx`

Adicionar:
- **Botão "+ Convidar membro"** → abre modal com inputs `email` + `role`. Opções de `role` no select dependem do caller:
  - MANAGER / OWNER secundário → `reader`, `editor`, `manager`
  - PRIMARY OWNER (`tenants.owner_id`) / SUPER ADMIN → tudo acima + `owner`
  POST → toast de sucesso com cópia do `inviteUrl` (fallback se email falhou).
- **Seção "Convites pendentes"** (accordion ou tab) listando `email · role · expira em X dias · [revogar]`.
- **PermissionGate `minRole="manager"`** em volta de tudo relacionado a convites.

## Verificação

1. MANAGER convida `foo@bar.com` como `editor` → 200 com `inviteUrl`; aparece em "Convites pendentes"; email chega (ou log no console em dev).
2. Abrir link em anônima → mostra "Faça login com foo@bar.com".
3. Login como `foo@bar.com` → página mostra detalhes, botão "Aceitar".
4. Clicar aceitar → redireciona pro tenant; user vira membro com role `editor`.
5. Aceitar de novo o mesmo token → 410 `INVITE_ALREADY_ACCEPTED`.
6. MANAGER revoga convite não aceito → destinatário abre link → 410 `INVITE_REVOKED`.
7. Convite expirado (esperar 7 dias ou forçar via SQL) → 410 `INVITE_EXPIRED`.
8. MANAGER tenta convidar com `role = "owner"` → 403 `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_INVITE_OWNER`.
9. OWNER **secundário** (role=owner mas não é `tenants.owner_id`) tenta convidar com `role = "owner"` → 403 `ONLY_PRIMARY_OWNER_OR_SUPER_ADMIN_CAN_INVITE_OWNER`.
10. PRIMARY OWNER (`tenants.owner_id`) convida com `role = "owner"` → 200; aceite cria OWNER secundário (primary e billing continuam inalterados).
11. SUPER ADMIN convida com `role = "owner"` → 200; mesmo efeito que o caso anterior.
12. READER/EDITOR tenta POST → 403 (manager+ obrigatório).
13. MANAGER convida o mesmo email duas vezes sem `force` → 409.
14. MANAGER convida com `force=true` → antigo fica `revoked_at`, novo token gerado.

## Observações

- **Hash do token vs token em texto claro.** Decidi guardar **em texto claro** por simplicidade: o token já tem 256 bits de entropia, é acessado apenas por quem tem o link exato, e a tabela só é lida por service-role ou via RLS do próprio tenant. Se virar requisito (compliance etc.), trocar pra guardar `token_hash` e procurar por `sha256(input)` — o helper `hashInviteToken` já está previsto em `lib/invites.ts`.
- **Rate limiting.** Fora de escopo desta fase, mas o endpoint de criar convite é um vetor de spam. Próxima leva: rate limit por `invited_by` (ex: 50/hora) via middleware.
- **Email em minúsculas.** Normalizado em todos os writes/reads (`email.toLowerCase()`) pra evitar `Foo@bar.com` vs `foo@bar.com`.
- **Provider de email (MVP).** `lib/email.ts` em v1 só faz `console.log` do payload — isso é **aceitável no MVP**: manager copia o `inviteUrl` do response do POST manualmente. Toda a Fase 4 permanece funcional sem provider real. Follow-up obrigatório pós-MVP: integrar Supabase SMTP builtin ou Resend (anotar em `TODO.md`). O wrapper é deliberadamente fino pra facilitar a troca futura sem mexer no resto do código.
- **Token na URL.** Padrão da indústria (GitHub, GitLab, Supabase Auth confirmation). OK pra esse caso porque é one-shot e expira.
- **Signup com token.** Se quisermos UX mais fluida no futuro, adaptar `/signup` pra aceitar `?invite=<token>` e no sucesso do signup já tentar aceitar — fora do escopo desta fase.
- **Aceite atualiza role existente.** O `upsert` em `tenant_members` cobre o caso raro onde o destinatário já era membro e foi re-convidado com role diferente. Não tratamos como erro porque a intenção do manager é clara.
