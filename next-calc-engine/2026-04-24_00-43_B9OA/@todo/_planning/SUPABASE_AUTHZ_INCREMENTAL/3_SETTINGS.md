# AUTHZ Incremental — Fase 3: UI de Gestão

> **Depende de:** Fase 1 — [`1_RBAC.md`](./1_RBAC.md) · Fase 2 — [`2_INVITES.md`](./2_INVITES.md)
> **Próxima fase:** [`4_TENANT.md`](./4_TENANT.md)
> **Referência completa:** [`../SUPABASE_AUTHZ_COMPLETE/AUTHZ_RBAC_UI.md`](../SUPABASE_AUTHZ_COMPLETE/AUTHZ_RBAC_UI.md)

Fases 1 e 2 entregam o backend (roles, API keys com role, convites). Esta fase entrega a UI de gestão para que o admin possa administrar tudo sem Bruno ou SQL.

**Motivação:** com RBAC + invites em pé, a gestão via API/Bruno fica impraticável. Precisa de UI.

---

## Decisões-chave

### Sem tenant nesta fase — gestão global

Todas as páginas desta fase são globais (sem `tenantId`). Quando Fase 4 chegar, as páginas se tornam `app/(authed)/settings/*` dentro do layout de tenant.

### `PermissionGate` — client component defensivo

UI usa `role` do store para esconder elementos. **Nunca é autoritativa** — o server valida em paralelo (defesa em profundidade). Se alguém inspecionar o DOM e chamar a API direto, os handlers retornam os erros corretos.

### `roleStore` — sem localStorage

O role do usuário autenticado é SSR-hydrated a partir do `getSessionContext()` e espelhado num store client-side via `<SessionHydrator>`. **Sem `persist` / localStorage** — evita que user B herde role de user A no mesmo browser após logout.

---

## `getSessionContext()` (server helper)

```ts
type Session = {
  user: { id: string; email: string | null }
  role: GlobalRole               // de user_roles
}

async function getSessionContext(): Promise<Session | null>
```

Chamado em `app/(authed)/layout.tsx`. Retorna `null` se não autenticado. Role não encontrado em `user_roles` → `null` (tratado como não autenticado para esta fase).

---

## Componentes

### `SessionHydrator`

Client component. Recebe `Session` do layout SSR e chama `useRoleStore().hydrate(session)` uma vez no mount.

### `PermissionGate`

```ts
interface PermissionGateProps {
  minRole: GlobalRole
  children: React.ReactNode
  fallback?: React.ReactNode
}
```

Renderiza `children` se `RANK[store.role] >= RANK[minRole]`. Esconde silenciosamente (sem fallback) por default.

### `stores/roleStore.ts`

Store único da sessão autenticada. **Sem `persist`.**

```ts
interface RoleState {
  user: { id: string; email: string | null } | null
  role: GlobalRole | null
  hydrate: (session: Session) => void
}
```

---

## Arquivos

| Arquivo | Ação | Descrição |
|---|---|---|
| `lib/session.ts` | Criar | `getSessionContext()` SSR |
| `stores/roleStore.ts` | Criar | Store cliente (sem persist) |
| `components/SessionHydrator/index.tsx` | Criar | Hidrata `roleStore` com `Session` |
| `components/PermissionGate/index.tsx` | Criar | Gate UI por `minRole` |
| `app/(authed)/layout.tsx` | Criar | Layout autenticado — chama `getSessionContext()` + redirects |
| `app/(authed)/settings/users/page.tsx` | Criar | Listar users + gerenciar roles |
| `app/(authed)/settings/api-keys/page.tsx` | Criar | Listar + criar + revogar API keys |
| `app/(authed)/settings/invites/page.tsx` | Criar | Listar pendentes + convidar + revogar |

---

## Layouts

### `app/(authed)/layout.tsx` (server)

1. `const session = await getSessionContext()`.
2. `!session` → `redirect("/login")`.
3. Renderiza `<SessionHydrator session={...} /> {children}`.

Todas as páginas autenticadas ficam dentro do route group. Fora: `/login`, `/invites/[token]`.

---

## Páginas de settings

### `app/(authed)/settings/users/page.tsx`

