"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { BookOpen, ChevronRight } from "lucide-react";

interface WikiPage {
  path: string;
  slug: string;
  frontmatter: Record<string, unknown>;
  content: string;
}

export default function WikiPage() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [selected, setSelected] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wiki")
      .then((r) => r.json())
      .then((d) => {
        setPages(d.pages ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function selectPage(page: WikiPage) {
    fetch(`/api/wiki?slug=${encodeURIComponent(page.slug)}`)
      .then((r) => r.json())
      .then((d) => setSelected(d.page ?? null))
      .catch(() => {});
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar list */}
      <div className="w-56 shrink-0 space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Pages
        </h2>
        {loading && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
        {!loading && pages.length === 0 && (
          <p className="text-sm text-muted-foreground">No wiki pages yet.</p>
        )}
        {pages.map((page) => (
          <button
            key={page.slug}
            onClick={() => selectPage(page)}
            className={`w-full text-left flex items-center gap-1 rounded px-2 py-1.5 text-sm transition-colors ${
              selected?.slug === page.slug
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="truncate">{page.slug}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
            <BookOpen className="h-8 w-8" />
            <p className="text-sm">Select a page to read</p>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeSlug]}
            >
              {selected.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
