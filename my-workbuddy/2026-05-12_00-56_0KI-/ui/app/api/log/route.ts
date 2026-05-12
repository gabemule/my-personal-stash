import { NextRequest, NextResponse } from "next/server";
import { readLog } from "@/lib/fs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  try {
    const entries = readLog(limit);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[api/log] GET error:", error);
    return NextResponse.json(
      { error: "Failed to read log" },
      { status: 500 }
    );
  }
}
