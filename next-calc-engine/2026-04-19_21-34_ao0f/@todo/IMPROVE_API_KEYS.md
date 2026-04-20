# API Keys para acesso M2M (user-scoped)

## Context

Hoje a autenticação da app é 100% baseada em cookie de sessão do Supabase:

- `lib/supabase/client.ts` expõe `createSupabaseClient()` que chama `createServerClient` do `@supabase/ssr` com a **anon key** e lê cookies via `next/headers`.
- **Não existe `middleware.ts`** no projeto — proteção é implícita via RLS: se o request não tem cookie de sessão válido, o client cai no role `anon` e as policies bloqueiam o acesso.
- `db/rls.sql` tem policies grosseiras: `authenticated full access` em `projects` e `engines`. Qualquer usuário logado vê tudo. Não há coluna `user_id` em nenhuma tabela de negócio.

Para consumidores externos (ex: outra app que quer executar cálculos via `/api/calc/*`), cookie de sessão não é prático — precisamos de uma **API key estática** usável em `Authorization: Bearer <key>`.

**Decisão arquitetural importante:** a API key precisa ser **atrelada a um `user_id`** (FK para `auth.users`), não uma key "de sistema" global. Razões:

1. Quando o RLS for refinado para multi-tenant (`user_id = auth.uid()`), as keys já nascerão no modelo certo.
2. Revogar uma key afeta só o dono, não todos os consumidores.
3. `last_used_at` / audit trail fazem sentido por dono.
4. UI de gerenciamento ("Minhas API Keys") fica natural em Settings do próprio user.

Como validar uma key não passa por sessão, precisamos de um **cliente service-role** (`SUPABASE_SERVICE_ROLE_KEY`) que bypassa RLS — exclusivamente no lado server.

## Esforço: médio (~2-3h)

## Arquivos alterados

| Arquivo | Ação | Descrição |
|---|---|---|
| `db/api_keys.sql` | Criar | Tabela `api_keys` user-scoped + RLS |
| `lib/supabase/admin.ts` | Criar | Cliente service-role (bypassa RLS) |
| `lib/api-keys.ts` | Criar | `hashKey()` + `validateApiKey()` que retorna `{ userId }` |
| `lib/auth.ts` | Criar | Helper `requireAuth(request)` — Bearer OU cookie |
| `app/api/calc/[...segments]/route.ts` | Atualizar | Usar `requireAuth` + client correto |
| `app/api/api-keys/route.ts` | Criar | GET lista, POST gera |
| `app/api/api-keys/[id]/route.ts` | Criar | DELETE revoga |
| `app/settings/api-keys/page.tsx` | Criar | UI listar / gerar / revogar |
| `.env.example` | Atualizar | `SUPABASE_SERVICE_ROLE_KEY` |
| `bruno/environments/local.bru` | Atualizar | `apiKey` em `vars:secret` |
| `bruno/environments/staging.bru` | Atualizar | Idem |
| `bruno/calc/calculate.bru` | Atualizar | Header `Authorization: Bearer {{apiKey}}` |

## 1. SQL — `db/api_keys.sql`

```sql
create table api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,                 -- ex: "app-produto-xyz"
  key_hash      text not null unique,          -- SHA-256 da chave raw (hex)
  last_used_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index api_keys_user_id_idx on api_keys(user_id);

alter table api_keys enable row level security;

-- User só vê/gerencia as próprias keys
create policy "users manage own api_keys" on api_keys
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

Rodar no SQL Editor do Supabase.

**Nota sobre `key_hash`:** nunca armazenamos a chave raw. Só o SHA-256 hex dela. O raw é mostrado ao usuário **uma única vez** no momento da criação. Perdeu = gera outra.

## 2. Env — `.env.example`

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # ← novo. NUNCA expor no client.
```

## 3. Service-role client — `lib/supabase/admin.ts`

