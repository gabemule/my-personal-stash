# AUTHZ Incremental — Audit Log (plantado · sem dependência de fase)

> **Referência completa:** [`../AUTHZ_COMPLETE/AUTHZ_AUDIT_LOG.md`](../AUTHZ_COMPLETE/AUTHZ_AUDIT_LOG.md)

> **Status: PLANTADO.** Não implementar agora. Este doc existe para registrar a decisão e o contrato mínimo. A implementação começa quando a primeira dor real aparecer.

Sem número de fase porque **não depende de multi-tenant para ser útil**. Pode ser implementado a qualquer momento após a Fase 0 — mas o schema completo abaixo inclui `tenant_id` (opcional até Fase 4 existir).

---

## Por que plantar e não implementar?

- **Custo:** `logAudit` em toda rota mutadora = ~30 pontos de fricção permanentes.
- **Ganho hoje:** zero. Ninguém pede explicação de ação ainda.
- **Ganho quando doer:** enorme — "quem deletou esse engine?" não tem resposta sem log.

**Triggers para descongelar** (qualquer um basta):
- Primeiro cliente paying exigindo trilha de auditoria.
- Primeiro "sumiu um dado e ninguém sabe".
- Compliance / LGPD / SOC2.
- \> 5 tenants ativos (probabilidade de disputa interna sobe).

---

## Não confundir com observabilidade técnica

- **Sentry / logs de infra** → bugs e performance. Alvo: engenharia.
- **Audit log** → ações de negócio por usuários identificados. Alvo: compliance / suporte.

Ortogonais. Ambos vão coexistir.

---

## Schema — `audit_log`

```sql
create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references tenants(id) on delete set null,    -- null antes da Fase 4
  user_id      uuid references auth.users(id) on delete set null, -- null para system actions
  api_key_id   uuid references api_keys(id) on delete set null,   -- se veio via Bearer
  action       text not null,       -- ex: 'project.created'
  resource_type text,
  resource_id  text,
  metadata     jsonb not null default '{}'::jsonb,
  ip           text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index audit_log_tenant_created_idx on audit_log(tenant_id, created_at desc);
create index audit_log_user_created_idx on audit_log(user_id, created_at desc);
create index audit_log_action_idx on audit_log(action);
```

**RLS:**
- `INSERT`: apenas service-role (nunca escrita direta de client).
- `SELECT`: manager+ vê logs do próprio tenant; super admin vê tudo.
- `UPDATE/DELETE`: **nunca** — audit log é append-only.

---

## Helper — `lib/audit.ts`

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

async function logAudit(args: LogAuditArgs): Promise<void>
```

Contrato:
- **Nunca lança.** Captura qualquer erro e faz `console.error`. Log não quebra fluxo de negócio.
- Insere via `createAdminClient()` (service-role).
- Chamado **após** commit da mutação principal (nunca antes, nunca no erro path).

---

## Convenção de `action`

Padrão: `<resource>.<verb>` — inglês, minúsculas, `.` como separador.

**Prioritários quando implementar:**

| Recurso | Actions |
|---|---|
| Tenant | `tenant.created` · `tenant.updated` · `tenant.soft_deleted` |
| Members | `tenant.member.invited` · `tenant.member.invite_accepted` · `tenant.member.invite_revoked` · `tenant.member.role_changed` (metadata: `{ from, to }`) · `tenant.member.removed` |
| Project | `project.created` · `project.updated` · `project.soft_deleted` |
| Engine | `engine.created` · `engine.updated` · `engine.published` · `engine.soft_deleted` |
| API Keys | `api_key.created` · `api_key.revoked` |

**`api_key.used` → não logar por request** (volume explode). Apenas primeiro-uso do dia ou métricas agregadas — se dúvida, não logar aqui.

---

## Onde chamar (padrão)

```
1. requireAuth / requireRole
2. Mutação principal
3. Se erro → retornar sem logar
4. Sucesso → logAudit({ action, ... ip/userAgent dos headers })
5. return NextResponse.json(...)
```

---

## UI (futuro distante)

Página `app/(authed)/tenants/[id]/settings/audit/page.tsx` (manager+):
- Filtros: action, user, resource, data.
- Paginação cursor-based por `created_at desc`.
- Expand por linha → metadata JSON.
- Export CSV/JSON (owner).

Até lá: consulta via SQL Editor.

---

## Não-escopo

- Retenção automática (expurgo por job).
- Tamper-evidence / chain de hashes.
- Export para SIEM externo.
- Logs de leitura (`*.read`, `*.list`) — raramente agregam valor e explodem o volume.

---

## Checklist para descongelar

- [ ] Criar migration com schema + RLS.
- [ ] Criar `lib/audit.ts`.
- [ ] Adicionar `logAudit` nas rotas mutadoras críticas.
- [ ] Testar volume em dev (10k rows; queries por tenant < 100ms).
- [ ] Documentar retenção.
