"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SpaceInfo {
  id: string;
  label: string;
  categories: string[];
}

export default function IngestPage() {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [space, setSpace] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedPath, setSavedPath] = useState("");
  const [processLog, setProcessLog] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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

  async function handleSave() {
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
      if (res.ok) {
        toast.success(`Saved: ${data.path}`);
        setSavedPath(data.path);
        setTitle("");
        setContent("");
        setProcessLog("");
      } else {
        toast.error(data.error ?? "Save failed");
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleProcess() {
    if (!savedPath) return;
    setIsProcessing(true);
    setProcessLog("Starting LLM processing...\n");

    try {
      const res = await fetch("/api/ingest/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: savedPath }),
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
            const data = JSON.parse(line.slice(6));
            if (data.text) setProcessLog((prev) => prev + data.text);
            if (data.done) toast.success("Processing complete!");
            if (data.error) {
              toast.error(`Processing error: ${data.error}`);
              setProcessLog((prev) => prev + `\n❌ Error: ${data.error}`);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      toast.error(String(e));
      setProcessLog((prev) => prev + `\n❌ Error: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ingest</h1>
        <p className="text-muted-foreground">
          Add a new document to your knowledge base.
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

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* Process with LLM */}
        {savedPath && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Process with LLM</p>
                <p className="text-xs text-muted-foreground">
                  Extract knowledge and update wiki pages
                </p>
              </div>
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                variant="outline"
                size="sm"
              >
                {isProcessing ? "Processing..." : "Process →"}
              </Button>
            </div>
            {processLog && (
              <pre className="text-xs font-mono bg-muted rounded p-3 max-h-64 overflow-y-auto whitespace-pre-wrap">
                {processLog}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
