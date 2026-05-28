# pstash — Complete Project Context

> Auto-generated deep-dive analysis based on codebase inspection.
> Generated on: 2026-05-26

---

## 1. Identity & Purpose

- **What is this project?** `pstash` is a Node.js CLI tool that provides a git-backed personal file stash system. It copies files from any project into a private git repository (`~/.pstash`), organizing them by project name with metadata, tags, and optional compression. Think `git stash` but for _any_ file, across _any_ project, synced to a private remote for multi-machine use.

- **Problem it solves:** Developers often have files (notes, drafts, WIP configs, snippets) that don't belong in a project's git history but need to be persistent, organized by project, and available across machines. `pstash` provides a structured, git-backed solution for this.

- **Target users/consumers:** Individual developers who work across multiple projects and machines. Also exports a programmatic API via `src/index.ts` for potential library consumers.

- **Business domain:** Developer tooling / personal productivity.

- **Project maturity:** **Early MVP (v0.1.0)**. Evidence: version `0.1.0` in `package.json`, no CI/CD pipeline, no `.github/` directory, no changelog. However, code quality is high — 315 tests passing, strict TypeScript, comprehensive README (693 lines), lint/format configs in place.

- **README accuracy:** The README accurately reflects the current state. All 13 documented commands exist and match the implementation. Config keys, stash ID format, data repo structure, and interactive mode descriptions are all correct. No discrepancies found.

---

## 2. Stack & Infrastructure

### 2.1 Core Technologies

| Technology | Version | Usage |
|---|---|---|
| TypeScript | ^6.0.2 | Primary language — all source and tests |
| Node.js | >=20.0.0 | Runtime (specified in `engines`) |
| npm | — | Package manager, lock file present (`package-lock.json`) |

### 2.2 Build & Tooling

| Tool | Config File | Purpose |
|---|---|---|
| **tsup** v8.5.1 | `tsup.config.ts` | Bundler — produces ESM output with DTS and source maps |
| **TypeScript** ^6.0.2 | `tsconfig.json` | Type checking — strict mode, ESM module resolution |
| **ESLint** ^10.1.0 | `eslint.config.ts` | Linting — flat config with `@typescript-eslint`, `eslint-config-prettier` |
| **Prettier** ^3.8.1 | `.prettierrc` | Formatting — 100 print width, no semicolons, double quotes, trailing commas |
| **Vitest** ^4.1.2 | `vitest.config.ts` | Test runner — with `@vitest/coverage-v8` |
| **tsx** ^4.21.0 | — | Dev runner (`npm run dev`, `npm run start`) |

**tsup configuration** (`tsup.config.ts`):
- Entry points: `bin/pstash.ts` (CLI) + `src/index.ts` (library)
- Format: ESM only
- Target: `node20`
- DTS generation enabled
- Source maps enabled
- `shims: true` for CJS compatibility shims
- Clean output on build

**TypeScript configuration** (`tsconfig.json`):
- `strict: true`
- `module: "NodeNext"` / `moduleResolution: "NodeNext"`
- `target: "ES2023"`
- `verbatimModuleSyntax: true`
- No path aliases (all imports use relative `.js` extensions)

### 2.3 Infrastructure & Deployment

- **Containerization:** N/A — CLI tool installed via npm.
- **CI/CD:** None present. No `.github/`, `.gitlab-ci.yml`, or equivalent. The `prepublishOnly` script (`npm run build && npm run typecheck`) is the only publish safeguard.
- **Hosting/deployment:** npm registry (package name: `pstash`).
- **Infrastructure as Code:** N/A.
- **Environment management:** No `.env` files. Configuration is user-facing via `~/.pstashrc` (JSON). No secrets management needed — the tool delegates auth to the user's git credential setup.

### 2.4 Data Stores

- **Databases:** None.
- **File storage:** Local filesystem. Stash data stored in `~/.pstash/` (a git repository). Config stored in `~/.pstashrc` (JSON). Per-project index in `.project.json`. Per-stash metadata in `.stash.json`.
- **Caching:** None.
- **Message brokers:** None.
- **Search engines:** None.

### 2.5 Observability

- **Logging:** None. The CLI uses `ora` spinners and `chalk` colored output for user feedback, but has no structured logging system.
- **Monitoring:** None.
- **Error tracking:** None.
- **Tracing:** None.

---

## 3. Architecture & Structure

### 3.1 Architectural Pattern

- **Primary pattern:** **Layered CLI Architecture** — a pragmatic 3-layer design for CLI tools.
- **Evidence:** Clear separation between CLI layer (`commands/`), business logic (`core/`), and utilities (`utils/`). Commands orchestrate core operations but don't implement business logic directly (with one exception: `diff.ts` contains an LCS algorithm).
- **Layers identified:**

| Layer | Directory | Responsibility |
|---|---|---|
| **Entry point** | `bin/pstash.ts` | Shebang + bootstrap |
| **CLI registration** | `src/cli.ts` | Commander.js program setup, command registration |
| **Commands** | `src/commands/` | Argument parsing, prompts, UX (spinners/colors), orchestration |
| **Core** | `src/core/` | Business logic — stash CRUD, git operations, project detection, compression |
| **Config** | `src/config/` | Config loading/saving/validation, default templates |
| **Schemas** | `src/schemas.ts` | Zod SSoT for all types — shared across all layers |
| **Utils** | `src/utils/` | Pure utilities — formatting, time, validation, filesystem helpers, prompts |

### 3.2 Directory Structure Map