```ts
import { createClient } from "@supabase/supabase-js"

/**
 * Service-role client — bypassa RLS.
 *
 * Usar APENAS em código server (route handlers, server actions).
 * Jamais importar em client components ou expor a key.
 *
 * Casos de uso:
 *  - Validar API key sem contexto de sessão (lookup pelo hash).
 *  - Executar queries "em nome de" um user autenticado via API key
 *    (filtrando manualmente por user_id).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

## 4. Helper de API keys — `lib/api-keys.ts`

```ts
import { createHash, randomBytes } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

/** Gera uma chave raw (base64url, 32 bytes de entropia). */
export function generateRawKey(): string {
  return randomBytes(32).toString("base64url")
}

/** Hash SHA-256 (hex) do raw. */
export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

/**
 * Valida a chave raw. Retorna o user_id dono se válida, ou null.
 *
 * Usa service-role porque não há sessão no ato da validação.
 */
export async function validateApiKey(
  raw: string,
): Promise<{ userId: string } | null> {
  if (!raw) return null

  const hash = hashKey(raw)
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("api_keys")
    .select("id, user_id")
    .eq("key_hash", hash)
    .maybeSingle()

  if (error || !data) return null

  // fire-and-forget: atualiza last_used_at (não bloqueia)
  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)

  return { userId: data.user_id as string }
}
```

## 5. Helper de auth — `lib/auth.ts`

```ts
import { NextRequest } from "next/server"
import { createSupabaseClient } from "@/lib/supabase/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { validateApiKey } from "@/lib/api-keys"
import type { SupabaseClient } from "@supabase/supabase-js"

export type AuthResult =
  | { ok: true; userId: string; supabase: SupabaseClient; via: "bearer" | "cookie" }
  | { ok: false; status: 401; error: string }

