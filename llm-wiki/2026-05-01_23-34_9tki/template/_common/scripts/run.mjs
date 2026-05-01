#!/usr/bin/env node
// scripts/run.mjs — wrapper for `claude -p` that injects CLAUDE.md as system prompt.
// Usage:
//   node scripts/run.mjs ingest raw/foo.md
//   node scripts/run.mjs query "what's the thesis?"

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const [, , op, ...rest] = process.argv;
const arg = rest.join(" ").trim();

if (!op) {
  console.error("usage: node scripts/run.mjs <ingest|query|lint> [args...]");
  process.exit(1);
}

const claudeMd = resolve("CLAUDE.md");
if (!existsSync(claudeMd)) {
  console.error("CLAUDE.md not found. Are you at the oracle root?");
  process.exit(1);
}

let prompt;
switch (op) {
  case "ingest":
    if (!arg) {
      console.error("usage: npm run ingest -- <path-inside-raw/>");
      process.exit(1);
    }
    prompt = `Run /wiki-ingest with source: ${arg}\n\nFollow CLAUDE.md §6.1 strictly.`;
    break;
  case "query":
    if (!arg) {
      console.error('usage: npm run query -- "your question"');
      process.exit(1);
    }
    prompt = `Run /wiki-query with question: ${arg}\n\nFollow CLAUDE.md §6.2.`;
    break;
  case "lint":
    prompt = `Run /wiki-lint per CLAUDE.md §6.3.`;
    break;
  default:
    console.error(`unknown operation: ${op}`);
    process.exit(1);
}

const args = [
  "-p",
  "--append-system-prompt-file",
  claudeMd,
  prompt,
];

const child = spawn("claude", args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error("Failed to invoke `claude`. Is it on PATH?", err.message);
  process.exit(1);
});
