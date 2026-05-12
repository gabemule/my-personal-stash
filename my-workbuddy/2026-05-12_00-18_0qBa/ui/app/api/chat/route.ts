import { NextRequest, NextResponse } from "next/server";

// Stub — LLM chat will be implemented in Fase 5
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, spaces } = body as {
      question: string;
      spaces?: string[];
    };

    if (!question) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    // TODO (Fase 5): Load relevant wiki pages (space-aware), call LLM adapter,
    // stream response via SSE, optionally save as report.
    void spaces; // suppress unused warning until Fase 5
    return NextResponse.json(
      { error: "Chat LLM processing not yet implemented (Fase 5)" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[api/chat] POST error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
