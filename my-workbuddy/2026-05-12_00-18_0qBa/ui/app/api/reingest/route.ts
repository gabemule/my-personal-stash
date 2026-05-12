import { NextRequest, NextResponse } from "next/server";

// Stub — LLM re-ingest will be implemented in Fase 5
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: rawPath } = body as { path: string };

    if (!rawPath) {
      return NextResponse.json(
        { error: "path is required" },
        { status: 400 }
      );
    }

    // TODO (Fase 5): Read raw file, load affected wiki pages, call LLM adapter,
    // stream response via SSE, update wiki pages, append log entry.
    return NextResponse.json(
      { error: "Re-ingest LLM processing not yet implemented (Fase 5)" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[api/reingest] POST error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