```
pstash-cli/
├── bin/
│   └── pstash.ts              — CLI entry point (shebang, imports run() from cli.ts)
├── src/
│   ├── cli.ts                 — Commander.js program setup, registers all 13 commands
│   ├── index.ts               — Public API surface (re-exports schemas + config)
│   ├── schemas.ts             — Zod SSoT: all types derived from schemas
│   ├── commands/              — One file per CLI command (13 commands)
│   │   ├── apply.ts           — pstash apply (restore without delete)
│   │   ├── clean.ts           — pstash clean (bulk remove old stashes)
│   │   ├── config.ts          — pstash config (view/set config values)
│   │   ├── diff.ts            — pstash diff (compare stashes or stash vs cwd)
│   │   ├── drop.ts            — pstash drop (delete stash without restoring)
│   │   ├── init.ts            — pstash init (clone data repo, create ~/.pstashrc)
│   │   ├── list.ts            — pstash list (list stashes)
│   │   ├── pop.ts             — pstash pop (restore + delete stash)
│   │   ├── save.ts            — pstash save (stash files)
│   │   ├── show.ts            — pstash show (show stash details)
│   │   ├── status.ts          — pstash status (repo status + summary)
│   │   ├── sync.ts            — pstash sync (manual pull/push)
│   │   └── update.ts          — pstash update (overwrite existing stash)
│   ├── config/                — Configuration management
│   │   ├── loader.ts          — Load/save ~/.pstashrc, path resolution
│   │   └── templates.ts       — Default config templates, config key descriptions
│   ├── core/                  — Business logic
│   │   ├── compressor.ts      — tar.gz compression/decompression
│   │   ├── detector.ts        — Project name detection (git remote / dirname / aliases)
│   │   ├── git.ts             — GitManager: simple-git wrapper (commit, pull, push)
│   │   ├── indexer.ts         — .project.json management (project-level index)
│   │   └── stasher.ts         — Core CRUD: save/restore/delete/list stash entries
│   └── utils/                 — Pure utilities
│       ├── format.ts          — Output formatting (stash lines, byte sizes, etc.)
│       ├── fs.ts              — Filesystem helpers (exists, ensureDir, removeFiles, etc.)
│       ├── prompts.ts         — Interactive prompts (message input, file picker, selectors)
│       ├── time.ts            — Time parsing (7d, 2w, 1m → Date), relative formatting
│       ├── validation.ts      — CLI argument validation (index bounds, filter requirements)
│       └── version.ts         — CLI version from package.json
├── tests/                     — Mirror structure of src/ (22 test files)
│   ├── commands/              — One test file per command
│   ├── config/                — Config loader tests
│   ├── core/                  — Core module tests
│   └── utils/                 — Utility tests
└── assets/
    └── pstash.png             — README hero image
```

### 3.3 Entry Points

| Type | File | Description |
|---|---|---|
| **CLI entry** | `bin/pstash.ts` | `#!/usr/bin/env node` shebang → imports `run()` from `src/cli.ts` |
| **Library entry** | `src/index.ts` | Re-exports schemas, config loader, templates for programmatic use |
| **Build entry** | `tsup.config.ts` | Configures two entry points: `bin/pstash.ts` + `src/index.ts` |

### 3.4 Request/Data Flow

Trace of a typical `pstash save "my notes" *.md` operation:

1. **Entry:** `bin/pstash.ts` → calls `run()` in `src/cli.ts`
2. **Routing:** Commander.js matches `save` command → calls action in `src/commands/save.ts`
3. **Config loading:** `loadConfig()` reads and validates `~/.pstashrc` via Zod
4. **Path resolution:** `resolveLocalPath(config)` expands `~/.pstash` to absolute path
5. **Auto-sync pull:** If `autoSync=true`, `GitManager.pull()` fetches latest from remote
6. **Project detection:** `ProjectDetector.detectAndResolve(config)` → git remote → alias resolution
7. **Glob expansion:** `globby(files)` resolves `*.md` to actual file list
8. **Core save:** `Stasher.save({ project, message, files, ... })`:
   - Generates stash ID (`YYYY-MM-DD_HH-mm_XXXX`)
   - Creates stash directory under `~/.pstash/<project>/<stash-id>/`
   - Copies files preserving relative paths
   - Computes SHA-256 hashes per file
   - Optionally compresses to `stash.tar.gz`
   - Writes `.stash.json` metadata
9. **Index update:** `Indexer.addStash(project, metadata)` updates `.project.json`
10. **Auto-sync push:** `GitManager.commitAll("pstash: save ...")` + `GitManager.push()`
11. **Output:** Spinner succeed + formatted stash summary via `chalk`

### 3.5 Module/Package Dependency Graph

```
bin/pstash.ts
  └── src/cli.ts
        └── src/commands/* (13 command files)

src/commands/* (all commands depend on):
  ├── src/config/loader.ts      — loadConfig(), resolveLocalPath()
  ├── src/core/detector.ts      — ProjectDetector
  ├── src/core/stasher.ts       — Stasher
  ├── src/core/indexer.ts       — Indexer
  ├── src/core/git.ts           — GitManager
  ├── src/utils/format.ts       — formatStashLine(), etc.
  ├── src/utils/prompts.ts      — interactive prompts
  ├── src/utils/validation.ts   — validateStashIndex(), etc.
  └── src/schemas.ts            — types (via Zod infer)

src/core/stasher.ts
  ├── src/schemas.ts            — StashMetadataSchema, StashFileSchema
  ├── src/core/compressor.ts    — compress(), decompress()
  └── src/utils/fs.ts           — exists()

src/core/indexer.ts
  ├── src/schemas.ts            — ProjectIndexSchema
  └── src/utils/fs.ts           — exists()

src/core/git.ts
  └── (external: simple-git)

src/core/detector.ts
  ├── src/schemas.ts            — GlobalConfig type
  └── (external: simple-git)

src/core/compressor.ts
  ├── src/utils/fs.ts           — exists()
  └── (external: tar)

src/config/loader.ts
  ├── src/schemas.ts            — GlobalConfigSchema
  └── src/utils/fs.ts           — exists()

src/index.ts (public API)
  ├── src/schemas.ts
  ├── src/config/loader.ts
  └── src/config/templates.ts
```

- **No circular dependencies found.**
- **Highest afferent coupling (most depended upon):** `src/schemas.ts` — used by every layer.
- **Highest efferent coupling (most external deps):** `src/core/stasher.ts` — depends on `globby`, `nanoid`, `micromatch`, `node:crypto`, `node:fs`, plus internal modules.

