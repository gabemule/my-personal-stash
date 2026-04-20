# AUTHZ — Audit Log (plantado · leva 2)

> Parte de [`AUTHZ_PLAN.md`](./AUTHZ_PLAN.md) · tracking em [`AUTHZ_PROGRESS.md`](./AUTHZ_PROGRESS.md)

> **Status: PLANTADO.** Não implementar agora. Este doc existe para registrar a decisão e o desenho mínimo; a implementação começa quando a primeira dor real aparecer (auditoria regulatória, investigação de incidente, dispute de "quem promoveu quem", etc.).

## Por que plantar e não implementar?

- **Custo real:** escrever `logAudit` em toda rota mutadora é ~30 pontos de fricção que nunca são removidos.
- **Ganho hoje:** ~zero. Ninguém pede explicação de ação ainda. Projeto é pequeno.
- **Ganho quando doer:** enorme — sem log, a resposta a "quem apagou esse engine?" é "não sei".
- **Trigger pra descongelar:** qualquer uma das situações abaixo.
  - Primeiro cliente paying que exija trilha de auditoria.
  - Primeiro "sumiu um dado e ninguém sabe o que aconteceu".
  - Compliance/regulatório (LGPD acesso por titular, SOC2, etc.).
  - >5 tenants ativos (a probabilidade de disputa interna sobe).

## Não confundir com observabilidade técnica

- **Sentry / PostHog / logs de infra** = bugs, performance, uso de feature. Alvo: engenharia.
- **Audit log** = trilha de ações de negócio feitas por usuários identificados. Alvo: compliance / suporte / admin.

São ortogonais e ambos provavelmente vão existir. Este doc trata só do segundo.

## Desenho mínimo (quando for implementar)

### Schema — `audit_log`

```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null, -- null pra ações globais
  user_id uuid references auth.users(id) on delete set null, -- null pra system actions
  api_key_id uuid references api_keys(id) on delete set null, -- preenchido se veio via Bearer
  action text not null,              -- ex: 'tenant.member.role_changed'
  resource_type text,                -- ex: 'tenant_member'
  resource_id text,                  -- uuid ou string opaca
  metadata jsonb not null default '{}'::jsonb,  -- before/after/extras
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
- `update/delete`: **nunca** — audit log é append-only. Expurgo via job separado (após retenção configurável, ex: 2 anos).

### Helper — `lib/audit.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"

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

export async function logAudit(args: LogAuditArgs): Promise<void> {
  // Nunca joga exception pra cima — audit log não pode quebrar o fluxo de negócio.
  try {
    const admin = createAdminClient()
    await admin.from("audit_log").insert({
      tenant_id: args.tenantId ?? null,
      user_id: args.userId ?? null,
      api_key_id: args.apiKeyId ?? null,
      action: args.action,
      resource_type: args.resourceType ?? null,
      resource_id: args.resourceId ?? null,
      metadata: args.metadata ?? {},
      ip: args.ip ?? null,
      user_agent: args.userAgent ?? null,
    })
  } catch (e) {
    console.error("[audit] failed to log", args.action, e)
  }
}
```

### Convenção de `action`

Padrão: `<resource>.<verb>` — em inglês, minúsculas, com `.` como separador.

Eventos críticos a logar (lista inicial, expandir conforme precisar):

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
- `api_key.used` ← **cuidado:** não logar toda execução (volume enorme). Só primeira-uso do dia ou métricas agregadas. Em dúvida, *não logar* aqui e deixar pra Fase de observabilidade.

**Auth / Super admin**
- `super_admin.acted_as_tenant` (se implementarmos "impersonation" no futuro)

## Onde chamar

O helper `logAudit` deve ser chamado **no final do sucesso** das rotas mutadoras — nunca antes do commit. Exemplo:

```ts
// app/api/tenants/[id]/members/route.ts (PATCH)
const { error } = await auth.supabase
  .from("tenant_members")
  .update({ role: newRole })
  .eq(...)

if (error) return NextResponse.json({ error: error.message }, { status: 500 })

await logAudit({
  tenantId: params.id,
  userId: auth.userId,
  action: "tenant.member.role_changed",
  resourceType: "tenant_member",
  resourceId: userId,
  metadata: { from: target.role, to: newRole },
  ip: request.headers.get("x-forwarded-for"),
  userAgent: request.headers.get("user-agent"),
})

return NextResponse.json({ ok: true })
```

## UI (futuro distante)

Quando finalmente expor para o usuário:

- Página `app/tenants/[id]/settings/audit/page.tsx` (manager+) com:
  - Filtros: action, user, resource, intervalo de data
  - Paginação (cursor-based em `created_at desc`)
  - Expand de cada linha → metadata JSON raw (dev) ou traduzido (user)
- Export CSV/JSON (owner).

Até existir UI, a consulta é via SQL Editor — o dado está lá.

## Não-escopo

- **Retenção automática:** job de expurgo com `delete from audit_log where created_at < now() - interval '2 years'` só quando o volume justificar.
- **Write-ahead / tamper-evidence:** chain de hashes estilo blockchain. Overkill até aparecer requisito específico.
- **Export para SIEM externo:** quando houver cliente que peça.
- **Ações do super admin impersonando tenant:** exige campo `acting_as_user_id` + feature de impersonation (não existe).

## Verificação (quando implementar)

1. Promover USER → EDITOR → row em `audit_log` com `action = tenant.member.role_changed`, metadata `{from:'user', to:'editor'}`.
2. Revogar api_key → row `action = api_key.revoked`, `resource_id = <keyId>`.
3. DB error em um INSERT → log NÃO escreve (ficamos só com erro da request).
4. Tentativa de UPDATE em `audit_log` via client → bloqueado pela RLS.
5. Super admin consulta via SQL → vê logs de todos tenants.

## Checklist pra descongelar

Quando decidir implementar:
- [ ] Mover deste arquivo para `AUTHZ_AUDIT_LOG` efetivo (remover nota de "plantado")
- [ ] Criar migration com schema + RLS
- [ ] Criar `lib/audit.ts`
- [ ] Adicionar chamadas nas rotas críticas (tabela acima)
- [ ] Testar volume em dev (inserir 10k rows, verificar queries por tenant ficam < 100ms)
- [ ] Documentar retenção no onboarding de novos tenants

## Observações

- **Não hashear user_id** — precisa ser join-able com `auth.users` pra UI mostrar email.
- **`metadata` é o diário do desenvolvedor.** Colocar tudo que pode ajudar numa investigação futura. Custo de storage é irrelevante pra esse volume.
- **Evitar logs de leitura.** `*.read` / `*.list` fazem o volume explodir e raramente agregam valor. Só logar mutações (POST/PATCH/DELETE) e eventos sensíveis (login, token gen).
- **IP + user_agent:** pegar de `request.headers.get("x-forwarded-for")` e `user-agent`. Em produção atrás de proxy, conferir header correto.
