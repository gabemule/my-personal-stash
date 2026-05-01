#!/usr/bin/env node
// scripts/manifest.mjs — derived ingestion manifest (no stored state).
//
// Cross-references files in raw/ against `original_file:` declared in
// wiki/source-*.md frontmatter. Recomputes from scratch every run, so
// it cannot drift.
//
// Usage:
//   npm run manifest             # full table
//   npm run pending              # only files in raw/ not yet ingested
//   node scripts/manifest.mjs --orphan   # source pages pointing to missing raw/ files
//   node scripts/manifest.mjs --json     # machine-readable output

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const RAW = join(ROOT, "raw");
const WIKI = join(ROOT, "wiki");

const args = new Set(process.argv.slice(2));
const ONLY_PENDING = args.has("--pending");
const ONLY_ORPHAN = args.has("--orphan");
const AS_JSON = args.has("--json");

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (st.isFile()) out.push(p);
  }
  return out;
}

function extractOriginalFile(text) {
  // Parse only the leading frontmatter block.
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return null;
  const fm = text.slice(3, end);
  const m = fm.match(/^original_file:\s*(.+?)\s*$/m);
  if (!m) return null;
  return m[1].replace(/^["']|["']$/g, "").trim();
}

// ---- collect raw files (paths relative to ROOT, e.g. "raw/foo.md") ----
const rawFiles = walk(RAW).map((p) => relative(ROOT, p));

// ---- collect source pages and their declared original_file ----
const sourcePages = walk(WIKI)
  .filter((p) => /\/source-[^/]+\.md$/.test(p))
  .map((p) => {
    const txt = readFileSync(p, "utf8");
    return {
      page: relative(ROOT, p),
      originalFile: extractOriginalFile(txt),
    };
  });

// ---- index by original_file ----
const byOriginal = new Map();
for (const s of sourcePages) {
  if (!s.originalFile) continue;
  if (!byOriginal.has(s.originalFile)) byOriginal.set(s.originalFile, []);
  byOriginal.get(s.originalFile).push(s.page);
}

// ---- compute rows ----
const rows = [];

for (const raw of rawFiles) {
  const pages = byOriginal.get(raw) ?? [];
  rows.push({
    raw,
    status: pages.length > 0 ? "ingested" : "pending",
    pages,
  });
}

// orphan source pages: declared original_file does not exist in raw/
const orphans = sourcePages.filter(
  (s) => s.originalFile && !rawFiles.includes(s.originalFile),
);

// source pages without original_file at all
const untracked = sourcePages.filter((s) => !s.originalFile);

// ---- output ----
if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        rows,
        orphans: orphans.map((o) => ({ page: o.page, missing: o.originalFile })),
        untracked: untracked.map((u) => u.page),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const filtered = ONLY_PENDING
  ? rows.filter((r) => r.status === "pending")
  : rows;

if (ONLY_ORPHAN) {
  if (orphans.length === 0) {
    console.log("\nNo orphan source pages.\n");
  } else {
    console.log("\n─── Orphan source pages ─────────────────────────");
    for (const o of orphans) {
      console.log(`  ${o.page}`);
      console.log(`    → missing: ${o.originalFile}`);
    }
    console.log("─────────────────────────────────────────────────\n");
  }
  process.exit(0);
}

const counts = {
  ingested: rows.filter((r) => r.status === "ingested").length,
  pending: rows.filter((r) => r.status === "pending").length,
};

console.log("");
console.log("─── Ingestion Manifest ──────────────────────────");
console.log(`Raw files:    ${rawFiles.length}  (ingested ${counts.ingested}, pending ${counts.pending})`);
console.log(`Source pages: ${sourcePages.length}  (orphan ${orphans.length}, untracked ${untracked.length})`);
console.log("─────────────────────────────────────────────────");

if (filtered.length === 0) {
  console.log(ONLY_PENDING ? "No pending files. ✓" : "No files in raw/.");
} else {
  for (const r of filtered) {
    const tag = r.status === "ingested" ? "✓" : "·";
    console.log(`  ${tag} ${r.raw}`);
    if (r.status === "ingested" && r.pages.length > 1) {
      // unusual: multiple source pages claim the same raw file
      for (const p of r.pages) console.log(`      ↳ ${p}`);
    } else if (r.status === "ingested") {
      console.log(`      ↳ ${r.pages[0]}`);
    }
  }
}

if (!ONLY_PENDING && (orphans.length > 0 || untracked.length > 0)) {
  console.log("");
  if (orphans.length > 0) {
    console.log(`⚠ ${orphans.length} orphan source page(s) — see --orphan`);
  }
  if (untracked.length > 0) {
    console.log(`⚠ ${untracked.length} source page(s) without original_file:`);
    for (const u of untracked) console.log(`    ${u.page}`);
  }
}

console.log("");
