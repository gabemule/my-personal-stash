import { getAppConfig } from "@/lib/config";
import type { LLMAdapter } from "./types";
import { ClaudeAdapter } from "./claude.adapter";

export function getLLMAdapter(): LLMAdapter {
  const config = getAppConfig();
  const { provider, model } = config.llm;

  switch (provider) {
    case "claude-code":
    case "claude":
      return new ClaudeAdapter(model);
    default:
      throw new Error(`Unknown LLM provider: "${provider}". Check config/app.json.`);
  }
}
