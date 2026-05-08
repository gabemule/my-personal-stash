# API Keys Project Scope — Plan

## Context

API keys are currently global — any valid key can call any engine via `POST /api/calc/:engineId`. There is no `project_id` column on `api_keys`, so keys have no relationship to projects.

The goal is to allow optional scoping of API keys to a specific project, so that:
- A **global key** (`project_id = null`) can access engines in any project (backwards-compatible default)
- A **scoped key** (`project_id = uuid`) can only access engines belonging to that project

This aligns with standard scoped-token patterns (GitHub, Stripe, etc.) and prepares the ground for future multi-tenant RBAC.

## Goals

1. Add `project_id` (nullable FK) to `api_keys` table
2. Enforce project scope check on calc routes (Bearer auth only, zero extra queries)
3. Update API key CRUD to accept and return `project_id`
4. Existing keys remain global (null) — no breaking change

## Scope

### In scope
- DB migration: add `project_id` column + index
- `services/api-keys.ts`: accept/return `project_id` in list, create, validate
- `services/auth.ts`: propagate `projectId` in `AuthResult`
- Calc route: verify engine belongs to key's project (in-memory check, no extra query)
- API keys route: accept `projectId` in create, filter by project in list
- Zod schemas: update request/response shapes
- Tests: update existing, add scope-check cases

### Out of scope
- UI for API key management (will be a separate feature)
- Multi-tenant RBAC / tenant_id on api_keys (future AUTHZ migration)
- Revoking/migrating existing global keys

## Decisions

### D1: Nullable project_id (same pattern as engines)
`project_id uuid REFERENCES projects(id) DEFAULT NULL` — null means global scope. This is the same pattern already used by `engines.project_id` and avoids breaking existing keys.

### D2: Zero extra queries for scope enforcement
The calc route already executes two SELECTs:
1. `lookupApiKey(hash)` → `SELECT id, name FROM api_keys` — add `project_id` to projection
2. `getEngineDefinition(id)` → `SELECT engine FROM engines` — add `project_id` to projection

Scope check is a simple in-memory comparison after both return. No JOINs, no extra round-trips.

### D3: Scope rules
| Key scope | Engine scope | Result |
|---|---|---|
| null (global) | any | ✅ Allowed |
| project A | project A | ✅ Allowed |
| project A | project B | ❌ 403 |
| project A | null (orphan) | ❌ 403 |
| null (global) | null (orphan) | ✅ Allowed |

Rationale: a scoped key should only access engines explicitly assigned to its project. Orphaned engines (legacy, no project) are only accessible by global keys.

### D4: Session auth unaffected
Cookie-based (browser) auth has no project scope restriction — authenticated users can access any engine they have RLS access to. Scope enforcement only applies to Bearer API keys.

## Phases

### Phase 1: DB + Service layer (backend only)
- Migration SQL: `ALTER TABLE api_keys ADD COLUMN project_id uuid REFERENCES projects(id) DEFAULT NULL`
- Index: `CREATE INDEX api_keys_project_active_idx ON api_keys (project_id) WHERE deleted_at IS NULL`
- `services/api-keys.ts`: update `listApiKeys(projectId?)`, `createApiKey(name, projectId?)`, `lookupApiKey` returns `project_id`
- `services/auth.ts`: add `projectId` to `AuthResult` type, propagate from `validateApiKey`
- `services/calc.ts` or calc route: add scope check after resolveAuth + getEngineDefinition
- `schemas/api.ts`: add create request schema for projectId field
- Tests: scope enforcement cases

### Phase 2: API route updates
- `POST /api/api-keys`: accept `projectId` in body
- `GET /api/api-keys`: optional `?projectId=` filter
- `DELETE /api/api-keys/:id`: no change needed
- Bruno collection: update request files

### Phase 3: UI (separate feature, not in this plan)
- API key management page with project scope selector
- Dropdown: "All projects" (null) vs specific project
- Display scope in key list table
