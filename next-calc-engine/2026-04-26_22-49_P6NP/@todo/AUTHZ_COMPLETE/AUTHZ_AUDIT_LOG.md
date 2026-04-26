# AUTHZ — Audit Log (plantado · leva 2)

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md)

> **Status: PLANTADO.** Não implementar agora. Este doc existe pra registrar a decisão e o desenho mínimo; a implementação começa quando a primeira dor real aparecer (auditoria regulatória, investigação de incidente, dispute de "quem promoveu quem", etc.).

## Por que plantar e não implementar?

- **Custo real:** `logAudit` em toda rota mutadora é ~30 pontos de fricção que nunca são removidos.
- **Ganho hoje:** ~zero. Ninguém pede explicação de ação ainda.
- **Ganho quando doer:** enorme — sem log, a resposta a "quem apagou esse engine?" é "não sei".
- **Trigger pra descongelar** (qualquer um basta):
  - Primeiro cliente paying exigindo trilha de auditoria.
  - Primeiro "sumiu um dado e ninguém sabe o que aconteceu".
  - Compliance/regulatório (LGPD acesso por titular, SOC2, etc.).
  - > 5 tenants ativos (probabilidade de disputa interna sobe).

## Não confundir com observabilidade técnica

- **Sentry / PostHog / logs de infra** = bugs, performance, uso de feature. Alvo: engenharia.
- **Audit log** = trilha de ações de negócio feitas por usuários identificados. Alvo: compliance / suporte / admin.

Ortogonais; provavelmente ambos vão existir. Este doc trata só do segundo.

## Desenho mínimo (quando for implementar)

### Schema — `audit_log`

```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null, -- null pra ações globais
  user_id uuid references auth.users(id) on delete set null, -- null pra system actions
  api_key_id uuid references api_keys(id) on delete set null, -- se veio via Bearer
  action text not null,              -- ex: 'tenant.member.role_changed'
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_log_tenant_created_idx on audit_log(tenant_id, created_at desc);
create index audit_log_user_created_idx on audit_log(user_id, created_at desc);
create index audit_log_action_idx on audit_log(action);
```

**RLS:**
- `insert`: apenas service-role (nunca escrita direta de client).
- `select`: membro `manager+` vê logs do próprio tenant; super admin vê tudo.
- `update/delete`: **nunca** — audit log é append-only. Expurgo via job separado após retenção configurável.

### Helper — `lib/audit.ts`

Assinatura:

```ts
interface LogAuditArgs {
  tenantId?: string | null
  userId?: string | null
  apiKeyId?: string | null
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ip?: string | null
  userAgent?: string | null
}

export async function logAudit(args: LogAuditArgs): Promise<void>
```

Contrato:
- Nunca lança — captura qualquer erro internamente e loga em `console.error`. Audit log não pode quebrar fluxo de negócio.
- Insere via `createAdminClient()` (RLS de insert é bloqueada pra client autenticado).
- Chamado **após** commit da mutação principal (nunca antes).

### Convenção de `action`

Padrão: `<resource>.<verb>` em inglês, minúsculas, `.` como separador.

Eventos críticos a logar (expandir conforme necessário):

**Tenant**
- `tenant.created`
- `tenant.updated`
- `tenant.soft_deleted`
- `tenant.restored`

**Members**
- `tenant.member.invited`
- `tenant.member.invite_revoked`
- `tenant.member.invite_accepted`
- `tenant.member.role_changed` (metadata: `{ from, to }`)
- `tenant.member.removed`
- `tenant.ownership.transferred` (metadata: `{ fromUserId, toUserId }`)
- `tenant.billing.transferred` (metadata: `{ fromUserId, toUserId }`)

**Project**
- `project.created`
- `project.updated`
- `project.soft_deleted`
- `project.restored`

**Engine**
- `engine.created`
- `engine.updated`
- `engine.published`
- `engine.soft_deleted`

**API Keys**
- `api_key.created`
- `api_key.revoked`
- `api_key.used` ← **cuidado:** não logar toda execução (volume explode). Só primeiro-uso do dia ou métricas agregadas. Em dúvida, *não logar* aqui e deixar pra observabilidade.

**Auth / Super admin**
- `super_admin.acted_as_tenant` (se implementarmos impersonation no futuro)

## Onde chamar

No final do fluxo feliz das rotas mutadoras — depois do commit da operação principal, antes do `return`. Exemplo de ordem correta:

1. `requireAuth` / `requireTenantRole`.
2. Mutação principal (RPC / UPDATE / INSERT).
3. Se erro → retorna sem logar.
4. Sucesso → `logAudit({ ... })` (com `ip` de `x-forwarded-for` e `user-agent` dos headers da request).
5. `return NextResponse.json(...)`.

## UI (futuro distante)

Quando expor pro usuário:
- Página `app/(authed)/tenants/[id]/settings/audit/page.tsx` (manager+):
  - Filtros: action, user, resource, intervalo de data.
  - Paginação cursor-based em `created_at desc`.
  - Expand por linha → metadata JSON raw (dev) ou traduzido (user).
- Export CSV/JSON (owner).

Até lá, consulta via SQL Editor — o dado está na tabela.

## Não-escopo

- **Retenção automática:** job de expurgo (`delete from audit_log where created_at < now() - interval '2 years'`) só quando volume justificar.
- **Tamper-evidence / chain de hashes:** overkill até haver requisito explícito.
- **Export para SIEM externo:** quando houver cliente que peça.
- **Ações do super admin impersonando tenant:** exige campo `acting_as_user_id` + feature de impersonation (não existe).

## Verificação (quando implementar)

1. Promover READER → EDITOR → row em `audit_log` com `action = tenant.member.role_changed`, metadata `{ from: "reader", to: "editor" }`.
2. Revogar api_key → row `action = api_key.revoked`, `resource_id = <keyId>`.
3. DB error na mutação principal → log NÃO escreve (só o erro da request chega ao cliente).
4. Tentativa de UPDATE em `audit_log` via client autenticado → bloqueado pela RLS.
5. Super admin consulta via SQL → vê logs de todos os tenants.

## Checklist pra descongelar

Quando decidir implementar:
- [ ] Remover nota "plantado" do topo.
- [ ] Criar migration com schema + RLS.
- [ ] Criar `lib/audit.ts`.
- [ ] Adicionar chamadas nas rotas críticas (lista acima).
- [ ] Testar volume em dev (inserir 10k rows, consultas por tenant < 100ms).
- [ ] Documentar retenção no onboarding de novos tenants.

## Observações

- **Não hashear `user_id`** — precisa ser join-able com `auth.users` pra UI mostrar email.
- **`metadata` é o diário do dev.** Colocar tudo que pode ajudar em investigação futura. Storage é irrelevante nesse volume.
- **Evitar logs de leitura.** `*.read` / `*.list` fazem volume explodir e raramente agregam valor. Só logar mutações (POST/PATCH/DELETE) e eventos sensíveis (login, token gen).
- **IP + user_agent:** `x-forwarded-for` e `user-agent`. Em produção atrás de proxy, conferir header correto.
