#!/usr/bin/env node
// bin/cli.mjs — `create-source-base` CLI.
// Scaffolds an LLM Wiki oracle (Karpathy pattern) for Claude Code + Obsidian.

import { Command, Option } from "commander";
import prompts from "prompts";
import { cp, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------- constants ----------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "..");
const PACKAGE_JSON = JSON.parse(
  await readFile(join(PACKAGE_ROOT, "package.json"), "utf8"),
);

const LANG = "pt-br"; // hardcoded for now; see template/en/.todo
const PRESETS = ["default", "book", "project", "research", "pkm"];

// ANSI colors (zero-deps)
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
};

// ---------- helpers ----------

function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isValidSlug(s) {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s) && s.length <= 60;
}

async function isDirEmpty(dir) {
  try {
    const entries = await readdir(dir);
    return entries.length === 0;
  } catch (err) {
    if (err.code === "ENOENT") return true;
    throw err;
  }
}

async function walkFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkFiles(p)));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

async function replacePlaceholders(target, replacements) {
  const files = await walkFiles(target);
  for (const file of files) {
    // Skip binary-ish files: only rewrite text formats we actually use.
    if (!/\.(md|mjs|json|txt|yaml|yml)$/i.test(file) && !file.endsWith("_gitignore")) continue;
    let content = await readFile(file, "utf8");
    let changed = false;
    for (const [key, value] of Object.entries(replacements)) {
      const token = `{{${key}}}`;
      if (content.includes(token)) {
        content = content.split(token).join(value);
        changed = true;
      }
    }
    if (changed) await writeFile(file, content, "utf8");
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function gitInit(target) {
  try {
    execSync("git init -q", { cwd: target, stdio: "ignore" });
    execSync("git add -A", { cwd: target, stdio: "ignore" });
    execSync('git commit -q -m "chore: bootstrap oracle from create-source-base"', {
      cwd: target,
      stdio: "ignore",
      env: {
        ...process.env,
        // Allow commit even if user.name/email are not configured globally.
        GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME ?? "create-source-base",
        GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL ?? "noreply@create-source-base",
        GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME ?? "create-source-base",
        GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL ?? "noreply@create-source-base",
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ---------- main ----------

const program = new Command();

program
  .name("create-source-base")
  .description(PACKAGE_JSON.description)
  .version(PACKAGE_JSON.version)
  .argument("[directory]", "target directory (also used as default slug)")
  .option("-n, --name <name>", "human-readable oracle name")
  .option("-d, --domain <domain>", "one-line domain description")
  .option("-s, --slug <slug>", "kebab-case slug (defaults to directory name)")
  .addOption(
    new Option("-p, --preset <preset>", "seed pages preset")
      .choices(PRESETS)
      .default("default"),
  )
  .option("--no-git", "skip git init / initial commit")
  .option("-y, --yes", "skip interactive prompts (use flags + defaults)")
  .action(async (directory, opts) => {
    try {
      await run(directory, opts);
    } catch (err) {
      console.error(`\n${c.red}✗${c.reset} ${err.message}\n`);
      process.exit(1);
    }
  });

await program.parseAsync(process.argv);

// ---------- run ----------

async function run(directory, opts) {
  console.log(`\n${c.bold}create-source-base${c.reset} ${c.dim}v${PACKAGE_JSON.version}${c.reset}`);
  console.log(`${c.dim}Scaffold an LLM Wiki oracle (Karpathy pattern).${c.reset}\n`);

  // ----- gather inputs -----

  const interactive = !opts.yes;

  let dir = directory;
  if (!dir && interactive) {
    const r = await prompts({
      type: "text",
      name: "dir",
      message: "Target directory",
      initial: "my-oracle",
      validate: (v) => (v?.trim() ? true : "required"),
    });
    if (!r.dir) process.exit(1);
    dir = r.dir.trim();
  }
  if (!dir) throw new Error("Missing target directory. Pass it as argument.");

  const target = resolve(process.cwd(), dir);
  const baseName = target.split("/").pop();

  let slug = opts.slug ?? slugify(baseName);
  if (!isValidSlug(slug)) {
    if (interactive) {
      const r = await prompts({
        type: "text",
        name: "slug",
        message: `Slug (kebab-case)`,
        initial: slug || "my-oracle",
        validate: (v) =>
          isValidSlug(v) || "must be lowercase, kebab-case, ≤60 chars",
      });
      if (!r.slug) process.exit(1);
      slug = r.slug;
    } else {
      throw new Error(`Invalid slug: "${slug}". Must be lowercase kebab-case.`);
    }
  }

  let name = opts.name;
  if (!name && interactive) {
    const r = await prompts({
      type: "text",
      name: "name",
      message: "Oracle name (PT-BR)",
      initial: "Meu Oráculo",
      validate: (v) => (v?.trim() ? true : "required"),
    });
    if (!r.name) process.exit(1);
    name = r.name.trim();
  }
  name ??= slug;

  let domain = opts.domain;
  if (!domain && interactive) {
    const r = await prompts({
      type: "text",
      name: "domain",
      message: "Domain in one line (PT-BR)",
      initial: "conhecimento geral",
      validate: (v) => (v?.trim() ? true : "required"),
    });
    if (!r.domain) process.exit(1);
    domain = r.domain.trim();
  }
  domain ??= "(não informado)";

  let preset = opts.preset;
  if (interactive && !process.argv.includes("-p") && !process.argv.includes("--preset")) {
    const r = await prompts({
      type: "select",
      name: "preset",
      message: "Preset (seed pages)",
      choices: [
        { title: "default  — no extra seeds (Karpathy-pure)", value: "default" },
        { title: "book     — characters, world, timeline, structure, themes", value: "book" },
        { title: "project  — goals, decisions, stakeholders, risks, milestones", value: "project" },
        { title: "research — questions, bibliography, concepts, findings", value: "research" },
        { title: "pkm      — people, books, ideas, habits", value: "pkm" },
      ],
      initial: PRESETS.indexOf(preset),
    });
    if (r.preset === undefined) process.exit(1);
    preset = r.preset;
  }
  if (!PRESETS.includes(preset)) {
    throw new Error(`Unknown preset: "${preset}". Valid: ${PRESETS.join(", ")}.`);
  }

  let initGit = opts.git !== false;
  if (interactive && opts.git === undefined) {
    const r = await prompts({
      type: "confirm",
      name: "git",
      message: "Initialize git repo?",
      initial: true,
    });
    if (r.git === undefined) process.exit(1);
    initGit = r.git;
  }

  // ----- preflight -----

  if (existsSync(target)) {
    const empty = await isDirEmpty(target);
    if (!empty) {
      throw new Error(`Target directory not empty: ${target}`);
    }
  }

  const commonDir = join(PACKAGE_ROOT, "template", "_common");
  if (!existsSync(commonDir)) {
    throw new Error(`Template missing at ${commonDir}. Bad install?`);
  }

  const sharedDir = join(PACKAGE_ROOT, "template", LANG, "_shared");
  if (!existsSync(sharedDir)) {
    throw new Error(`Template missing at ${sharedDir}. Bad install?`);
  }

  const presetDir =
    preset === "default"
      ? null
      : join(PACKAGE_ROOT, "template", LANG, "_presets", preset);
  if (presetDir && !existsSync(presetDir)) {
    throw new Error(`Preset missing at ${presetDir}. Bad install?`);
  }

  // ----- summary -----

  console.log(`${c.bold}Plan${c.reset}`);
  console.log(`  ${c.dim}directory${c.reset} ${target}`);
  console.log(`  ${c.dim}slug     ${c.reset} ${slug}`);
  console.log(`  ${c.dim}name     ${c.reset} ${name}`);
  console.log(`  ${c.dim}domain   ${c.reset} ${domain}`);
  console.log(`  ${c.dim}preset   ${c.reset} ${preset}`);
  console.log(`  ${c.dim}git init ${c.reset} ${initGit ? "yes" : "no"}\n`);

  if (interactive && !opts.yes) {
    const r = await prompts({
      type: "confirm",
      name: "ok",
      message: "Proceed?",
      initial: true,
    });
    if (!r.ok) {
      console.log(`${c.yellow}aborted.${c.reset}`);
      return;
    }
  }

  // ----- copy template -----

  await mkdir(target, { recursive: true });
  await cp(commonDir, target, { recursive: true });
  await cp(sharedDir, target, { recursive: true });
  if (presetDir) {
    await cp(presetDir, target, { recursive: true });
  }
  console.log(`${c.green}✓${c.reset} Copied template (common + ${LANG}${preset !== "default" ? ` + ${preset}` : ""})`);

  // ----- rename _gitignore -> .gitignore -----

  const gitignoreTemplate = join(target, "_gitignore");
  if (existsSync(gitignoreTemplate)) {
    await rename(gitignoreTemplate, join(target, ".gitignore"));
  }

  // ----- replace placeholders -----

  await replacePlaceholders(target, {
    NAME: name,
    DOMAIN: domain,
    SLUG: slug,
    DATE: todayISO(),
  });
  console.log(`${c.green}✓${c.reset} Replaced placeholders`);

  // ----- git init -----

  if (initGit) {
    const ok = gitInit(target);
    if (ok) console.log(`${c.green}✓${c.reset} Initialized git, committed`);
    else console.log(`${c.yellow}!${c.reset} Skipped git (not installed or failed)`);
  }

  // ----- next steps -----

  console.log(`\n${c.bold}Done.${c.reset} Next steps:\n`);
  console.log(`  ${c.cyan}cd ${dir}${c.reset}`);
  console.log(`  ${c.cyan}npm install${c.reset}            ${c.dim}# no runtime deps; just registers metadata${c.reset}`);
  console.log(`  ${c.cyan}npm run init${c.reset}           ${c.dim}# /wiki-init via Claude Code${c.reset}`);
  console.log(`  ${c.cyan}npm run status${c.reset}         ${c.dim}# shell-only diagnostic (no LLM)${c.reset}`);
  console.log(``);
  console.log(`See ${c.cyan}README.md${c.reset} inside the new oracle for the full workflow.\n`);
}
