---
description: Quick oracle diagnostic (no LLM call needed in headless — just `npm run status`).
---

> Communicate with the user in the language defined by `CLAUDE.md` (read it first for content language and conventions).

Run the equivalent of `npm run status` (which is purely shell), but in
interactive context enrich with:

1. Count:
   - Files in `raw/` (recursive).
   - Pages in `wiki/` by `type` (extracted from frontmatter).
2. Show:
   - Last entry of `wiki/log.md`.
   - Pages in `wiki/` modified in the last 7 days.
3. **Do not modify anything.** Just report.
4. If anything notable surfaces (e.g. "lint hasn't run in 30+ days",
   "10+ sources in raw/ still un-ingested"), flag it as an observation
   at the end, without acting.

Compact, terminal-friendly output.
