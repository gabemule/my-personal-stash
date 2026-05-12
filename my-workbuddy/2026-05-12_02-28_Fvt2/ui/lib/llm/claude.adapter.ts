import Anthropic from "@anthropic-ai/sdk";
import type { LLMAdapter, LLMMessage, LLMStreamChunk } from "./types";

export class ClaudeAdapter implements LLMAdapter {
  private client: Anthropic;
  private model: string;

  constructor(model = "claude-opus-4-5") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async *stream(
    systemPrompt: string,
    messages: LLMMessage[]
  ): AsyncGenerator<LLMStreamChunk> {
    try {
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: 8192,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { type: "text", text: event.delta.text };
        }
      }

      yield { type: "done" };
    } catch (error) {
      yield { type: "error", error: String(error) };
    }
  }

  async complete(systemPrompt: string, messages: LLMMessage[]): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const block = response.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }
    return block.text;
  }
}
