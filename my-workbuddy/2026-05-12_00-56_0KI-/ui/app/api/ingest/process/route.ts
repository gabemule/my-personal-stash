import { NextRequest } from "next/server";
import { readRawFile, listWikiPages, writeWikiPage, appendLog } from "@/lib/fs";
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
  const { path: rawPath } = body as { path: string };

  if (!rawPath) {
    return new Response(sseError("path is required"), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Read raw file
        const rawFile = readRawFile(rawPath);

        // Load ingest system prompt
        const promptPath = path.join(getPromptsRoot(), "ingest.md");
        const systemPrompt = fs.readFileSync(promptPath, "utf-8");

        // Load current wiki structure (page list)
        const wikiPages = listWikiPages();
        const wikiList = wikiPages.map((p) => `- ${p.slug}`).join("\n");

        // Build user message
        const userMessage = `## Source File

**Path:** ${rawPath}
**Space:** ${rawFile.space}
**Category:** ${rawFile.category}
**Frontmatter:**
\`\`\`yaml
${JSON.stringify(rawFile.frontmatter, null, 2)}
\`\`\`

## Content

${rawFile.content}

## Current Wiki Structure

${wikiList || "(empty — no pages yet)"}
`;

        const llm = getLLMAdapter();
        let fullResponse = "";

        controller.enqueue(encoder.encode(sseChunk("🔍 Processing with LLM...\n\n")));

        for await (const chunk of llm.stream(systemPrompt, [
          { role: "user", content: userMessage },
        ])) {
          if (chunk.type === "text" && chunk.text) {
            fullResponse += chunk.text;
            controller.enqueue(encoder.encode(sseChunk(chunk.text)));
          } else if (chunk.type === "error") {
            controller.enqueue(encoder.encode(sseError(chunk.error ?? "LLM error")));
            controller.close();
            return;
          }
        }

        // Parse FILE: blocks from response and write wiki pages
        const fileBlocks = fullResponse.matchAll(
          /FILE:\s*([^\n]+)\n---+\n([\s\S]*?)\n---+/g
        );
        const pagesWritten: string[] = [];

        for (const match of fileBlocks) {
          const filePath = match[1].trim();
          const fileContent = match[2].trim();
          if (filePath.startsWith("wiki/")) {
            const slug = filePath.replace(/^wiki\//, "").replace(/\.md$/, "");
            writeWikiPage(slug, fileContent);
            pagesWritten.push(filePath);
          }
        }

        // Parse LOG: entry
        const logMatch = fullResponse.match(/LOG:\s*\n(\{[\s\S]*?\})/);
        if (logMatch) {
          try {
            const logEntry = JSON.parse(logMatch[1]);
            appendLog(logEntry);
          } catch {
            // ignore malformed log
          }
        } else {
          // Fallback log entry
          appendLog({
            date: new Date().toISOString().slice(0, 10),
            type: "ingest",
            source: rawPath,
            space: rawFile.space,
            pages_touched: pagesWritten,
            summary: `Ingested ${rawFile.filename}`,
          });
        }

        controller.enqueue(
          encoder.encode(
            sseChunk(
              `\n\n✅ Done. ${pagesWritten.length} wiki page(s) updated: ${pagesWritten.join(", ") || "none"}`
            )
          )
        );
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