- Acesso: `admin` only (`PermissionGate minRole="admin"` + validação no server).
- Lista users com email, role badge, data de criação.
- Dropdown de role por row (`reader/editor`) — `admin` não aparece como opção (evita criação acidental de admins via UI; para promover admin, usar `PATCH /api/users/[id]/role` direto ou SQL).
- Feedback inline após change (toast de sucesso/erro).
- Linha do próprio user: dropdown desabilitado com tooltip "Não é possível alterar próprio role".

### `app/(authed)/settings/api-keys/page.tsx`

- Acesso: `editor+`.
- Lista keys ativas: `name`, `role` badge, `created_at`.
- "+ Nova Key" → modal: input `name` + select `role` (`reader/editor`) → POST → raw exibido 1× com botão copiar (após fechar modal, raw some para sempre).
- "Revogar" por linha → DELETE + confirmation.

### `app/(authed)/settings/invites/page.tsx`

- Acesso: `admin` only.
- Seção "Convidar": input `email` + select `role` (`reader/editor`) → POST.
- Seção "Pendentes": lista `email · role · expira em Xd · [revogar]`.
- Sucesso no POST: toast + botão "Copiar link" com `inviteUrl` (fallback se email falhou).
- `editor` não aparece como opção de `admin` (role não disponível via convite — ver `2_INVITES §Decisões-chave`).

---

## Integração com layout existente

A nav principal (sidebar/header) ganha links para Settings visíveis apenas para roles que têm acesso:

| Link | `PermissionGate minRole` |
|---|---|
| Settings → Users | `admin` |
| Settings → API Keys | `editor` |
| Settings → Invites | `admin` |

---

## Evolução para Fase 4 (tenant)

| Global (Fase 3) | Tenant (Fase 4) |
|---|---|
| `Session` sem `tenantId` | `SessionContext` com `tenants`, `currentTenantId`, `menu` |
| `roleStore` | `tenantStore` (superset) |
| Settings globais em `/settings/*` | Settings por tenant em `/(authed)/tenants/[id]/settings/*` |
| Sem tenant selector | `TenantSelector` no header |
| Lista de users = todos | Lista de users = membros do tenant |

`roleStore` é substituído por `tenantStore` que contém um superset das mesmas informações. `SessionHydrator` e `PermissionGate` são reutilizados com props adicionais.

---

## Observações

### `workspaceStore` — cleanup obrigatório no logout

`workspaceStore` usa `persist` (localStorage). Sem cleanup explícito no logout, user B logando no mesmo browser herda `selectedProjectId`/`selectedEngineId` do user A — IDs que não pertencem ao novo user.

**Onde corrigir:** no handler de logout (`app/api/auth/logout/route.ts` ou equivalente), antes do redirect, resetar o store:

```ts
// Opção 1: server-side — limpar o cookie de sessão basta se o store
// for rehidratado no próximo login. Mas se o persist usa localStorage,
// o client precisa limpar antes do redirect.

// Opção 2: client-side (preferida) — no componente de logout:
useWorkspaceStore.getState().reset()   // se o store expõe reset()
// ou
localStorage.removeItem("workspace-storage")  // nome da chave do persist
```

Esse bug não é novo desta fase, mas a Fase 3 é o primeiro momento em que múltiplos users com roles distintos compartilham o mesmo browser com frequência.

---

## Verificação

1. `reader` acessa `/settings/users` → `PermissionGate` esconde página; API retorna `403 INSUFFICIENT_ROLE`.
2. `admin` lista users → vê todos com roles.
3. `admin` altera role de `reader` → `editor` → confirma mudança imediata (sem relogin).
4. `admin` tenta alterar próprio role → dropdown desabilitado na UI + `409 CANNOT_MODIFY_OWN_ROLE` na API.
5. `editor` cria API key com role `reader` → raw exibido 1× no modal.
6. `editor` revoga key → some da lista.
7. `admin` convida `foo@bar.com` como `editor` → toast com `inviteUrl`.
8. `admin` revoga convite pendente → some da lista.
9. Logout → `roleStore` resetado; login com outro user → não herda role do anterior.
10. Logout de user A → login de user B no mesmo browser → `workspaceStore` limpo (sem `selectedProjectId`/`selectedEngineId` residuais).