### 3.6 Monorepo / Workspace Structure

N/A — single-package repository.

---

## 4. Code Patterns & Conventions

### 4.1 Naming Conventions

| Element | Convention | Examples |
|---|---|---|
| **Files** | kebab-case `.ts` | `stasher.ts`, `prompt-builder.ts`, `save.test.ts` |
| **Variables/functions** | camelCase | `loadConfig()`, `resolveLocalPath()`, `formatStashLine()` |
| **Constants** | UPPER_SNAKE_CASE | `ARCHIVE_NAME`, `CONFIG_FILE_NAME`, `METADATA_FILE` |
| **Classes** | PascalCase | `Stasher`, `GitManager`, `ProjectDetector`, `Indexer` |
| **Types/interfaces** | PascalCase (Zod-inferred) | `StashMetadata`, `GlobalConfig`, `ProjectIndex` |
| **Command option interfaces** | PascalCase + `Options` suffix | `SaveCommandOptions`, `PopCommandOptions` |
| **Test files** | `<module>.test.ts` | `stasher.test.ts`, `save.test.ts` |
| **Schemas** | PascalCase + `Schema` suffix | `StashMetadataSchema`, `GlobalConfigSchema` |

### 4.2 Design Patterns Identified

| Pattern | Location | Description |
|---|---|---|
| **Zod SSoT (Schema-first types)** | `src/schemas.ts` | All types derived from Zod schemas via `z.infer<>`. Zero manual `interface`/`type` declarations. Validation at every I/O boundary. |
| **Facade** | `src/core/git.ts` (`GitManager`) | Wraps `simple-git` into a simplified interface with only the methods pstash needs (`commitAll`, `pull`, `push`, `clone`, `log`). |
| **Strategy (implicit)** | `src/core/detector.ts` | Detection tries multiple strategies in order: origin remote → other remotes → directory basename. |
| **Command pattern** | `src/commands/*` + `src/cli.ts` | Each command is a self-contained module registered via Commander.js. `cli.ts` acts as the command registry. |
| **Builder (partial)** | `src/commands/save.ts`, `update.ts` | Commands build up options objects incrementally from CLI flags + interactive prompts before passing to core. |
| **Factory function** | `src/config/templates.ts` (`createDefaultConfig()`) | Creates default config objects with sensible defaults. |
| **Forward compatibility** | `src/schemas.ts` (`.passthrough()`) | `GlobalConfigSchema` and `ProjectMetaSchema` use `.passthrough()` to preserve unknown fields during read-modify-write cycles. |

### 4.3 Error Handling Strategy

- **Global error handler:** `src/cli.ts` wraps the top-level `program.parseAsync()` in a try/catch that calls `handleGlobalError()`, which prints a styled error message and exits with code 1.
- **Error types:** No custom error hierarchy. All errors are plain `Error` instances with descriptive string messages (e.g., `"No files matched the given patterns"`, `"Stash index X is out of range"`).
- **Error propagation:** Throw/catch pattern. Core functions throw, commands catch and display via `spinner.fail()` + `chalk.red()`.
- **User-facing errors:** Formatted with `chalk.red()` and sometimes `chalk.dim()` for hints. Spinners transition from "working..." to failure state.
- **Logging on error:** Error message printed to stderr. No structured logging.

### 4.4 Logging Patterns

N/A — No logging system. The CLI uses:
- `ora` spinners for progress indication
- `chalk` for colored output
- `console.log` for data output (stash lists, config values, diff results)
- `process.exit(1)` for fatal errors

### 4.5 Code Style & Formatting

**Prettier** (`.prettierrc`):
- Print width: 100
- No semicolons
- Double quotes
- Trailing commas: `all`
- Arrow parens: `always`
- Tab width: 2

**ESLint** (`eslint.config.ts`):
- Flat config format
- `@typescript-eslint` recommended rules
- `eslint-config-prettier` to disable conflicting rules
- Ignores: `dist/`, `node_modules/`, `coverage/`

**Import ordering:** No enforced import ordering rule. Convention observed:
1. Node.js built-ins (`node:path`, `node:fs/promises`)
2. External dependencies (`chalk`, `ora`, `zod`, `commander`)
3. Internal modules (relative imports with `.js` extension)

**File organization:** Each module follows:
1. JSDoc module documentation header
2. Imports
3. Types/interfaces (if command files — option interfaces)
4. Exports (functions or classes)

### 4.6 Type System Usage

- **Strictness:** `strict: true` in `tsconfig.json` (enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, etc.)
- **`verbatimModuleSyntax: true`:** Enforces `import type` for type-only imports.
- **Type patterns:**
  - Zod schemas as SSoT — all types derived via `z.infer<typeof Schema>` (`src/schemas.ts`)
  - Discriminated unions: not used (no complex state machines)
  - Generics: minimal usage, mostly from Zod itself
- **Runtime type validation:** Zod at every I/O boundary:
  - `StashMetadataSchema.parse()` when reading `.stash.json` (`src/core/stasher.ts`)
  - `ProjectIndexSchema.parse()` when reading `.project.json` (`src/core/indexer.ts`)
  - `GlobalConfigSchema.parse()` when reading `~/.pstashrc` (`src/config/loader.ts`)

---

## 5. API Surface

### 5.1 CLI Commands (External Interface)

pstash exposes 13 CLI commands via Commander.js:

| Command | Purpose | Sync Behavior | Interactive Mode |
|---|---|---|---|
| `init` | Clone data repo, create `~/.pstashrc` | Clone only | Prompt for remote URL |
| `save` | Stash files with message + tags | Pull before, push after | Message + file picker |
| `update` | Overwrite existing stash's files | Pull before, push after | Stash selector + file picker |
| `list` | List stashes (current project or all) | Pull before | — |
| `pop` | Restore files + delete stash | Pull before, push after | Stash selector |
| `apply` | Restore files (keep stash) | Pull before only | Stash selector |
| `sync` | Manual pull/push | Explicit pull/push | — |
| `show` | Show stash details or file contents | Pull before | Stash selector |
| `drop` | Delete stash without restoring | Pull before, push after | Multi-select picker |
| `status` | Show repo status + project summary | Pull before | — |
| `clean` | Bulk-remove old/filtered stashes | Pull before, push after | — |
| `diff` | Compare stashes or stash vs cwd | Pull before | Stash selector + target picker |
| `config` | View/set config values | — | — |

