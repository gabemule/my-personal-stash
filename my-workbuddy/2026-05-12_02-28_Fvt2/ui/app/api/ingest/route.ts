import { NextRequest, NextResponse } from "next/server";
import { writeRawFile } from "@/lib/fs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { space, category, filename, content } = body as {
      space: string;
      category: string;
      filename: string;
      content: string;
    };

    if (!space || !category || !filename || !content) {
      return NextResponse.json(
        { error: "space, category, filename, and content are required" },
        { status: 400 }
      );
    }

    // Sanitize filename — ensure .md extension
    const safeFilename = filename.endsWith(".md") ? filename : `${filename}.md`;
    const relativePath = `raw/${space}/${category}/${safeFilename}`;

    // Save the raw file
    writeRawFile(relativePath, content);

    return NextResponse.json({
      success: true,
      path: relativePath,
      message: "File saved. Use /api/ingest/process to trigger LLM processing.",
    });
  } catch (error) {
    console.error("[api/ingest] POST error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
