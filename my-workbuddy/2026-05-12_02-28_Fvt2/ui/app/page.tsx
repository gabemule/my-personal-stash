import { BookOpen, Upload, MessageSquare, GitBranch, FileText } from "lucide-react";
import { listSpaces, listRawFiles, listWikiPages, readLog } from "@/lib/fs";

function getDashboardStats() {
  try {
    const spaces = listSpaces();
    const wikiPages = listWikiPages();
    const log = readLog(5);

    // Count raw files across all spaces
    let rawFileCount = 0;
    for (const space of spaces) {
      for (const category of space.categories) {
        try {
          rawFileCount += listRawFiles(space.id, category).length;
        } catch { /* skip */ }
      }
    }

    const lastIngest = log.find((e) => e.type === "ingest" || e.type === "reingest");

    return {
      spaces: spaces.length,
      wikiPages: wikiPages.length,
      rawFiles: rawFileCount,
      lastIngest: lastIngest?.date ?? null,
      recentLog: log,
    };
  } catch {
    return {
      spaces: 0,
      wikiPages: 0,
      rawFiles: 0,
      lastIngest: null,
      recentLog: [],
    };
  }
}

export default function DashboardPage() {
  const stats = getDashboardStats();

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
          <p className="text-2xl font-bold">{stats.rawFiles}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Last Ingest</p>
          <p className="text-2xl font-bold">{stats.lastIngest ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recent Activity
          </h2>
          {stats.recentLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity yet. Start by ingesting a document.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.recentLog.map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5 w-20">
                    {entry.date}
                  </span>
                  <div className="min-w-0">
                    <span className="inline-block text-xs rounded px-1 py-0.5 bg-muted mr-1">
                      {entry.type}
                    </span>
                    <span className="text-muted-foreground truncate">{entry.summary}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
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
