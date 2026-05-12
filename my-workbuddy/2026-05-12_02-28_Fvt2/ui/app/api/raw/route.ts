import { NextRequest, NextResponse } from "next/server";
import { listSpaces, listRawFiles, getGlobalRawConfig } from "@/lib/fs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const space = searchParams.get("space");
  const category = searchParams.get("category");
  const includeFiles = searchParams.get("files") === "true";

  try {
    if (!space) {
      // List all spaces with their categories
      const spaces = listSpaces();
      const config = getGlobalRawConfig();

      if (includeFiles) {
        // Return all raw files across all spaces (lightweight: path, space, category, filename only)
        const allFiles: Array<{
          path: string;
          space: string;
          category: string;
          filename: string;
        }> = [];

        for (const s of spaces) {
          for (const cat of s.categories) {
            try {
              const files = listRawFiles(s.id, cat);
              for (const f of files) {
                allFiles.push({
                  path: f.path,
                  space: f.space,
                  category: f.category,
                  filename: f.filename,
                });
              }
            } catch { /* skip empty dirs */ }
          }
        }

        return NextResponse.json({ spaces, config, files: allFiles });
      }

      return NextResponse.json({ spaces, config });
    }

    // List files in a specific space (and optionally category)
    const files = listRawFiles(space, category ?? undefined);
    return NextResponse.json({ files });
  } catch (error) {
    console.error("[api/raw] GET error:", error);
    return NextResponse.json(
      { error: "Failed to read raw directory" },
      { status: 500 }
    );
  }
}