/**
 * Autentica o request via Bearer token OU cookie de sessão.
 *
 * - Bearer: valida a API key, retorna um client service-role.
 *   Cabe ao caller filtrar queries por `userId` (RLS não está ativo nesse client).
 * - Cookie: usa o cliente SSR normal; RLS vigora automaticamente.
 *
 * Em ambos os casos retorna { userId, supabase }.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  // 1) Bearer
  const authHeader = request.headers.get("authorization")
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const raw = authHeader.slice(7).trim()
    const result = await validateApiKey(raw)
    if (!result) {
      return { ok: false, status: 401, error: "INVALID_API_KEY" }
    }
    return {
      ok: true,
      userId: result.userId,
      supabase: createAdminClient(),
      via: "bearer",
    }
  }

  // 2) Cookie
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, status: 401, error: "UNAUTHENTICATED" }
  }
  return { ok: true, userId: user.id, supabase, via: "cookie" }
}
```

## 6. Rota `/api/calc/[...segments]/route.ts`

Adicionar `requireAuth` no topo e usar o client retornado. Importante: quando auth veio via Bearer, o client é service-role e **não** filtra por RLS — cabe à route filtrar manualmente por `user_id` onde for relevante.

```ts
import { requireAuth } from "@/lib/auth"

export async function POST(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { supabase, userId, via } = auth

  // ... busca de project/engine igual hoje, mas:
  // - se vier via bearer + algum dia tiver user_id na tabela, adicionar .eq("user_id", userId)
  // - se vier via cookie, RLS já cuida
  // Por enquanto (RLS grosseiro), as queries seguem iguais.
}
```

**Observação:** hoje `projects` e `engines` não têm `user_id` — então o filtro manual é no-op. Quando refinar o RLS pra multi-tenant, essa route já terá o `userId` em mãos.

## 7. Rotas de gerenciamento

### `app/api/api-keys/route.ts`

```ts
// GET — lista keys do user autenticado (nunca retorna key_hash)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // Via cookie: RLS filtra por auth.uid() automaticamente
  // Via bearer: service-role; filtrar manualmente
  const query = auth.supabase
    .from("api_keys")
    .select("id, name, last_used_at, created_at")
    .order("created_at", { ascending: false })

  const { data, error } = auth.via === "bearer"
    ? await query.eq("user_id", auth.userId)
    : await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ keys: data })
}

// POST — gera nova key, retorna raw UMA vez
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { name } = await request.json()
  if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 })

  const raw = generateRawKey()
  const key_hash = hashKey(raw)

  const { data, error } = await auth.supabase
    .from("api_keys")
    .insert({ user_id: auth.userId, name, key_hash })
    .select("id, name, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // raw só aparece nesta response. Nunca mais.
  return NextResponse.json({ ...data, raw })
}
```

### `app/api/api-keys/[id]/route.ts`

```ts
// DELETE — revoga
export async function DELETE(request: NextRequest, { params }) {
  const auth = await requireAuth(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const query = auth.supabase.from("api_keys").delete().eq("id", params.id)
  const { error } = auth.via === "bearer"
    ? await query.eq("user_id", auth.userId)  // protege contra deletar de outro user
    : await query                              // RLS já protege

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

## 8. UI — `app/settings/api-keys/page.tsx`

Página simples server component + client component pra interação:

- Lista das keys do user (`name`, `last_used_at`, `created_at`, botão "Revogar")
- Botão "+ Nova Key" → modal com input de `name` → chama POST → mostra o `raw` UMA vez com aviso "copie agora, não será mostrado novamente" + botão copy
- Ao confirmar fechar: o raw some da UI

Estilo: seguir padrão dos outros componentes do `app/` (mesmas fontes, cores, espaçamento).

## 9. Bruno — testar com API key

`bruno/environments/local.bru` e `staging.bru`:
```
vars:secret [
  email,
  password,
  apiKey
]
```

`bruno/calc/calculate.bru`:
```
headers {
  Content-Type: application/json
  Authorization: Bearer {{apiKey}}
}
```

Preencher `apiKey` nas variáveis secretas do ambiente com a chave raw gerada via UI.

## Verificação

1. Rodar `db/api_keys.sql` no Supabase
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`
3. `yarn dev` — sem erros de TS/lint
4. Login como user A → `/settings/api-keys` → gerar key "teste" → copiar raw
5. `curl -X POST http://localhost:3000/api/calc/<engineId> -H "Authorization: Bearer <raw>" -d '{"inputs":{...}}'` → 200 + resultado
6. Mesmo curl com `-H "Authorization: Bearer chave-errada"` → 401 `INVALID_API_KEY`
7. Mesmo curl sem header e sem cookie → 401 `UNAUTHENTICATED`
8. Login como user B → `/settings/api-keys` → **não vê** a key do user A
9. `DELETE /api/api-keys/<id>` como dono → 200; próxima chamada com aquela key → 401
10. `GET /api/api-keys` com Bearer da própria key → lista só as keys do dono (nunca retorna `key_hash`)

## Observações

- **Nunca logar a chave raw.** Nem em console, nem em dev tools — ela só aparece na response do POST.
- **Service-role key** é secret absoluto. Só em `process.env` server-side. Nunca em `NEXT_PUBLIC_*`.
- **Rate limiting** não está no escopo — adicionar depois se houver abuso.
- **Rotação:** não há endpoint de "rotate"; fluxo é revogar + gerar nova.
- **RLS atual é grosseiro** (`authenticated full access` em projects/engines). Este design já planta o `user_id` nas keys; quando o RLS for refinado pra `user_id = auth.uid()` nas tabelas de negócio, nada aqui muda — só `/api/calc/*` passa a precisar filtrar por `user_id`, mas o `requireAuth` já entrega ele.
- **Bearer em todas as rotas?** `requireAuth` aceita Bearer em qualquer route que chame ele. Se quiser restringir Bearer só a `/api/calc/*`, adicionar um flag `{ allowBearer: false }` no helper. Por ora, liberado geral — keys são user-scoped então não há escalada de privilégio.
