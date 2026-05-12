// LLM Adapter interface — all providers must implement this

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMStreamChunk {
  type: "text" | "done" | "error";
  text?: string;
  error?: string;
}

export interface LLMAdapter {
  /**
   * Stream a completion. Yields chunks as they arrive.
   * The caller is responsible for assembling the full response.
   */
  stream(
    systemPrompt: string,
    messages: LLMMessage[]
  ): AsyncGenerator<LLMStreamChunk>;

  /**
   * Non-streaming completion. Returns the full response text.
   */
  complete(systemPrompt: string, messages: LLMMessage[]): Promise<string>;
}
