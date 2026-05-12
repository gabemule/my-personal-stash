import { NextRequest } from "next/server";
import { listWikiPages, readWikiPage } from "@/lib/fs";
import { getLLMAdapter } from "@/lib/llm/factory";
import { getPromptsRoot } from "@/lib/config";
import fs from "fs";
import path from "path";

function sseChunk(data: string): string {
  return `data: ${JSON.stringify({ text: data })}\n\n`;
}

function sseDone(): string {
  return `data: ${JSON.stringify({ done: true })}\n\n`;
}

function sseError(error: string): string {
  return `data: ${JSON.stringify({ error })}\n\n`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { question, messages: history, spaces } = body as {
    question: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    spaces?: string[];
  };

  if (!question) {
    return new Response(sseError("question is required"), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Load query system prompt
        const promptPath = path.join(getPromptsRoot(), "query.md");
        const systemPrompt = fs.readFileSync(promptPath, "utf-8");

        // Load wiki pages (filtered by spaces if provided)
        const allPages = listWikiPages();
        const relevantPages = spaces && spaces.length > 0
          ? allPages.filter((p) => {
              const pageSpaces = p.frontmatter.spaces;
              if (!Array.isArray(pageSpaces)) return true; // include untagged pages
              return pageSpaces.some((s: string) => spaces.includes(s));
            })
          : allPages;

        // Build wiki context (load full content for each page)
        const wikiContext = relevantPages
          .map((p) => {
            const full = readWikiPage(p.slug);
            return `### ${p.slug}\n\n${full?.content ?? ""}`;
          })
          .join("\n\n---\n\n");

        const userMessage = `## Question

${question}

## Wiki Knowledge Base

${wikiContext || "(no wiki pages available yet)"}
`;

        const llm = getLLMAdapter();

        // Build multi-turn messages: previous history (without last user msg) + current user msg with wiki context
        const priorMessages = (history ?? [])
          .slice(0, -1) // exclude the last user message (we'll add it with wiki context)
          .filter((m) => m.content.trim()) // skip empty assistant messages
          .map((m) => ({ role: m.role, content: m.content }));

        const llmMessages = [
          ...priorMessages,
          { role: "user" as const, content: userMessage },
        ];

        for await (const chunk of llm.stream(systemPrompt, llmMessages)) {
          if (chunk.type === "text" && chunk.text) {
            controller.enqueue(encoder.encode(sseChunk(chunk.text)));
          } else if (chunk.type === "error") {
            controller.enqueue(encoder.encode(sseError(chunk.error ?? "LLM error")));
            controller.close();
            return;
          }
        }

        controller.enqueue(encoder.encode(sseDone()));
        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(sseError(String(error))));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
