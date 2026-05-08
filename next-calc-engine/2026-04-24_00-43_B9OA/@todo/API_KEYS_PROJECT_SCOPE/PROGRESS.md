# API Keys Project Scope — Progress

**Status:** 0/10 items · Phase: Not started

## Current Focus
Feature planned but not yet started.
Next step: Run DB migration to add `project_id` column to `api_keys`
Blocker: none

## Progress

### Phase 1: DB + Service layer
- [ ] Migration SQL: add `project_id` column + index to `api_keys`
- [ ] `services/api-keys.ts`: update list/create/lookup to handle `project_id`
- [ ] `services/auth.ts`: add `projectId` to `AuthResult`, propagate from validate
- [ ] Calc route: add scope check (engine.project_id vs key.project_id)
- [ ] `schemas/api.ts`: update create API key request schema
- [ ] Tests: scope enforcement cases

### Phase 2: API route updates
- [ ] `POST /api/api-keys`: accept `projectId` in body
- [ ] `GET /api/api-keys`: optional `?projectId=` filter
- [ ] Bruno collection: update request files

### Phase 3: UI (separate feature)
- [ ] API key management page with project scope selector

## Decisions Made During Execution
_(none yet)_
