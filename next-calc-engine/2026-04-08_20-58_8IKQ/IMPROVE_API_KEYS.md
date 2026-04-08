# API Keys para acesso M2M

## Context
A aplicação tem auth via cookie de sessão (Supabase). Para consumidores externos (ex: outra app que quer executar cálculos), cookie de sessão não é prático — precisamos de uma API key estática que possa ser usada em headers `Authorization: Bearer`.

A solução usa uma tabela `api_keys` no Supabase com o hash SHA-256 da chave (a chave raw nunca é armazenada). O middleware aceita Bearer token como alternativa ao cookie.

## Esforço: pequeno (~1h)

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| `db/api_keys.sql` | Criar — tabela + RLS |
| `middleware.ts` | Atualizar — verificar Bearer antes do cookie |
| `lib/api-keys.ts` | Criar — helper de validação |
| `bruno/environments/local.bru` | Atualizar — adicionar `apiKey` como var:secret |
| `bruno/environments/staging.bru` | Idem |
| `bruno/calc/calculate.bru` | Atualizar — adicionar header `Authorization` |

## 1. SQL — `db/api_keys.sql`

```sql
create table api_keys (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,            -- ex: "app-produto-xyz"
  key_hash   text not null unique,     -- SHA-256 da chave raw (hex)
  created_at timestamptz default now()
);

alter table api_keys enable row level security;

-- anon pode SELECT (hash não é dado sensível — não dá para reverter SHA-256)
create policy "anon can read hashes" on api_keys
  for select to anon using (true);
```

Rodar no SQL Editor do Supabase.

## 2. Gerar uma chave

```bash
# gerar chave raw (guardar este valor — não será armazenado)
openssl rand -base64 32

# gerar o hash para inserir no banco
echo -n "<chave-raw>" | shasum -a 256 | awk '{print $1}'
```

Inserir no Supabase:
```sql
insert into api_keys (name, key_hash)
values ('app-produto-xyz', '<hash-hex-aqui>');
```

## 3. Helper — `lib/api-keys.ts`

```ts
import { createServerClient } from "@supabase/ssr"
import { createHash } from "crypto"

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export async function validateApiKey(raw: string): Promise<boolean> {
  const hash = hashKey(raw)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("key_hash", hash)
    .maybeSingle()

  return data !== null
}
```

## 4. Middleware — `middleware.ts`

Adicionar verificação de Bearer antes do check de sessão:

```ts
// antes do bloco de redirect:
const authHeader = request.headers.get("authorization")
if (authHeader?.startsWith("Bearer ")) {
  const raw = authHeader.slice(7)
  const valid = await validateApiKey(raw)
  if (valid) return supabaseResponse   // passa direto, sem sessão
}
```

O middleware fica assim (trecho relevante):

```ts
import { validateApiKey } from "@/lib/api-keys"

// ...dentro de middleware():
const authHeader = request.headers.get("authorization")
if (authHeader?.startsWith("Bearer ")) {
  const valid = await validateApiKey(authHeader.slice(7))
  if (valid) return supabaseResponse
}

if (isAuthRoute) return supabaseResponse
if (!user && !isLoginPage) { /* redirect login */ }
// ...
```

## 5. Bruno — testar com API key

`bruno/environments/local.bru`:
```
vars:secret [
  email,
  password,
  apiKey
]
```

`bruno/calc/calculate.bru` — adicionar header opcional:
```
headers {
  Content-Type: application/json
  Authorization: Bearer {{apiKey}}
}
```

Preencher `apiKey` nas variáveis secretas do ambiente com a chave raw gerada.

## Verificação

1. Rodar o SQL no Supabase
2. Gerar chave + inserir hash no banco
3. `yarn dev`
4. Chamar `/api/calc/:id` sem cookie mas com `Authorization: Bearer <chave>` → resposta normal
5. Chamar com chave errada → redirect para `/login` (401 implícito)
6. Chamar sem header → redirect para `/login` (comportamento atual)

## Observações

- A chave raw deve ser tratada como senha — guardar em vault ou secret manager do ambiente
- Para revogar: deletar a linha na tabela `api_keys`
- `last_used_at`: pode ser adicionado depois com um UPDATE na route de calc (não no middleware, para não bloquear performance)
- Por ora todas as rotas aceitam API key; se quiser restringir apenas `/api/calc/*`, adicionar `pathname.startsWith("/api/calc/")` na condição do middleware
