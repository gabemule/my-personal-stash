# create-source-base

> Scaffold an **LLM Wiki oracle** (Karpathy pattern) for **Claude Code +
> Obsidian**, in PT-BR. Generates a self-contained, git-ready folder with
> raw/ for sources, wiki/ for distilled markdown, slash commands, npm
> scripts, and a CLAUDE.md that turns Claude Code into a disciplined wiki
> maintainer.

```bash
npx create-source-base meu-oraculo
```

---

## What is an LLM Wiki?

A pattern by [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f):
three layers — `raw/` (immutable sources you provide), `wiki/`
(interlinked markdown the LLM writes and maintains), and `CLAUDE.md` (the
schema that disciplines the agent). Three core operations: **ingest**,
**query**, **lint**. Persistence over re-derivation: every ingest grows
the wiki; queries read it instead of re-thinking from scratch.

This CLI gives you that whole structure in one command, in Brazilian
Portuguese, ready to use with Claude Code.

---

## Quickstart

```bash
# Interactive
npx create-source-base

# Or pass everything as flags
npx create-source-base meu-livro \
  --name "Meu Livro" \
  --domain "Romance épico de fantasia" \
  --preset book

# Follow next steps printed by the CLI:
cd meu-livro
npm install
npm run init    # opens Claude Code with /wiki-init
```

---

## Presets

A preset adds a few **flat seed pages** at `wiki/` to jumpstart common
domains. Pages are descriptable — delete or rename freely.

| Preset     | Seed pages                                                                       |
|------------|----------------------------------------------------------------------------------|
| `default`  | none (Karpathy-pure: just `index.md`, `log.md`, `overview.md`)                  |
| `book`     | `characters.md`, `world.md`, `timeline.md`, `structure.md`, `themes.md`         |
| `project`  | `goals.md`, `decisions.md`, `stakeholders.md`, `risks.md`, `milestones.md`      |
| `research` | `questions.md`, `bibliography.md`, `concepts.md`, `findings.md`                 |
| `pkm`      | `people.md`, `books.md`, `ideas.md`, `habits.md`                                |

---

## What you get

```
meu-oraculo/
├── README.md, CLAUDE.md
├── package.json              ← npm scripts: init, ingest, query, lint, status, manifest, chat
├── .gitignore
├── .claude/commands/         ← /wiki-init, /wiki-ingest, /wiki-query, /wiki-lint, /wiki-status
├── scripts/{run,status,manifest}.mjs  ← headless wrapper + diagnostics (no LLM)
├── raw/                      ← you fill (immutable for the agent)
└── wiki/                     ← the agent writes here
    ├── index.md
    ├── log.md
    ├── overview.md
    └── (preset seed pages, if any)
```

Plus a fresh git repo with the bootstrap commit (`--no-git` to skip).

> **Note**: `CLAUDE-SKILLS.md` and `OBSIDIAN.md` live at the **root of
> this repo** (not inside the generated oracle). They're meta-docs for
> evolving `create-source-base`: skill catalog and Obsidian-plugin
> evaluation, with honest cost/benefit feedback.

---

## Conventions

- **Filenames**: `kebab-case` in **English** (`andrej-karpathy.md`).
- **Frontmatter keys**: English (`title`, `type`, `tags`, `created`, `updated`, `summary`, `sources`, `references`).
- **Content** (headings, prose, frontmatter values): **PT-BR**.
- **Wikilinks**: `[[english-filename]]` or `[[english-filename|texto pt-br]]`.
- `wiki/` is **flat** by default — categorization emerges via `type:` and filename prefixes (`source-`, `entity-`, `concept-`, `analysis-`).

---

## Usage

```
Usage: create-source-base [options] [directory]

Arguments:
  directory                target directory (also used as default slug)

Options:
  -V, --version            output version
  -n, --name <name>        human-readable oracle name
  -d, --domain <domain>    one-line domain description
  -s, --slug <slug>        kebab-case slug (defaults to directory name)
  -p, --preset <preset>    seed pages preset (choices: "default", "book",
                           "project", "research", "pkm", default: "default")
  --no-git                 skip git init / initial commit
  -y, --yes                skip interactive prompts (use flags + defaults)
  -h, --help               show help
```

---

## Requirements (for the generated oracle)

- **Node.js** 18+
- **[Claude Code](https://docs.claude.com/en/docs/claude-code/)** CLI
- **[Obsidian](https://obsidian.md/)** (optional but recommended as viewer)
- **git** (optional; CLI gracefully skips if missing)

---

## Internationalization

Oracle content is currently **PT-BR only**. The package layout already
reserves `template/en/` for a future English version — see
`template/en/.todo`. PRs welcome.

---

## Contributing / local dev

```bash
git clone https://github.com/<you>/llm-wiki.git
cd llm-wiki
npm install
npm link                     # exposes `create-source-base` globally

# Smoke test
create-source-base /tmp/test-book --preset book --yes \
  --name "Test" --domain "smoke test"
cd /tmp/test-book && npm run status
```

To unlink: `npm unlink -g create-source-base`.

---

## Inspirations

- **Andrej Karpathy** — [LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) (the original pattern)
- **Vannevar Bush** — [As We May Think (1945)](https://www.theatlantic.com/magazine/archive/1945/07/as-we-may-think/303881/) (the Memex)
- **Ar9av/obsidian-wiki** — conceptual reference (no code copied)

---

## License

MIT © Barney
