import { BookOpen, Upload, MessageSquare, GitBranch, FileText } from "lucide-react";

async function getStats() {
  try {
    const [rawRes, wikiRes, logRes] = await Promise.all([
      fetch("http://localhost:3000/api/raw", { cache: "no-store" }),
      fetch("http://localhost:3000/api/wiki", { cache: "no-store" }),
      fetch("http://localhost:3000/api/wiki?slug=log", { cache: "no-store" }),
    ]);

    const rawData = rawRes.ok ? await rawRes.json() : { spaces: [] };
    const wikiData = wikiRes.ok ? await wikiRes.json() : { pages: [] };

    return {
      spaces: rawData.spaces?.length ?? 0,
      wikiPages: wikiData.pages?.length ?? 0,
    };
  } catch {
    return { spaces: 0, wikiPages: 0 };
  }
}

async function getRecentLog() {
  try {
    const res = await fetch("http://localhost:3000/api/wiki?slug=log", {
      cache: "no-store",
    });
    // log.jsonl is not a wiki page — read it via a dedicated endpoint
    return [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your personal knowledge management workspace.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Spaces</p>
          <p className="text-2xl font-bold">{stats.spaces}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Wiki Pages</p>
          <p className="text-2xl font-bold">{stats.wikiPages}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Raw Files</p>
          <p className="text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Last Ingest</p>
          <p className="text-2xl font-bold">—</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recent Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            No activity yet. Start by ingesting a document.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Quick Actions</h2>
          <div className="space-y-2">
            <a
              href="/ingest"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Upload className="h-4 w-4" />
              Ingest a new document
            </a>
            <a
              href="/chat"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Ask a question
            </a>
            <a
              href="/wiki"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Browse the wiki
            </a>
            <a
              href="/git"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <GitBranch className="h-4 w-4" />
              Manage git
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
