# AUTHZ Incremental — Visão Geral

Abordagem lean decidida após revisão do [plano completo](../AUTHZ_COMPLETE/AUTHZ_PLAN.md).

**Motivação:** implementar autorização em fases progressivas, entregando valor a cada passo sem a complexidade do multi-tenant desde o início.

---

## Fases

| # | Doc | Foco | Status |
|---|---|---|---|
| 0 | [`0_API_KEYS.md`](./0_API_KEYS.md) | Bearer M2M para `/api/calc/*` sem tenant | ✅ **DONE** |
| 1 | [`1_RBAC.md`](./1_RBAC.md) | Roles globais (admin/editor/reader) + soft-delete | ⏳ Próxima |
| 2 | [`2_INVITES.md`](./2_INVITES.md) | Convites por email (sem tenant) | ⏳ Pendente |
| 3 | [`3_SETTINGS.md`](./3_SETTINGS.md) | UI de gestão (users, api-keys, invites) | ⏳ Pendente |
| 4 | [`4_TENANT.md`](./4_TENANT.md) | Multi-tenant — evolução de tudo acima | ⏳ Futuro |
| — | [`AUDIT_LOG.md`](./AUDIT_LOG.md) | Audit log — plantado, implementar quando doer | 🌱 Plantado |

## Relação com AUTHZ_COMPLETE

[`AUTHZ_COMPLETE/`](../AUTHZ_COMPLETE/) contém o plano original com multi-tenant desde o início. Este diretório é a alternativa incremental — cada fase referencia o COMPLETE onde os contratos detalhados de tenant já estão documentados.

A Fase 4 (tenant) é essencialmente uma migration do que as Fases 1–3 implementaram globalmente para um modelo scoped. Os contratos do COMPLETE permanecem válidos como destino final.

## Sequência de dependências

```
0_API_KEYS (✅) → 1_RBAC → 2_INVITES → 3_SETTINGS → 4_TENANT
                                                           ↑
                                              AUDIT_LOG (qualquer momento após Fase 0)
```
