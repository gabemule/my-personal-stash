"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface RawFile {
  path: string;
  space: string;
  category: string;
  filename: string;
  staged?: boolean;
}

interface SpaceInfo {
  id: string;
  label: string;
  categories: string[];
}

export default function IngestPage() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [rawFiles, setRawFiles] = useState<RawFile[]>([]);
  const [stagedPaths, setStagedPaths] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterSpace, setFilterSpace] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processLog, setProcessLog] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [processedPaths, setProcessedPaths] = useState<string[]>([]);
  const [ingestedPaths, setIngestedPaths] = useState<Set<string>>(new Set());
  const logRef = useRef<HTMLPreElement>(null);

  // Auto-scroll log to bottom when new content arrives
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [processLog]);

  async function loadData() {
    setLoading(true);
    try {
      const [rawRes, gitRes, logRes] = await Promise.all([
        fetch("/api/raw?files=true"),
        fetch("/api/git"),
        fetch("/api/log"),
      ]);
      const rawData = await rawRes.json();
      const gitData = await gitRes.json();
      const logData = await logRes.json();

      setSpaces(rawData.spaces ?? []);
      setRawFiles(rawData.files ?? []);

      // Collect staged/modified/untracked paths that are raw files
      const status = gitData.status;
      const staged = new Set<string>([
        ...(status?.staged ?? []),
        ...(status?.modified ?? []),
        ...(status?.untracked ?? []),
      ].filter((p: string) => p.startsWith("raw/") && p.endsWith(".md")));
      setStagedPaths(staged);

      // Build set of paths that have been ingested (from log)
      const ingested = new Set<string>(
        (logData.entries ?? [])
          .filter((e: { type: string }) => e.type === "ingest")
          .map((e: { source: string }) => e.source)
      );
      setIngestedPaths(ingested);
    } catch {
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredFiles = filterSpace === "all"
    ? rawFiles
    : rawFiles.filter((f) => f.space === filterSpace);

  function toggleSelect(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filteredFiles.map((f) => f.path)));
  }

  function selectStaged() {
    setSelected(new Set(filteredFiles.filter((f) => stagedPaths.has(f.path)).map((f) => f.path)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleIngest() {
    if (selected.size === 0) {
      toast.error("Select at least one file to ingest.");
      return;
    }

    setIsProcessing(true);
    setProcessLog("");
    setProcessedPaths([]);
    const paths = Array.from(selected);

    for (const path of paths) {
      setProcessLog((prev) => prev + `\n📄 Processing: ${path}\n`);
      try {
        const res = await fetch("/api/ingest/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const chunk = JSON.parse(line.slice(6));
              if (chunk.text) setProcessLog((prev) => prev + chunk.text);
              if (chunk.error) {
                toast.error(`Error on ${path}: ${chunk.error}`);
                setProcessLog((prev) => prev + `\n❌ Error: ${chunk.error}\n`);
              }
            } catch { /* ignore */ }
          }
        }

        setProcessedPaths((prev) => [...prev, path]);
      } catch (e) {
        toast.error(`Failed: ${path} — ${String(e)}`);
        setProcessLog((prev) => prev + `\n❌ Failed: ${String(e)}\n`);
      }
    }

    toast.success(`Ingested ${paths.length} file(s)`);
    setIsProcessing(false);
    setSelected(new Set());
  }

  async function handleCommit() {
    if (processedPaths.length === 0) return;
    setIsCommitting(true);
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          message: `ingest: process ${processedPaths.length} file(s)`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Committed successfully");
        setProcessedPaths([]);
        setProcessLog("");
        await loadData();
      } else {
        toast.error(data.error ?? "Commit failed");
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ingest</h1>
          <p className="text-muted-foreground">
            Select raw files to process with the LLM and update the wiki.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Space filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilterSpace("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            filterSpace === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-foreground"
          }`}
        >
          All
        </button>
        {spaces.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilterSpace(s.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              filterSpace === s.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Selection controls */}
      <div className="flex gap-2 text-xs">
        <button onClick={selectAll} className="text-muted-foreground hover:text-foreground">
          Select all ({filteredFiles.length})
        </button>
        {stagedPaths.size > 0 && (
          <button onClick={selectStaged} className="text-yellow-600 dark:text-yellow-400 hover:text-foreground">
            Select staged ({filteredFiles.filter((f) => stagedPaths.has(f.path)).length})
          </button>
        )}
        {selected.size > 0 && (
          <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground">
            Clear ({selected.size})
          </button>
        )}
      </div>

      {/* File list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No raw files found. Use &quot;Add File&quot; to create one.</p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {filteredFiles.map((file) => {
            const isStaged = stagedPaths.has(file.path);
            const isSelected = selected.has(file.path);
            return (
              <label
                key={file.path}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  isSelected ? "bg-muted/30" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(file.path)}
                  className="h-4 w-4 rounded border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate">{file.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.space} / {file.category}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {ingestedPaths.has(file.path) ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      ingested
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      new
                    </span>
                  )}
                  {isStaged && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      staged
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleIngest}
          disabled={isProcessing || selected.size === 0}
        >
          {isProcessing ? "Processing..." : `Ingest ${selected.size > 0 ? `(${selected.size})` : ""}`}
        </Button>
        {processedPaths.length > 0 && !isProcessing && (
          <Button
            onClick={handleCommit}
            disabled={isCommitting}
            variant="outline"
          >
            {isCommitting ? "Committing..." : "Commit changes"}
          </Button>
        )}
      </div>

      {/* Process log */}
      {processLog && (
        <pre
          ref={logRef}
          className="text-xs font-mono bg-muted rounded p-3 max-h-64 overflow-y-auto whitespace-pre-wrap"
        >
          {processLog}
        </pre>
      )}
    </div>
  );
}