### 5.2 Programmatic API (`src/index.ts`)

Exports for library consumers:

| Export | Source | Purpose |
|---|---|---|
| All Zod schemas + inferred types | `src/schemas.ts` | `StashMetadataSchema`, `GlobalConfigSchema`, `ProjectIndexSchema`, etc. |
| `loadConfig()`, `saveConfig()` | `src/config/loader.ts` | Read/write `~/.pstashrc` |
| `resolveLocalPath()` | `src/config/loader.ts` | Expand `~` in config paths |
| `createDefaultConfig()` | `src/config/templates.ts` | Generate default config object |
| `CONFIG_DESCRIPTIONS` | `src/config/templates.ts` | Descriptions for each config key |

### 5.3 Authentication & Authorization

N/A — pstash delegates all git authentication to the user's existing git credential setup (SSH keys, credential helpers, etc.). No application-level auth.

### 5.4 Real-time Communication

N/A — CLI tool, no server component.

---

## 6. Data Layer

### 6.1 Data Models / Schema

All schemas defined in `src/schemas.ts` using Zod:

| Schema | File | Purpose | Key Fields |
|---|---|---|---|
| `StashFileSchema` | `schemas.ts:27` | Single file entry | `name`, `size`, `hash` |
| `StashMetadataSchema` | `schemas.ts:35` | `.stash.json` per stash | `id`, `project`, `timestamp`, `updatedAt?`, `message`, `tags[]`, `branch?`, `commit?`, `user`, `files[]`, `totalSize`, `compressed` |
| `ProjectMetaSchema` | `schemas.ts:57` | Per-project in config | `aliases[]`, `remote?` |
| `ProjectIndexSchema` | `schemas.ts:64` | `.project.json` per project | `project`, `stashCount`, `totalSize`, `aliases[]`, `stashes[]` |
| `ProjectIndexStashEntry` | `schemas.ts:58` | Entry in project index | `id`, `timestamp`, `message`, `tags[]`, `fileCount`, `totalSize`, `compressed` |
| `GlobalConfigSchema` | `schemas.ts:80` | `~/.pstashrc` | `version`, `remote`, `localPath`, `autoSync`, `projects{}`, `defaults{}` |
| `DefaultsSchema` | `schemas.ts:73` | Config defaults | `keepOnPop`, `compression`, `removeAfterSave` |
| CLI option schemas | `schemas.ts:100+` | Per-command options | Various per command |

**Relationships:**
- `GlobalConfig` → has many `ProjectMeta` (via `projects` map)
- `ProjectIndex` → has many `ProjectIndexStashEntry` (via `stashes` array)
- `StashMetadata` → has many `StashFile` (via `files` array)

### 6.2 Data Access Patterns

- **No ORM/database.** All data is JSON files on the filesystem.
- **Read pattern:** `readFile()` → `JSON.parse()` → `ZodSchema.parse()` (validation at read boundary).
- **Write pattern:** Construct object → `JSON.stringify(data, null, 2)` → `writeFile()`.
- **File operations:** All via `node:fs/promises` (async). Helper functions in `src/utils/fs.ts`.
- **Atomic-ish writes:** Not explicitly atomic (no temp file + rename pattern). Acceptable for single-user CLI tool.

### 6.3 Data Validation

- **Validation layer:** At every I/O boundary — when reading `.stash.json`, `.project.json`, and `~/.pstashrc`.
- **Validation library:** Zod v4.
- **Forward compatibility:** `GlobalConfigSchema` and `ProjectMetaSchema` use `.passthrough()` to preserve unknown fields during read-modify-write, preventing data loss when older CLI versions encounter config written by newer versions.
- **Strict schemas:** `StashMetadataSchema` and `ProjectIndexSchema` do NOT use `.passthrough()` — they're fully controlled by the CLI.

### 6.4 File Storage Layout

```
~/.pstashrc                              ← GlobalConfig (JSON)
~/.pstash/                               ← Git repo (clone of user's private data repo)
  └── <project>/
      ├── .project.json                  ← ProjectIndex
      └── <stash-id>/                    ← YYYY-MM-DD_HH-mm_XXXX
          ├── .stash.json                ← StashMetadata
          ├── stash.tar.gz               ← (if compressed)
          └── <files...>                 ← (if uncompressed, preserving relative paths)
```

### 6.5 Caching Strategy

N/A — no caching. Every read operation reads from disk. The `autoSync` pull mechanism acts as a freshness guarantee for multi-machine scenarios.

---

## 7. State Management

### 7.1 Client-Side State

N/A — CLI tool, no UI state.

### 7.2 Application State

- **No in-memory state across commands.** Each CLI invocation is a fresh process.
- **Persistent state:** `~/.pstashrc` (config) + `~/.pstash/` (data repo with git history).
- **Concurrency:** No locking mechanism. If two machines run `pstash save` simultaneously, git merge conflicts could occur on push. Mitigated by `autoSync` pull-before-write pattern but not bulletproof.

---

## 8. Configuration & Environment

### 8.1 Configuration Files Inventory

| File | Purpose |
|---|---|
| `package.json` | npm package manifest, scripts, dependencies |
| `tsconfig.json` | TypeScript compiler configuration (strict, ESM, ES2023) |
| `tsup.config.ts` | Build configuration (ESM, DTS, node20 target) |
| `eslint.config.ts` | Linting rules (flat config, TypeScript, Prettier compat) |
| `.prettierrc` | Code formatting (100 width, no semis, double quotes) |
| `vitest.config.ts` | Test runner config (globals disabled, coverage via v8) |
| `.npmrc` | npm config (`package-lock=true`) |
| `.gitignore` | Git ignores (`node_modules/`, `dist/`, `coverage/`, `*.tgz`) |
| `LICENSE` | MIT license |

