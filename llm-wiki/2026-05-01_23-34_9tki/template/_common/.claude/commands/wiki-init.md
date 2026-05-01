---
description: Initialize the oracle after bootstrap — fill any remaining placeholders, draft overview.md, register seed pages in index.md, open log.md.
---

> Communicate with the user in the language defined by `CLAUDE.md` (read it first for content language and conventions).

> **Note**: this command runs **after** `npx create-source-base`. The CLI
> typically fills `name`, `domain`, and `date` already via `--name` /
> `--domain` flags. Only re-ask when literal `{{...}}` tokens remain.

Run procedure **§6.5 (Init)** described in `CLAUDE.md`.

1. **Inventory seed pages**: list seed pages in `wiki/` (any `.md` other
   than `index.md`, `log.md`, `overview.md`) as a brief list. **Default:
   keep them all** — the user picked the preset on purpose. End the
   listing with a single line: "If you want to rename or remove any of
   these, say so now; otherwise I'll keep them as-is." Do **not** ask
   per-page.

2. **Check for unfilled placeholders**: read `wiki/overview.md` and
   `wiki/index.md`. **If literal tokens like `{{NAME}}`, `{{DOMAIN}}`,
   or `{{DATE}}` are present**, ask the user one question at a time to
   fill them. **If absent, skip this step** — the CLI already populated
   the values via flags, even if they look generic.

3. Update `wiki/overview.md`:
   - Replace any remaining placeholders.
   - Fill the "current synthesis" section with one introductory
     paragraph based on the domain.

4. Update `wiki/index.md`:
   - Replace any remaining placeholders.
   - List all preset seed pages (if any) under the most appropriate
     category (Entities / Concepts / Analyses / a new category).

5. Append to `wiki/log.md`:
   ```
   ## [YYYY-MM-DD HH:MM] init | Oracle "<name>" initialized
   - Domain: <description>
   - Preset: <preset or "default">
   - Seed pages: <list or "none">
   ```

6. Report a brief summary to the user and suggest a next step (ingest a
   first source, or start with a question).

**Do not** create extra pages (`source-*`, `entity-*`, etc.) before the
first real ingestion.
