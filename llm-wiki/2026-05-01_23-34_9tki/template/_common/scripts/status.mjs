#!/usr/bin/env node
// scripts/status.mjs — pure-shell oracle diagnostic (no LLM call).
// Counts files and shows the latest log entry.

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push({ path: p, mtime: st.mtime });
  }
  return out;
}

function countByType(pages) {
  const out = {};
  for (const p of pages) {
    const txt = readFileSync(p.path, "utf8");
    const m = txt.match(/^---[\s\S]*?\btype:\s*([a-zA-Z]+)/m);
    const type = m ? m[1] : "(no type)";
    out[type] = (out[type] || 0) + 1;
  }
  return out;
}

function lastLogEntry() {
  const log = join(ROOT, "wiki", "log.md");
  if (!existsSync(log)) return null;
  const txt = readFileSync(log, "utf8");
  const lines = txt.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^## \[\d{4}-\d{2}-\d{2}/.test(lines[i])) return lines[i];
  }
  return null;
}

const rawCount = walk(join(ROOT, "raw")).length;
const wikiPages = walk(join(ROOT, "wiki"));
const byType = countByType(wikiPages);

const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const recent = wikiPages.filter((p) => p.mtime.getTime() > sevenDaysAgo);

console.log("");
console.log("─── Oracle Status ───────────────────────────────");
console.log(`Directory:              ${ROOT}`);
console.log(`Sources in raw/:        ${rawCount}`);
console.log(`Pages in wiki/:         ${wikiPages.length}`);
for (const [type, n] of Object.entries(byType)) {
  console.log(`  • ${type.padEnd(20)} ${n}`);
}

console.log(`Updated (7 days):       ${recent.length}`);
console.log(`Last log entry:         ${lastLogEntry() ?? "(empty)"}`);
console.log("─────────────────────────────────────────────────");
console.log("");
