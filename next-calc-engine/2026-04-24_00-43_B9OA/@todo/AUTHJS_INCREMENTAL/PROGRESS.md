# Auth.js Incremental Authorization — Progress

**Status:** 0/16 items · Phase: Not started
**Prerequisites:** DRIZZLE-MIGRATION + AUTHJS-MIGRATION must be completed first.

## Current Focus
Not started yet. Waiting for prerequisites.
Next step: Complete DRIZZLE-MIGRATION → AUTHJS-MIGRATION → then start Phase 1
Blocker: Prerequisites pending

## Progress

### Phase 1: RBAC
- [ ] Add `userRoles` table to `db/schema.ts`
- [ ] Add `role` column to `api_keys` schema + migration
- [ ] Create `lib/rbac.ts` (`GlobalRole`, `KeyRole`, `requireRole`)
- [ ] Evolve `resolveAuth` to eager-load role
- [ ] Create `GET/PATCH /api/users` route handlers
- [ ] Seed existing users with `editor` role via migration
- [ ] Protect all existing routes with `requireRole`

### Phase 2: INVITES
- [ ] Add `invites` table to `db/schema.ts`
- [ ] Create invite endpoints (CRUD + accept)
- [ ] Update `middleware.ts` for public invite routes
- [ ] Create invite landing page (`app/invites/[token]/page.tsx`)

### Phase 3: SETTINGS
- [ ] Create `getSessionContext()` + `roleStore` + `SessionHydrator`
- [ ] Create settings pages (users, api-keys, invites)
- [ ] Add `PermissionGate` component

### Phase 4: TENANT
- [ ] Design and implement tenant schema + service functions
- [ ] Implement tenant UI (selector, settings, members)

## Decisions Made During Execution
(none yet)