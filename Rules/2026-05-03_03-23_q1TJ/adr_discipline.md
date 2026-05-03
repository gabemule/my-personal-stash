---
description: Proactively propose ADRs for significant architectural decisions.
alwaysApply: true
---

# ADR Discipline

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

## When to Propose a New ADR

Propose creating a new ADR in `docs/adr/` when:
- Choosing between competing approaches with meaningful tradeoffs
- Establishing a new convention that all future code must follow
- Overriding or deprecating a previous ADR
- Making a decision that would surprise a new team member

## When NOT to Create an ADR

- Implementation details within an existing pattern
- Bug fixes or refactors that don't change architecture
- Choices dictated by the framework (no real alternative)
- One-off scripts or throwaway code

## ADR Format

Use the format already established in the project's `docs/adr/` directory. If none exists, use:

```markdown
# ADR [NNN] — [Title]

## Status
Accepted | Superseded by [NNN] | Deprecated

## Context
(Why this decision is needed)

## Decision
(What we chose and why)

## Consequences
(What changes, what tradeoffs we accept)
```

## Behavior

- When making an architectural decision during a task, ask: "Should this be an ADR?"
- If yes, create the ADR file before or alongside the implementation
- Reference the ADR number in CONTEXT.md and .clinerules when relevant
- Number ADRs sequentially (check existing files in `docs/adr/` for the next number)