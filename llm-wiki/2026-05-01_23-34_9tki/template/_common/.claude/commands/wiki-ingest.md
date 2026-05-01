---
description: Ingest a source from raw/ into the oracle, updating wiki/ per CLAUDE.md §6.1.
argument-hint: <path-inside-raw/>
---

> Communicate with the user in the language defined by `CLAUDE.md` (read it first for content language and conventions).

Argument: `$ARGUMENTS` (path of the source inside `raw/`).

Run **§6.1 (Ingest)** from `CLAUDE.md`. Procedure summary:

0. **Detect re-ingest.** Search `wiki/source-*.md` for a page with
   `original_file: $ARGUMENTS`. If found, this is a **re-ingest**
   (user edited an already-ingested source) — update the existing
   source page in place, re-run steps 5–6, and log as `reingest`
   instead of `ingest` (see CLAUDE.md §6.1 step 0). If not found,
   continue with step 1 below.
1. **Read** the entire file at `$ARGUMENTS`.
2. **Summarize mentally**: topic, entities, concepts, strong claims,
   potential contradictions.
3. **Briefly converse** with the user about the key points **before**
   writing (unless the user asked for "ingest without asking" mode).
4. **Create the source page** at `wiki/source-<slug>.md` with full
   frontmatter (`type: source`, `author`, `published`, `url`, `format`,
   `original_file: $ARGUMENTS`).
5. **Update existing pages** (`entity-*`, `concept-*`) this source
   enriches. Mark contradictions with `> ⚠️ Contradiction:` (translated
   to the content language). Update `updated:` on every touched page.
6. **Create new minimal pages** (frontmatter + 1 paragraph + "Appears in:")
   for new entities/concepts: `wiki/entity-<slug>.md`,
   `wiki/concept-<slug>.md`.
7. **Update `wiki/index.md`** with the new pages.
8. **Append to `wiki/log.md`** a formatted entry (see CLAUDE.md §6.1).
9. **Report** a summary of changes to the user.

**Before closing**, ask whether the result is good or if the user wants
to iterate.
