import { NextRequest, NextResponse } from "next/server";
import { listSpaces, listRawFiles, getGlobalRawConfig } from "@/lib/fs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const space = searchParams.get("space");
  const category = searchParams.get("category");

  try {
    if (!space) {
      // List all spaces with their categories
      const spaces = listSpaces();
      const config = getGlobalRawConfig();
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
