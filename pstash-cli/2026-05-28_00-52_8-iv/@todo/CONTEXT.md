# CONTEXT.md — Project Knowledge Base

> Maintained by Cline for context recovery between sessions.
> Last updated: 2026-05-28

## Stack & Infra

- **Language:** TypeScript ^6.0.2 (strict mode, ESM, `verbatimModuleSyntax`)
- **Runtime:** Node.js >=20.0.0
- **Package manager:** npm (lock file committed)
- **Bundler:** tsup v8.5.1 (ESM, DTS, source maps, target node20)
- **Test runner:** Vitest v4.1.2 (315 tests, 22 files)
- **Linter:** ESLint ^10.1.0 (flat config, `@typescript-eslint`, prettier compat)
- **Formatter:** Prettier ^3.8.1 (100 width, no semis, double quotes)
- **CLI framework:** Commander.js ^14.0.3
- **Schema validation:** Zod ^4.3.6 (SSoT for all types)
- **Git operations:** simple-git ^3.33.0
- **Registry:** npm (package name: `pstash`, unscoped)
- **Repo:** `github.com/the-coded/pstash` (transferred from `gabemule/pstash-cli`)
- **CI/CD:** None yet (planned — see `@todo/CI-CD/`)

## Architecture

```
bin/pstash.ts          → CLI entry point (shebang + bootstrap)
src/cli.ts             → Commander.js setup, registers 13 commands
src/schemas.ts         → Zod SSoT: all types inferred from schemas
src/index.ts           → Public API surface (schemas + config exports)
src/commands/          → One file per CLI command (13 total)
src/core/              → Business logic (Stasher, Indexer, GitManager, ProjectDetector, Compressor)
src/config/            → Config loading/saving (~/.pstashrc), templates
src/utils/             → Pure utilities (format, fs, time, validation, prompts, version)
tests/                 → Mirror structure of src/ (22 test files)
```

**Key pattern:** Layered CLI — `commands/` orchestrate, `core/` does business logic, `utils/` are pure helpers. Zod schemas are the SSoT shared across all layers.

**Data storage:** JSON files on filesystem. `~/.pstashrc` (config), `~/.pstash/` (git repo with stash data). No database.

## Conventions

- **Types:** All derived from Zod schemas via `z.infer<>`. Zero manual `interface`/`type` declarations.
- **Imports:** Relative with `.js` extension (ESM). Node built-ins use `node:` prefix.
- **File naming:** kebab-case `.ts`. Tests: `<module>.test.ts`.
- **Constants:** UPPER_SNAKE_CASE in source, named exports.
- **Classes:** PascalCase. Core classes: `Stasher`, `Indexer`, `GitManager`, `ProjectDetector`.
- **Command options:** PascalCase + `Options` suffix (e.g., `SaveCommandOptions`).
- **JSDoc:** Every module has `@module` header. Public methods have `@param`/`@returns`.
- **Forward compat:** `GlobalConfigSchema` uses `.passthrough()` to preserve unknown fields.
- **No semicolons**, double quotes, trailing commas (Prettier enforced).

## Current State

- **Version:** 0.1.0 (published to npm as `pstash-cli`)
- **Build:** ✅ Passing (ESM + DTS)
- **Typecheck:** ✅ Passing (strict mode)
- **Tests:** ✅ 315/315 passing
- **Lint:** ✅ Clean
- **README:** Complete (693 lines, all 13 commands documented)
- **PROJECT_SPECIFICATION.md:** Complete deep-dive analysis at repo root
- **Org transfer:** Done — repo at `the-coded/pstash`, remote updated, `package.json` URLs match
- **Author:** `gabemule` (unchanged, personal username)

**In progress:**
- CI/CD pipeline setup (see `@todo/CI-CD/`)

**Planned:**
- GitHub Actions CI workflow (test/lint/typecheck on PRs)
- GitHub Actions publish workflow (npm publish via OIDC on GitHub Release)

## Active Decisions (ADRs)

Formal ADRs in `docs/adr/`:
- **ADR-001** — Zod as Single Source of Truth for types
- **ADR-002** — Layered CLI architecture (Commands → Core → Utils)
- **ADR-003** — Git as storage and synchronization backend
- **ADR-004** — Filesystem JSON as data format
- **ADR-005** — ESM-only with Node.js 20+ target
- **ADR-006** — Nanoid-suffixed stash ID format
- **ADR-007** — Automatic project detection via git remote
- **ADR-008** — Commander.js with centralized error handling
- **ADR-009** — Opt-in tar.gz compression per stash

CI/CD-specific decisions documented in `@todo/CI-CD/PLAN.md`:
- OIDC over NPM_TOKEN for npm publish
- GitHub Release trigger (not tag push)
- CI as prerequisite for publish

## Known Pitfalls

- **Sync pattern duplication:** The pull-before/push-after pattern is copy-pasted across ~9 command files. Works but isn't DRY. Improvement opportunity for a `withSync()` helper.
- **Diff algorithm in command layer:** `commands/diff.ts` contains the LCS diff implementation (~100 lines of business logic). Should live in `core/` or `utils/`.
- **`repository` URL in `package.json`:** Currently `the-coded/pstash-cli.git` — may need updating to `the-coded/pstash.git` to match the actual repo name after transfer. **Verify before npm publish with provenance.**
- **No file locking:** Concurrent pstash invocations on same machine could theoretically corrupt state. Unlikely in practice.
- **Large file memory:** `readFile()` for SHA-256 hashing loads entire file into memory. Not an issue for typical stash files but could be for >1GB files.
