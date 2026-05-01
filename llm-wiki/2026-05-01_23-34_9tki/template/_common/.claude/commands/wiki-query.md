---
description: Answer a question against the wiki, with [[wikilink]] citations and an optional archive step.
argument-hint: <question>
---

> Communicate with the user in the language defined by `CLAUDE.md` (read it first for content language and conventions).

Question: `$ARGUMENTS`

Run **§6.2 (Query)** from `CLAUDE.md`:

1. **Read `wiki/index.md` first.** Identify 3–8 potentially relevant
   pages from titles and summaries.
2. **Read those pages in full.** Follow up to 2 levels of relevant
   wikilinks.
3. **Synthesize the answer** in the content language defined by
   `CLAUDE.md`, factual, with inline `[[filename]]` citations (filenames
   are in English). If a claim comes from a specific source, cite it
   (`[[source-...]]`) too.
4. If the wiki **lacks** enough info, say so clearly. Suggest:
   - Sources to fetch.
   - Adjacent questions to investigate.
5. **After answering**, ask the user:
   > Archive this answer as `wiki/analysis-<slug>.md`? [y/N]

   If yes:
   - Create the page with `type: analysis`, `question: "..."`,
     `answered: <date>`.
   - Update `wiki/index.md`.
   - Append to `wiki/log.md` with kind `query|archived`.
   - Otherwise (default), just append a plain `query` entry to the log.
