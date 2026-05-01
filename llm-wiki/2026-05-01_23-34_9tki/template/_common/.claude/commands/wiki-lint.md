---
description: Wiki health-check — broken links, orphans, contradictions, inconsistent frontmatter, stale summaries.
---

> Communicate with the user in the language defined by `CLAUDE.md` (read it first for content language and conventions).

Run **§6.3 (Lint)** from `CLAUDE.md`.

**Important**: this command **detects and reports**, it does not fix
automatically. Fixes happen in a separate round, with user approval
item-by-item or in batch.

Categories to check:

1. **Broken links** — `[[wikilinks]]` pointing to pages that do not
   exist in `wiki/`.
2. **Orphan pages** — pages in `wiki/` with no backlinks (nobody links
   to them). Exclude: `index.md`, `log.md`, `overview.md`.
3. **Concepts without a page** — terms in **bold** or proper nouns
   cited in ≥3 pages without a dedicated page.
4. **Inconsistent frontmatter** — required fields missing (`title`,
   `type`, `created`, `updated`, `summary`), dates not in
   `YYYY-MM-DD`, `type` outside the closed vocabulary
   (`index | source | entity | concept | analysis | meta`), tags
   malformed.
5. **Contradictions** — conflicting claims between pages not marked
   with `> ⚠️ Contradiction:` (in the content language).
6. **Stale summaries** — `summary:` in frontmatter that no longer
   reflects the current page body.
7. **Outdated index** — pages in `wiki/` (with frontmatter) absent
   from `wiki/index.md`.

**Output**: structured markdown report, by category, with:
- List of finding(s).
- Suggested fix for each.
- Severity: 🔴 high / 🟡 medium / 🔵 low.

**Append to `wiki/log.md`**:
```
## [YYYY-MM-DD HH:MM] lint | <N> issues (<X high, Y medium, Z low>)
- Summary by category...
```

**Ask** at the end if the user wants to fix anything now.
