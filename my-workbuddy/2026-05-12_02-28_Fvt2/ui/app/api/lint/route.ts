import { NextRequest } from "next/server";
import { readWikiPage, writeWikiPage } from "@/lib/fs";
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
  const { slugs } = body as { slugs: string[] };

  if (!slugs || slugs.length === 0) {
    return new Response(sseError("slugs array is required"), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const promptPath = path.join(getPromptsRoot(), "lint.md");
        const systemPrompt = fs.readFileSync(promptPath, "utf-8");
        const llm = getLLMAdapter();

        for (const slug of slugs) {
          const page = readWikiPage(slug);
          if (!page) {
            controller.enqueue(
              encoder.encode(sseChunk(`\n⚠️ Page not found: ${slug}\n`))
            );
            continue;
          }

          controller.enqueue(
            encoder.encode(sseChunk(`\n📄 Linting: ${slug}\n`))
          );

          const userMessage = `## Wiki Page to Lint

**Slug:** ${slug}
**Frontmatter:**
\`\`\`yaml
${JSON.stringify(page.frontmatter, null, 2)}
\`\`\`

## Content

${page.content}
`;

          let fullResponse = "";

          for await (const chunk of llm.stream(systemPrompt, [
            { role: "user", content: userMessage },
          ])) {
            if (chunk.type === "text" && chunk.text) {
              fullResponse += chunk.text;
              controller.enqueue(encoder.encode(sseChunk(chunk.text)));
            } else if (chunk.type === "error") {
              controller.enqueue(
                encoder.encode(sseError(chunk.error ?? "LLM error"))
              );
              controller.close();
              return;
            }
          }

          // Parse FILE: block and apply if present
          const fileMatch = fullResponse.match(
            /FILE:\s*([^\n]+)\n---+\n([\s\S]*?)\n---+/
          );
          if (fileMatch) {
            const filePath = fileMatch[1].trim();
            const fileContent = fileMatch[2].trim();
            if (filePath.startsWith("wiki/")) {
              const targetSlug = filePath
                .replace(/^wiki\//, "")
                .replace(/\.md$/, "");
              writeWikiPage(targetSlug, fileContent);
              controller.enqueue(
                encoder.encode(sseChunk(`\n✅ Applied lint fixes to: ${targetSlug}\n`))
              );
            }
          } else {
            controller.enqueue(
              encoder.encode(sseChunk(`\n✅ No changes needed for: ${slug}\n`))
            );
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
