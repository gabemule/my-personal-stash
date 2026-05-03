---
description: Protocol for maintaining project context across sessions using CONTEXT.md, PLAN.md, and PROGRESS.md files in @todo/
alwaysApply: true
---

# Context Management Protocol

Rules for maintaining persistent context across sessions and context resets.

## File Convention

All AI-managed documentation lives under `@todo/`:

| File | Scope | Purpose |
|---|---|---|
| `@todo/CONTEXT.md` | Project-wide | Compiled project state: stack, architecture, conventions, active decisions, known pitfalls. Atemporal and cumulative. |
| `@todo/[FEATURE]/PLAN.md` | Feature | Detailed plan: goals, scope, contracts, decisions, phases. Written before execution. |
| `@todo/[FEATURE]/PROGRESS.md` | Feature | Execution checklist with status counters, `Current Focus` section, and runtime decisions log. |
| `@todo/[FEATURE]/CONTEXT.md` | Feature | Feature-specific compiled context: key files touched, patterns adopted, integration points, gotchas discovered during execution. Created when the feature is complex enough to need it. |

## Lifecycle

### Starting a new session or after context reset

1. **Always read first** (in order):
   - `@todo/CONTEXT.md` (project context)
   - Active feature's `PROGRESS.md` (where we left off)
   - Active feature's `CONTEXT.md` if it exists (feature-specific knowledge)
   - Active feature's `PLAN.md` only if needed for deeper understanding
2. Summarize what you understood and where you'll resume before taking any action.

### Starting a new feature

1. Create `@todo/[FEATURE]/PLAN.md` with:
   - `## Context` — why this feature exists, current state
   - `## Goals` — concrete, verifiable objectives
   - `## Scope` — what's in, what's out
   - `## Decisions` — key technical choices and rationale
   - `## Phases` (if multi-step) — ordered steps with effort estimates
2. Create `@todo/[FEATURE]/PROGRESS.md` with:
   - `## Current Focus` — what's being worked on right now, next step, blockers
   - `## Progress` — checklist grouped by phase/category with status counters
   - `## Decisions Made During Execution` — runtime decisions not in the original plan
3. Feature-level `CONTEXT.md` is optional — create it when the feature touches many files or has non-obvious integration points.

### During execution

- After completing a meaningful block of work (not every single file edit), update:
  1. `PROGRESS.md` — check off completed items, update `Current Focus`, update status counters
  2. Feature `CONTEXT.md` — if new patterns, gotchas, or integration points were discovered
- Do NOT update project `CONTEXT.md` on every change — only on architectural shifts, new ADRs, new conventions, or new pitfalls.

### When the user explicitly requests a context checkpoint

Update all relevant files:
1. `@todo/[FEATURE]/PROGRESS.md` — current status
2. `@todo/[FEATURE]/CONTEXT.md` — accumulated feature knowledge
3. `@todo/CONTEXT.md` — only if project-level state changed

### When a feature is completed

1. Mark all items in `PROGRESS.md` as done, update status to "Complete"
2. Update `@todo/CONTEXT.md` with:
   - New conventions or patterns introduced
   - Architecture changes
   - New pitfalls discovered
   - Updated "Current State" section
3. The feature folder in `@todo/` stays as archive (don't delete)

## CONTEXT.md Structure (Project-wide)

```markdown
# CONTEXT.md — Project Knowledge Base

> Maintained by Cline for context recovery between sessions.
> Last updated: YYYY-MM-DD

## Stack & Infra
(frameworks, services, deploy, monitoring)

## Architecture
(directory structure, key patterns, data flow)

## Conventions
(naming, file organization, testing, code style decisions)

## Current State
(what's working, what's in progress, what's planned)

## Active Decisions (ADRs)
(list of ADRs with one-line summary each)

## Known Pitfalls
(things that look wrong but are intentional, or actual issues to watch for)
```

## Feature CONTEXT.md Structure

```markdown
# [FEATURE] — Context

> Last updated: YYYY-MM-DD

## Key Files
(files created or significantly modified, with one-line purpose)

## Patterns Adopted
(new patterns introduced by this feature)

## Integration Points
(how this feature connects to existing code)

## Gotchas
(non-obvious things discovered during implementation)
```

## PROGRESS.md Structure

```markdown
# [FEATURE] — Progress

**Status:** X/Y items · Phase: [current phase]

## Current Focus
[What's being worked on right now]
Next step: [specific next action]
Blocker: [none or description]

## Progress

### [Phase/Category Name]
- [x] Completed item
- [ ] Pending item

### [Phase/Category Name]
- [ ] Pending item

## Decisions Made During Execution
- YYYY-MM-DD: [decision and rationale]
```

## Rules of Thumb

- **CONTEXT.md is a cache, not a log.** It should be readable in 60 seconds and give 80% of needed context. If it grows past ~100 lines, prune aggressively.
- **PROGRESS.md is the source of truth for "where are we."** Current Focus must always be accurate.
- **PLAN.md is immutable after execution starts.** New decisions go in PROGRESS.md's "Decisions Made During Execution" section, not retroactively edited into PLAN.md.
- **Don't duplicate ADRs.** CONTEXT.md references them by number; the full content stays in `docs/adr/`.
- **Feature CONTEXT.md is optional for small features.** Use judgment — if the feature touches ≤5 files and has no gotchas, skip it.
