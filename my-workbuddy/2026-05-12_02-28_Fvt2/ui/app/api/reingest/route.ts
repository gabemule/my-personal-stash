import { NextRequest } from "next/server";
import { readRawFile, listWikiPages, readWikiPage, writeWikiPage, appendLog } from "@/lib/fs";
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
        const rawFile = readRawFile(rawPath);

        // Find wiki pages that reference this raw file
        const allPages = listWikiPages();
        const affectedPages = allPages.filter((p) => {
          const sources = p.frontmatter.sources;
          return Array.isArray(sources) && sources.includes(rawPath);
        });

        // Load re-ingest system prompt
        const promptPath = path.join(getPromptsRoot(), "re-ingest.md");
        const systemPrompt = fs.readFileSync(promptPath, "utf-8");

        // Build context with affected pages content
        const affectedPagesContext = affectedPages
          .map((p) => {
            const full = readWikiPage(p.slug);
            return `### ${p.slug}\n\n${full?.content ?? ""}`;
          })
          .join("\n\n---\n\n");

        const userMessage = `## Updated Source File

**Path:** ${rawPath}
**Space:** ${rawFile.space}
**Category:** ${rawFile.category}
**Frontmatter:**
\`\`\`yaml
${JSON.stringify(rawFile.frontmatter, null, 2)}
\`\`\`

## Updated Content

${rawFile.content}

## Affected Wiki Pages (previously referenced this source)

${affectedPagesContext || "(none — this file was not previously ingested)"}
`;

        const llm = getLLMAdapter();
        let fullResponse = "";

        controller.enqueue(
          encoder.encode(
            sseChunk(
              `🔄 Re-ingesting ${rawPath} (${affectedPages.length} affected pages)...\n\n`
            )
          )
        );

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

        // Parse FILE: blocks and write wiki pages
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

        // Log entry
        const logMatch = fullResponse.match(/LOG:\s*\n(\{[\s\S]*?\})/);
        if (logMatch) {
          try {
            appendLog(JSON.parse(logMatch[1]));
          } catch { /* ignore */ }
        } else {
          appendLog({
            date: new Date().toISOString().slice(0, 10),
            type: "reingest",
            source: rawPath,
            space: rawFile.space,
            pages_touched: pagesWritten,
            summary: `Re-ingested ${rawFile.filename}`,
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
