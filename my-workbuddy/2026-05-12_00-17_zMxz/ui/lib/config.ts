import path from "path";
import fs from "fs";

export interface AppConfig {
  llm: {
    provider: string;
    model: string;
  };
  paths: {
    raw: string;
    wiki: string;
    prompts: string;
    templates: string;
  };
  ingest: {
    autoProcess: boolean;
  };
}

// Workspace root is the parent of ui/
export const WORKSPACE_ROOT =
  process.env.WORKSPACE_ROOT ?? path.resolve(process.cwd(), "..");

export function getAppConfig(): AppConfig {
  const configPath = path.join(WORKSPACE_ROOT, "config", "app.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as AppConfig;
}

export function getRawRoot(): string {
  return path.join(WORKSPACE_ROOT, "raw");
}

export function getWikiRoot(): string {
  return path.join(WORKSPACE_ROOT, "wiki");
}

export function getPromptsRoot(): string {
  return path.join(WORKSPACE_ROOT, "config", "prompts");
}
