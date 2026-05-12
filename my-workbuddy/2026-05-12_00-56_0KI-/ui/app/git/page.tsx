"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GitBranch, RefreshCw } from "lucide-react";

interface GitStatus {
  isRepo: boolean;
  branch: string;
  modified: string[];
  untracked: string[];
  staged: string[];
  ahead: number;
  behind: number;
}

interface LogCommit {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export default function GitPage() {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [log, setLog] = useState<LogCommit[]>([]);
  const [commitMsg, setCommitMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/git").then((r) => r.json()),
      fetch("/api/git?action=log&limit=10").then((r) => r.json()),
    ])
      .then(([statusData, logData]) => {
        if (cancelled) return;
        setStatus(statusData.status ?? null);
        setLog(logData.log ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setActionStatus("Failed to load git status");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const [statusData, logData] = await Promise.all([
        fetch("/api/git").then((r) => r.json()),
        fetch("/api/git?action=log&limit=10").then((r) => r.json()),
      ]);
      setStatus(statusData.status ?? null);
      setLog(logData.log ?? []);
    } catch {
      setActionStatus("Failed to load git status");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: "commit" | "pull" | "push") {
    setActionStatus(`Running ${action}...`);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "commit") {
        if (!commitMsg.trim()) {
          setActionStatus("Commit message is required");
          return;
        }
        body.message = commitMsg;
      }
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setActionStatus(`✓ ${action} successful`);
        if (action === "commit") setCommitMsg("");
        await loadStatus();
      } else {
        setActionStatus(`✗ ${data.error}`);
      }
    } catch (e) {
      setActionStatus(`✗ ${String(e)}`);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Git</h1>
          <p className="text-muted-foreground">Manage your repository.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadStatus}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {status && (
        <>
          {/* Status */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="font-medium text-sm">{status.branch || "no branch"}</span>
              {status.ahead > 0 && (
                <span className="text-xs text-muted-foreground">↑{status.ahead}</span>
              )}
              {status.behind > 0 && (
                <span className="text-xs text-muted-foreground">↓{status.behind}</span>
              )}
            </div>

            {status.modified.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Modified</p>
                {status.modified.map((f) => (
                  <p key={f} className="text-xs font-mono text-yellow-600 dark:text-yellow-400">M {f}</p>
                ))}
              </div>
            )}
            {status.untracked.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Untracked</p>
                {status.untracked.map((f) => (
                  <p key={f} className="text-xs font-mono text-green-600 dark:text-green-400">? {f}</p>
                ))}
              </div>
            )}
            {status.modified.length === 0 && status.untracked.length === 0 && (
              <p className="text-xs text-muted-foreground">Working tree clean</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Commit message..."
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAction("commit")}
              />
              <Button onClick={() => handleAction("commit")} size="sm">
                Commit
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleAction("pull")}>
                Pull
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAction("push")}>
                Push
              </Button>
            </div>
            {actionStatus && (
              <p className="text-sm text-muted-foreground">{actionStatus}</p>
            )}
          </div>

          {/* Log */}
          {log.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Recent Commits</h2>
              <div className="rounded-lg border divide-y">
                {log.map((c) => (
                  <div key={c.hash} className="px-3 py-2 flex items-start gap-3">
                    <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5">
                      {c.hash}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{c.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.author} · {new Date(c.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {status && !status.isRepo && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            No git repository found at workspace root.
          </p>
        </div>
      )}
    </div>
  );
}
