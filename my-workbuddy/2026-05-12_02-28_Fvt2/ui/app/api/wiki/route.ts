import { NextRequest, NextResponse } from "next/server";
import { listWikiPages, readWikiPage } from "@/lib/fs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const subdir = searchParams.get("subdir");

  try {
    if (slug) {
      // Read a specific wiki page
      const page = readWikiPage(slug);
      if (!page) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      return NextResponse.json({ page });
    }

    // List all wiki pages (optionally filtered by subdir)
    const pages = listWikiPages(subdir ?? undefined);
    return NextResponse.json({ pages });
  } catch (error) {
    console.error("[api/wiki] GET error:", error);
    return NextResponse.json(
      { error: "Failed to read wiki" },
      { status: 500 }
    );
  }
}
