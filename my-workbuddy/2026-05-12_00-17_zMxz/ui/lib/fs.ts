import path from "path";
import fs from "fs";
import matter from "gray-matter";
import { getRawRoot, getWikiRoot, WORKSPACE_ROOT } from "./config";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SpaceConfig {
  space: string;
  label: string;
  description: string;
  categories?: string[];
}

export interface RawConfig {
  categories: Array<{
    name: string;
    label: string;
    relevance: number;
  }>;
}

export interface SpaceInfo {
  id: string;
  label: string;
  description: string;
  categories: string[];
}

export interface RawFile {
  path: string;       // relative to workspace root
  space: string;
  category: string;
  filename: string;
  frontmatter: Record<string, unknown>;
  content: string;
}

export interface WikiPage {
  path: string;       // relative to workspace root
  slug: string;       // e.g. "squads/eao"
  frontmatter: Record<string, unknown>;
  content: string;
}

// ─── Raw helpers ─────────────────────────────────────────────────────────────

export function listSpaces(): SpaceInfo[] {
  const rawRoot = getRawRoot();
  const globalConfig = getGlobalRawConfig();
  const defaultCategories = globalConfig.categories.map((c) => c.name);

  const entries = fs.readdirSync(rawRoot, { withFileTypes: true });
  const spaces: SpaceInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configPath = path.join(rawRoot, entry.name, "config.json");
    if (!fs.existsSync(configPath)) continue;

    const spaceConfig: SpaceConfig = JSON.parse(
      fs.readFileSync(configPath, "utf-8")
    );

    // Use space-level categories override or fall back to global defaults
    const categories =
      spaceConfig.categories ??
      fs
        .readdirSync(path.join(rawRoot, entry.name), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .filter((n) => defaultCategories.includes(n));

    spaces.push({
      id: entry.name,
      label: spaceConfig.label,
      description: spaceConfig.description,
      categories,
    });
  }

  return spaces;
}

export function getGlobalRawConfig(): RawConfig {
  const configPath = path.join(getRawRoot(), "config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8")) as RawConfig;
}

export function listRawFiles(space: string, category?: string): RawFile[] {
  const rawRoot = getRawRoot();
  const files: RawFile[] = [];

  const categories = category
    ? [category]
    : fs
        .readdirSync(path.join(rawRoot, space), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

  for (const cat of categories) {
    const catDir = path.join(rawRoot, space, cat);
    if (!fs.existsSync(catDir)) continue;

    const catFiles = fs
      .readdirSync(catDir)
      .filter((f) => f.endsWith(".md"));

    for (const filename of catFiles) {
      const filePath = path.join(catDir, filename);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);

      files.push({
        path: path.relative(WORKSPACE_ROOT, filePath),
        space,
        category: cat,
        filename,
        frontmatter: data,
        content,
      });
    }
  }

  return files;
}

export function readRawFile(relativePath: string): RawFile {
  const absPath = path.join(WORKSPACE_ROOT, relativePath);
  const raw = fs.readFileSync(absPath, "utf-8");
  const { data, content } = matter(raw);
  const parts = relativePath.split("/");
  // raw/[space]/[category]/[filename]
  return {
    path: relativePath,
    space: parts[1],
    category: parts[2],
    filename: parts[3],
    frontmatter: data,
    content,
  };
}

export function writeRawFile(relativePath: string, content: string): void {
  const absPath = path.join(WORKSPACE_ROOT, relativePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, "utf-8");
}

// ─── Wiki helpers ─────────────────────────────────────────────────────────────

export function listWikiPages(subdir?: string): WikiPage[] {
  const wikiRoot = getWikiRoot();
  const searchDir = subdir ? path.join(wikiRoot, subdir) : wikiRoot;
  const pages: WikiPage[] = [];

  if (!fs.existsSync(searchDir)) return pages;

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".md") && entry.name !== "log.jsonl") {
        const filePath = path.join(dir, entry.name);
        const raw = fs.readFileSync(filePath, "utf-8");
        const { data, content } = matter(raw);
        const relToWiki = path.relative(wikiRoot, filePath);
        const slug = relToWiki.replace(/\.md$/, "");

        pages.push({
          path: path.relative(WORKSPACE_ROOT, filePath),
          slug,
          frontmatter: data,
          content,
        });
      }
    }
  }

  walk(searchDir);
  return pages;
}

export function readWikiPage(slug: string): WikiPage | null {
  const wikiRoot = getWikiRoot();
  const filePath = path.join(wikiRoot, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    path: path.relative(WORKSPACE_ROOT, filePath),
    slug,
    frontmatter: data,
    content,
  };
}

export function writeWikiPage(slug: string, content: string): void {
  const wikiRoot = getWikiRoot();
  const filePath = path.join(wikiRoot, `${slug}.md`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

// ─── Log helpers ──────────────────────────────────────────────────────────────

export interface LogEntry {
  date: string;
  type: string;
  source?: string;
  space?: string;
  pages_touched?: string[];
  summary: string;
}

export function appendLog(entry: LogEntry): void {
  const logPath = path.join(getWikiRoot(), "log.jsonl");
  fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
}

export function readLog(limit = 50): LogEntry[] {
  const logPath = path.join(getWikiRoot(), "log.jsonl");
  if (!fs.existsSync(logPath)) return [];

  const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean);
  const entries = lines.map((l) => JSON.parse(l) as LogEntry);
  return entries.slice(-limit).reverse();
}
