import { BookOpen, Upload, MessageSquare, GitBranch, FileText } from "lucide-react";

export default function DashboardPage() {
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
          <p className="text-xs text-muted-foreground">Raw Files</p>
          <p className="text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Wiki Pages</p>
          <p className="text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Spaces</p>
          <p className="text-2xl font-bold">4</p>
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
