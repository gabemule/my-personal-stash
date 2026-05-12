import { NextRequest, NextResponse } from "next/server";
import { getStatus, commit, pull, push, getLog } from "@/lib/git";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "status";

  try {
    if (action === "log") {
      const limit = parseInt(searchParams.get("limit") ?? "20", 10);
      const log = await getLog(limit);
      return NextResponse.json({ log });
    }

    // Default: status
    const status = await getStatus();
    return NextResponse.json({ status });
  } catch (error) {
    console.error("[api/git] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get git status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, message, files } = body as {
      action: "commit" | "pull" | "push";
      message?: string;
      files?: string[];
    };

    switch (action) {
      case "commit": {
        if (!message) {
          return NextResponse.json(
            { error: "message is required for commit" },
            { status: 400 }
          );
        }
        const hash = await commit(message, files);
        return NextResponse.json({ success: true, hash });
      }

      case "pull": {
        const result = await pull();
        return NextResponse.json({ success: true, result });
      }

      case "push": {
        await push();
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[api/git] POST error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