### 8.2 User-Facing Configuration (`~/.pstashrc`)

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| `version` | string | `"1.0.0"` | Yes | Config schema version |
| `remote` | string | — | Yes | Git URL of the data repo |
| `localPath` | string | `"~/.pstash"` | Yes | Local clone path |
| `autoSync` | boolean | `true` | Yes | Auto pull/push on operations |
| `projects` | object | `{}` | Yes | Project alias mappings |
| `defaults.keepOnPop` | boolean | `false` | Yes | Keep stash after pop (like apply) |
| `defaults.compression` | boolean | `false` | Yes | Compress stashes by default |
| `defaults.removeAfterSave` | boolean | `false` | Yes | Delete source files after save |

**Validation:** Config is validated via `GlobalConfigSchema.parse()` at load time (`src/config/loader.ts`). Invalid config causes immediate error with Zod validation message.

### 8.3 Environment Variables

None. The tool is fully configured via `~/.pstashrc` and CLI flags.

### 8.4 Feature Flags

None.

### 8.5 Secrets Management

N/A — no application secrets. Git authentication is delegated to the user's system-level git credential configuration.

---

## 9. Testing

### 9.1 Test Infrastructure

| Aspect | Detail |
|---|---|
| **Test runner** | Vitest v4.1.2 |
| **Assertion library** | Vitest built-in `expect` |
| **Mocking** | Vitest `vi.mock()`, `vi.hoisted()`, `vi.fn()` |
| **Coverage tool** | `@vitest/coverage-v8` |
| **Test database** | N/A — filesystem operations use real temp dirs (`node:os.tmpdir()`) |

### 9.2 Test Structure & Coverage

- **Test file location:** Separate `tests/` directory mirroring `src/` structure.
- **Naming convention:** `<module>.test.ts`
- **Total tests:** 315 passing across 22 test files.

**Source lines vs test lines:**

| Area | Source Lines | Test Lines | Ratio |
|---|---|---|---|
| Commands (13 files) | 2,636 | 3,505 | 1.33x |
| Core (5 files) | 1,015 | 1,226 | 1.21x |
| Config (2 files) | 173 | 315 | 1.82x |
| Utils (6 files) | 614 | 776 | 1.26x |
| **Total** | **5,168** | **6,507** | **1.26x** |

### 9.3 Test Types Present

| Type | Present | Details |
|---|---|---|
| **Unit tests** | ✅ | All command, config, util, and most core tests mock dependencies |
| **Integration tests** | ✅ (partial) | `stasher.test.ts` and `compressor.test.ts` do real filesystem round-trips (save→restore→delete) using temp directories |
| **End-to-end tests** | ❌ | No full CLI invocation tests |
| **Contract tests** | N/A | No external API contracts |
| **Performance tests** | ❌ | No performance/load tests |
| **Snapshot tests** | ❌ | Not used |

### 9.4 Test Patterns

- **Mock setup:** Commands use `vi.hoisted()` to declare mocks before `vi.mock()` calls. This pattern is consistent across all 13 command test files.
- **Fixtures:** Test data is constructed inline using helper functions (e.g., `makeConfig()`, `makeMeta()`). No shared fixture files.
- **Setup/teardown:** `beforeEach` clears mocks. `stasher.test.ts` and `compressor.test.ts` create temp dirs in `beforeAll` and clean up in `afterAll`.
- **Determinism:** Tests are deterministic. Filesystem tests use unique temp directories. Time-dependent tests mock `Date` or use the `time.ts` module's deterministic parsing.
- **Flaky risk:** `stasher.test.ts` and `compressor.test.ts` do real I/O which is slower (~500-800ms) but not flaky due to isolated temp dirs.

### 9.5 Edge Cases Well Tested

- Index out of range for pop/apply/show/drop
- Empty stash list early returns
- Restore failure preventing deletion (pop atomicity)
- File conflict detection (`already exists` without `--force`)
- Glob patterns matching no files
- Interactive mode with missing args
- `--noSync` override of `autoSync=true`
- Flag interaction: `--rm` vs `--keep` vs `config.removeAfterSave`
- Compression flag override vs config defaults
- `.passthrough()` preserving unknown fields
- Stash ID format validation
- Timespec parsing (`7d`, `2w`, `1m`, `3M`, ISO 8601)
- SHA-256 hash format verification

---

## 10. Security

### 10.1 Authentication

N/A — CLI tool. Git auth delegated to system credentials.

### 10.2 Authorization

N/A — single-user tool operating on the user's own filesystem and git repos.

### 10.3 Input Security

