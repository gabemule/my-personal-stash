"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SpaceInfo {
  id: string;
  label: string;
  categories: string[];
}

export default function AddFilePage() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [space, setSpace] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [processLog, setProcessLog] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedPath, setSavedPath] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    fetch("/api/raw")
      .then((r) => r.json())
      .then((d) => {
        setSpaces(d.spaces ?? []);
        if (d.spaces?.length > 0) {
          setSpace(d.spaces[0].id);
          setCategory(d.spaces[0].categories[0] ?? "");
        }
      })
      .catch(() => toast.error("Failed to load spaces"));
  }, []);

  const selectedSpace = spaces.find((s) => s.id === space);

  function buildFrontmatter() {
    return `---
type: ${category.replace(/s$/, "")}
space: ${space}
category: ${category}
date: ${date}
title: ${title}
tags: []
---

# ${title}

`;
  }

  async function handleSaveAndIngest() {
    if (!space || !category || !title || !content) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsSaving(true);
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `${date}-${slug}.md`;
    const fullContent = buildFrontmatter() + content;

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space, category, filename, content: fullContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Save failed");
        return;
      }

      toast.success(`Saved: ${data.path}`);
      setSavedPath(data.path);
      setTitle("");
      setContent("");

      // Auto-ingest
      setIsSaving(false);
      setIsProcessing(true);
      setProcessLog("🔍 Auto-ingesting with LLM...\n");

      const processRes = await fetch("/api/ingest/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: data.path }),
      });

      if (!processRes.body) throw new Error("No response body");

      const reader = processRes.body.getReader();
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
            if (chunk.done) toast.success("Ingest complete!");
            if (chunk.error) {
              toast.error(`Ingest error: ${chunk.error}`);
              setProcessLog((prev) => prev + `\n❌ Error: ${chunk.error}`);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      toast.error(String(e));
      setProcessLog((prev) => prev + `\n❌ Error: ${String(e)}`);
    } finally {
      setIsSaving(false);
      setIsProcessing(false);
    }
  }

  async function handleCommit() {
    if (!savedPath) return;
    setIsCommitting(true);
    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          message: `ingest: add ${savedPath}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Committed successfully");
        setSavedPath("");
        setProcessLog("");
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add File</h1>
        <p className="text-muted-foreground">
          Add a new document — it will be saved and automatically ingested into the wiki.
        </p>
      </div>

      <div className="space-y-4">
        {/* Space + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Space</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={space}
              onChange={(e) => {
                setSpace(e.target.value);
                const s = spaces.find((x) => x.id === e.target.value);
                setCategory(s?.categories[0] ?? "");
              }}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {(selectedSpace?.categories ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date + Title */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Meeting title, document name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Content</label>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[300px] resize-y"
            placeholder="Paste transcript, document content, or notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* Save & Ingest */}
        <Button
          onClick={handleSaveAndIngest}
          disabled={isSaving || isProcessing}
        >
          {isSaving ? "Saving..." : isProcessing ? "Ingesting..." : "Save & Ingest"}
        </Button>

        {/* Process log */}
        {processLog && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <pre className="text-xs font-mono bg-muted rounded p-3 max-h-64 overflow-y-auto whitespace-pre-wrap">
              {processLog}
            </pre>
            {!isProcessing && savedPath && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCommit}
                  disabled={isCommitting}
                  variant="outline"
                  size="sm"
                >
                  {isCommitting ? "Committing..." : "Commit changes"}
                </Button>
                <p className="text-xs text-muted-foreground">{savedPath}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
