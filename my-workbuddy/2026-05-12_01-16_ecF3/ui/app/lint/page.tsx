"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface WikiPageInfo {
  slug: string;
  path: string;
}

export default function LintPage() {
  const [pages, setPages] = useState<WikiPageInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processLog, setProcessLog] = useState("");
  const [isLinting, setIsLinting] = useState(false);

  async function loadPages() {
    setLoading(true);
    try {
      const res = await fetch("/api/wiki");
      const data = await res.json();
      setPages(data.pages ?? []);
    } catch {
      toast.error("Failed to load wiki pages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPages();
  }, []);

  function toggleSelect(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(pages.map((p) => p.slug)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleLint() {
    if (selected.size === 0) {
      toast.error("Select at least one page to lint.");
      return;
    }

    setIsLinting(true);
    setProcessLog("");

    try {
      const res = await fetch("/api/lint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: Array.from(selected) }),
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
            if (chunk.done) toast.success("Lint complete!");
            if (chunk.error) {
              toast.error(`Lint error: ${chunk.error}`);
              setProcessLog((prev) => prev + `\n❌ Error: ${chunk.error}`);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      toast.error(String(e));
      setProcessLog((prev) => prev + `\n❌ Error: ${String(e)}`);
    } finally {
      setIsLinting(false);
      setSelected(new Set());
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lint</h1>
          <p className="text-muted-foreground">
            Review and improve wiki pages with the LLM.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPages} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Selection controls */}
      <div className="flex gap-2 text-xs">
        <button onClick={selectAll} className="text-muted-foreground hover:text-foreground">
          Select all ({pages.length})
        </button>
        {selected.size > 0 && (
          <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground">
            Clear ({selected.size})
          </button>
        )}
      </div>

      {/* Page list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : pages.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No wiki pages found. Ingest some documents first.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {pages.map((page) => {
            const isSelected = selected.has(page.slug);
            return (
              <label
                key={page.slug}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  isSelected ? "bg-muted/30" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(page.slug)}
                  className="h-4 w-4 rounded border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate">{page.slug}</p>
                  <p className="text-xs text-muted-foreground">{page.path}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Lint button */}
      <Button
        onClick={handleLint}
        disabled={isLinting || selected.size === 0}
      >
        {isLinting ? "Linting..." : `Lint ${selected.size > 0 ? `(${selected.size})` : ""}`}
      </Button>

      {/* Process log */}
      {processLog && (
        <pre className="text-xs font-mono bg-muted rounded p-3 max-h-64 overflow-y-auto whitespace-pre-wrap">
          {processLog}
        </pre>
      )}
    </div>
  );
}