- **Path traversal:** `Stasher.save()` uses `path.relative(cwd, absolutePath)` and falls back to `basename()` for files outside `cwd`, preventing directory traversal in stash storage. (`src/core/stasher.ts`)
- **CLI input validation:** Zod schemas validate all structured data at I/O boundaries. CLI arguments validated by dedicated functions in `src/utils/validation.ts`.
- **No `eval()` or `exec()`:** Git operations use `simple-git` library (not shell exec).
- **No network calls:** Except through `simple-git` for git pull/push (uses user's git config).

### 10.4 Sensitive Data Handling

- **PII:** `StashMetadata.user` stores `username@hostname` (from `os.userInfo()` + `os.hostname()`). This is stored in `.stash.json` in the user's private repo.
- **No secrets in code:** No hardcoded credentials, API keys, or tokens.
- **No logging of sensitive data:** No structured logging system at all.

---

## 11. Dependencies & Integrations

### 11.1 External Services

| Service | Purpose | Auth Method |
|---|---|---|
| User's private git remote | Stash data storage + sync | User's git credentials (SSH/HTTPS) |

### 11.2 Key Runtime Dependencies

| Library | Version | Purpose | Why This One |
|---|---|---|---|
| `commander` | ^14.0.3 | CLI framework | Industry standard for Node.js CLIs |
| `zod` | ^4.3.6 | Schema validation + type inference | SSoT pattern, runtime + compile-time safety |
| `simple-git` | ^3.33.0 | Git operations | Most popular Node.js git wrapper |
| `chalk` | ^5.6.2 | Colored terminal output | De facto standard |
| `ora` | ^9.3.0 | Terminal spinners | Most popular spinner library |
| `globby` | ^16.2.0 | Glob pattern matching | Modern glob with gitignore support |
| `tar` | ^7.5.13 | tar.gz compression | Node.js-native tar implementation |
| `nanoid` | ^5.1.7 | Unique ID generation | Lightweight, URL-safe IDs |
| `@inquirer/prompts` | ^8.3.2 | Interactive prompts | Modern Inquirer.js (modular) |
| `date-fns` | ^4.1.0 | Date formatting | Lightweight, tree-shakeable |
| `micromatch` | ^4.0.8 | Glob matching (partial restore) | Fast, well-maintained |
| `pretty-bytes` | ^7.1.0 | Human-readable file sizes | Simple, focused utility |

### 11.3 Key Dev Dependencies

| Library | Version | Purpose |
|---|---|---|
| `typescript` | ^6.0.2 | Type checking |
| `tsup` | ^8.5.1 | Bundler |
| `vitest` | ^4.1.2 | Test runner |
| `tsx` | ^4.21.0 | TypeScript execution (dev mode) |
| `eslint` | ^10.1.0 | Linting |
| `prettier` | ^3.8.1 | Formatting |

### 11.4 Dependency Health

- **Lock file:** `package-lock.json` present and committed. ✅
- **All packages on latest major versions** as of the project creation date.
- **No deprecated packages identified.**
- **ESM-only dependencies** (`chalk`, `ora`, `globby`, `nanoid`, `pretty-bytes`) — properly handled via ESM module format.

---

## 12. Developer Experience

### 12.1 Onboarding

**Prerequisites:** Node.js 20+, Git.

**Setup steps:**
1. `git clone <repo-url> && cd pstash-cli`
2. `npm install`
3. `npm run build` — verify build works
4. `npm test` — verify all 315 tests pass
5. `npm run start -- --help` — run CLI in dev mode

**Setup friction:** Minimal. No env files, no Docker, no external services needed for development.

### 12.2 Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `build` | `tsup` | Build ESM + DTS output to `dist/` |
| `dev` | `tsx watch bin/pstash.ts` | Run CLI with file watching (hot reload) |
| `start` | `tsx bin/pstash.ts` | Run CLI once (dev mode, no build needed) |
| `typecheck` | `tsc --noEmit` | Type check without emitting |
| `lint` | `eslint .` | Lint all files |
| `lint:fix` | `eslint . --fix` | Lint + auto-fix |
| `format` | `prettier --write .` | Format all files |
| `format:check` | `prettier --check .` | Check formatting |
| `test` | `vitest run` | Run all tests once |
| `test:watch` | `vitest` | Run tests in watch mode |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage report |
| `prepublishOnly` | `npm run build && npm run typecheck` | Safety gate before publish |

### 12.3 Documentation

| Type | Quality | Notes |
|---|---|---|
| **README** | Excellent | 693 lines, TOC, all commands documented with options/examples, architecture diagram, config reference |
| **Inline docs** | Excellent | Every module has JSDoc header with `@module`, `@example`. Classes and public methods have JSDoc with `@param`/`@returns`. |
| **Architecture docs** | README only | Architecture section in README. No separate ADRs or design docs. |
| **API docs** | Implicit | Types exported via `src/index.ts` are well-typed via Zod. No generated API docs (TSDoc/TypeDoc). |

### 12.4 Git Workflow

- **Branching strategy:** Not formalized (no branch protection rules visible).
- **Commit conventions:** Informal — no conventional commits enforced, no commitlint.
- **PR process:** No PR templates or required reviews visible.
- **Git hooks:** None. No husky, lint-staged, or pre-commit hooks.
- **`.gitignore` coverage:** Adequate — covers `node_modules/`, `dist/`, `coverage/`, `*.tgz`.

---

## 13. Business Logic Deep-Dive

### 13.1 Core Domain Entities

#### StashEntry (`.stash.json`)
- **Purpose:** A single stash — a snapshot of files at a point in time.
- **Key properties:** `id` (unique), `project`, `timestamp`, `message`, `tags[]`, `files[]` (with name/size/hash), `compressed`, `user` (`username@hostname`), `branch?`, `commit?`
- **Invariants:**
  - ID format: `YYYY-MM-DD_HH-mm_XXXX` (timestamp + nanoid suffix)
  - At least one file required
  - Hash is SHA-256 of file contents
  - `totalSize` equals sum of `files[].size`
- **File:** `src/schemas.ts` (schema), `src/core/stasher.ts` (operations)

#### ProjectIndex (`.project.json`)
- **Purpose:** Per-project index tracking all stashes, counts, and sizes.
- **Key properties:** `project`, `stashCount`, `totalSize`, `aliases[]`, `stashes[]`
- **Invariants:**
  - `stashCount` must equal `stashes.length`
  - `totalSize` must equal sum of `stashes[].totalSize`
  - Stashes sorted by timestamp (newest first)
- **File:** `src/schemas.ts` (schema), `src/core/indexer.ts` (operations)

#### GlobalConfig (`~/.pstashrc`)
- **Purpose:** User-wide configuration.
- **Key properties:** `version`, `remote`, `localPath`, `autoSync`, `projects{}` (alias map), `defaults{}`
- **Invariants:**
  - `remote` must be a valid git URL
  - `localPath` defaults to `~/.pstash`
  - Uses `.passthrough()` for forward compatibility
- **File:** `src/schemas.ts` (schema), `src/config/loader.ts` (I/O), `src/config/templates.ts` (defaults)

### 13.2 Business Workflows

#### 1. Save Workflow
- **Trigger:** `pstash save [message] [files...]`
- **Steps:**
  1. Load + validate config
  2. Auto-pull if `autoSync` enabled
  3. Detect project (git remote → alias resolution)
  4. Resolve file patterns (globby) or interactive picker
  5. `Stasher.save()`: create dir, copy files, hash, optional compress, write metadata
  6. `Indexer.addStash()`: update `.project.json`
  7. `GitManager.commitAll()` + `push()`
  8. Optionally remove source files (`--rm`)
- **Error scenarios:** No files match patterns → error before any write. Git push fails → stash saved locally but not synced (next sync fixes it).
- **Files:** `src/commands/save.ts`, `src/core/stasher.ts`, `src/core/indexer.ts`

#### 2. Pop/Apply Workflow
- **Trigger:** `pstash pop [index]` or `pstash apply [index]`
- **Steps:**
  1. Load config, auto-pull
  2. Detect project, list stashes, validate index
  3. `Stasher.restore()`: decompress if needed, copy files to dest, conflict check
  4. (Pop only) `Stasher.delete()` + `Indexer.removeStash()` + commit + push
- **Error scenarios:** Index out of range → error. File conflict without `--force` → error (no partial restore). Restore failure → stash NOT deleted (atomic pop guarantee).
- **Files:** `src/commands/pop.ts`, `src/commands/apply.ts`, `src/core/stasher.ts`

#### 3. Clean Workflow
- **Trigger:** `pstash clean --older-than 30d` (requires at least one filter)
- **Steps:**
  1. Load config, auto-pull, detect project
  2. Load all stash metadata, apply filters (age, tag, keep-N)
  3. Confirm with user (unless `--force` or `--dry-run`)
  4. Delete matching stashes + update indexes
  5. Commit + push
- **Safety:** Requires at least one filter flag (prevents accidental `clean` with no args).
- **Files:** `src/commands/clean.ts`, `src/core/stasher.ts`, `src/core/indexer.ts`

#### 4. Diff Workflow
- **Trigger:** `pstash diff [indexA] [indexB]`
- **Steps:**
  1. Load config, auto-pull, detect project
  2. Resolve stash A and stash B (or cwd)
  3. Read file contents from both sides
  4. Compute LCS diff per file
  5. Render colored inline diff
- **Files:** `src/commands/diff.ts` (includes LCS algorithm implementation)

### 13.3 Business Rules & Validations

| Rule | Where Enforced | Description |
|---|---|---|
| Stash must have ≥1 file | `src/core/stasher.ts` | `save()` throws if glob matches nothing |
| Pop is atomic | `src/commands/pop.ts` | Stash only deleted after successful restore |
| Clean requires a filter | `src/commands/clean.ts` | Prevents accidental mass deletion |
| File conflict check | `src/core/stasher.ts` | `restore()` checks if dest files exist, requires `--force` |
| Alias resolution | `src/core/detector.ts` | Multiple repo names can map to one project |
| ID uniqueness | `src/core/stasher.ts` | `YYYY-MM-DD_HH-mm_XXXX` with nanoid suffix |
| Config forward compat | `src/schemas.ts` | `.passthrough()` preserves unknown fields |
| Drop all = double confirm | `src/commands/drop.ts` | `--all` requires explicit confirmation unless `--force` |

---

## 14. Performance & Scalability

### 14.1 Performance Patterns

- **Lazy glob expansion:** Files resolved only when needed via `globby`.
- **Streaming compression:** `tar.create()` and `tar.extract()` operate on streams.
- **SHA-256 hashing:** Per-file, using `node:crypto.createHash()` — reads full file into memory via `readFile()`. Acceptable for typical stash file sizes.
- **No pagination needed:** Stash lists are typically small (tens to hundreds). `list` loads all metadata.

### 14.2 Scalability Considerations

- **Single-user tool:** Not designed for concurrent access. No file locking.
- **Git as storage:** Performance degrades with very large repos (thousands of stashes, large files). The `clean` command mitigates this.
- **Memory:** Files read into memory for hashing. Very large files (>1GB) could cause memory issues. Not a typical use case.
- **Compression:** tar.gz reduces repo size but adds CPU overhead per save/restore.

---

## 15. Error Handling & Resilience

### 15.1 Error Architecture

- **No custom error hierarchy.** All errors are `new Error("descriptive message")`.
- **No error codes system.**
- **Error serialization:** Plain text via `chalk.red()` to stderr.

### 15.2 Resilience Patterns

| Pattern | Present | Details |
|---|---|---|
| **Retry logic** | ❌ | No retries for git operations or filesystem |
| **Circuit breaker** | ❌ | N/A for CLI |
| **Timeout** | ❌ | Git operations have no explicit timeout |
| **Fallback** | ✅ | Project detection falls back: origin → other remote → dirname |
| **Graceful degradation** | ✅ | If push fails, stash is still saved locally |
| **Atomic pop** | ✅ | Restore must succeed before stash is deleted |
| **Auto-pull conflict** | ⚠️ | If `git pull` has merge conflicts, the error propagates but isn't specifically handled |

### 15.3 Error Recovery

- **No transaction management** (beyond atomic pop).
- **No idempotency guarantees** (running `save` twice creates two stashes).
- **Manual recovery:** If state gets corrupted, user can `cd ~/.pstash && git log/reset` since it's a regular git repo.

---

## 16. Technical Debt & Observations

### 16.1 Code Smells

| File | Lines | Issue |
|---|---|---|
| `src/core/stasher.ts` | 520 | Largest file. Acceptable — it's the core CRUD module. |
| `src/commands/diff.ts` | 422 | Contains LCS diff algorithm (~100 lines) that belongs in `core/` or `utils/`. |
| `src/cli.ts` | 383 | Large but purely declarative (command registration). Acceptable. |
| `src/schemas.ts` | 383 | Large but it's the SSoT for all types. Acceptable. |

No god objects identified. No deep nesting. No magic numbers (constants are named in `src/config/templates.ts`).

### 16.2 TODO/FIXME/HACK Inventory

**None found.** Zero actionable TODO, FIXME, HACK, or XXX comments in the entire codebase. Clean.

### 16.3 Dead Code

**None found.** No commented-out code blocks, no unused exports (verified by TypeScript + ESLint), no stale feature flags.

### 16.4 Inconsistencies

| Area | Inconsistency | Severity |
|---|---|---|
| **Sync pattern** | The pull-before/push-after pattern is duplicated across ~9 command files with near-identical code. Not DRY but consistent in behavior. | Low (cosmetic) |
| **Diff logic placement** | LCS algorithm in `commands/diff.ts` instead of `core/` or `utils/`. Only inconsistency in the layer separation. | Low |

### 16.5 Improvement Opportunities

| Priority | Area | Description | Effort |
|---|---|---|---|
| **Medium** | DRY sync pattern | Extract pull/push orchestration into a `withSync(config, git, spinner, fn)` helper to eliminate ~9x duplication | Small (1-2h) |
| **Medium** | Diff module extraction | Move LCS diff algorithm from `commands/diff.ts` to `core/differ.ts` or `utils/diff.ts` | Small (30min) |
| **Low** | Custom error types | Introduce `StashNotFoundError`, `ConflictError`, `ValidationError` hierarchy for granular error handling | Medium (2-3h) |
| **Low** | CI/CD pipeline | Add GitHub Actions for test/lint/typecheck on PR + npm publish on release tag | Medium (1-2h) |
| **Low** | Git hooks | Add `husky` + `lint-staged` for pre-commit lint/format | Small (30min) |
| **Low** | E2E tests | Full CLI invocation tests (spawn process, verify stdout/stderr/exit codes) | Medium (4-6h) |
| **Low** | TypeDoc generation | Auto-generate API docs from JSDoc comments for library consumers | Small (1h) |

### 16.6 Risks

| Risk | Severity | Description |
|---|---|---|
| **No CI/CD** | Medium | No automated testing on push/PR. Relies on manual `npm test` before publish. Mitigated by `prepublishOnly` script. |
| **Git merge conflicts** | Low | Concurrent saves from multiple machines could cause merge conflicts on `autoSync` push. Mitigated by pull-before-push pattern, but not bulletproof. |
| **Large file memory** | Low | `readFile()` for hashing loads entire file into memory. Could be an issue for files >1GB. Not a typical use case. |
| **No file locking** | Low | Concurrent pstash invocations on same machine could corrupt state. Unlikely in practice (single-user CLI). |

---

## 17. Summary & Key Takeaways

### 17.1 Architecture Strengths

- **Zod SSoT pattern** is exemplary — zero type/schema drift, validation at every boundary.
- **Clean layer separation** with commands delegating to focused core modules.
- **Excellent test coverage** (315 tests, 1.26x test-to-source ratio) with both unit and filesystem integration tests.
- **Comprehensive documentation** — README is publication-ready, inline JSDoc is thorough.
- **Forward compatibility** via `.passthrough()` on config schemas.
- **No technical debt markers** — zero TODOs, no dead code, no commented-out blocks.
- **Sensible safety guards** — atomic pop, clean requires filters, drop-all requires confirmation.

### 17.2 Architecture Weaknesses

- **Sync pattern duplication** across 9 commands — the most significant DRY violation.
- **Diff algorithm in command layer** — breaks the otherwise clean layer separation.
- **No custom error hierarchy** — all errors are plain `Error`, limiting programmatic error handling.
- **No CI/CD** — relies on developer discipline for quality gates.
- **No E2E tests** — full CLI invocation paths are untested.

### 17.3 Key Files Reference

| File | Why It Matters |
|---|---|
| `src/schemas.ts` | SSoT for all types — understand this first |
| `src/core/stasher.ts` | Core business logic — save/restore/delete/list |
| `src/core/indexer.ts` | Project index management |
| `src/core/git.ts` | Git operations wrapper |
| `src/core/detector.ts` | Project name detection + alias resolution |
| `src/core/compressor.ts` | tar.gz compression/decompression |
| `src/config/loader.ts` | Config file I/O + validation |
| `src/config/templates.ts` | Default config + config key descriptions |
| `src/cli.ts` | Command registration hub |
| `src/commands/save.ts` | Most complex command — good reference for the pattern |
| `src/commands/diff.ts` | Contains LCS algorithm (unusual placement) |
| `src/utils/prompts.ts` | Interactive mode implementation |
| `src/utils/time.ts` | Timespec parsing (7d, 2w, 1m) |
| `src/utils/validation.ts` | CLI argument validation helpers |
| `src/index.ts` | Public API surface |
| `bin/pstash.ts` | CLI entry point |
| `tsup.config.ts` | Build configuration |
| `package.json` | Package metadata, scripts, dependencies |

### 17.4 Glossary

| Term | Definition |
|---|---|
| **Data repo** | The user's private git repository that stores stash data (`~/.pstash`) |
| **Stash** | A snapshot of files with metadata, stored as a directory under `~/.pstash/<project>/<stash-id>/` |
| **Stash ID** | Unique identifier: `YYYY-MM-DD_HH-mm_XXXX` (UTC timestamp + 4-char nanoid) |
| **Project** | A grouping for stashes, auto-detected from git remote or directory name |
| **Alias** | Alternative project name that maps to a canonical name (e.g., `e2e-gen` → `scena`) |
| **autoSync** | Config flag that enables automatic git pull/push around stash operations |
| **SSoT** | Single Source of Truth — refers to the Zod-schema-first type derivation pattern |
| **Project index** | `.project.json` file that tracks stash count, sizes, and summaries per project |

### 17.5 Quick Start for New Developers

1. **Start by reading:** `src/schemas.ts` — understand all data shapes (this is the SSoT for the entire project).
2. **Then understand:** `src/core/stasher.ts` — the core save/restore/delete logic.
3. **Key abstractions:** `Stasher` (CRUD), `Indexer` (project index), `GitManager` (git ops), `ProjectDetector` (project name). All in `src/core/`.
4. **Run the project:** `npm install && npm test` to verify everything works. `npm run start -- --help` to explore the CLI.
5. **Make your first change:** Pick a command in `src/commands/` — they all follow the same pattern (load config → pull → detect project → core op → push → format output). Use `save.ts` as the reference implementation.
