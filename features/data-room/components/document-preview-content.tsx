"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getDocumentTypeLabel } from "../lib/mime";
import { formatPreviewLabel, getPreviewMode, parseCsvPreview, type PreviewMode } from "../lib/preview";
import type { DataRoomDocument } from "../lib/types";

interface DocumentPreviewContentProps {
  document: DataRoomDocument;
  previewUrl: string;
  onDownload: () => void;
  className?: string;
  /** Larger typography / min heights for modal view */
  expanded?: boolean;
  highlightText?: string | null;
}

export function useDocumentPreviewText(
  document: DataRoomDocument | null,
  previewUrlOverride?: string,
) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mode = document ? getPreviewMode(document) : "unsupported";
  const previewUrl =
    previewUrlOverride ??
    (document ? `/api/documents/${document.id}?preview=1` : "");

  useEffect(() => {
    if (!document || !previewUrl || !["text", "csv", "markdown", "docx", "xlsx", "pptx"].includes(mode)) {
      setText(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    void fetch(previewUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load preview");
        return res.text();
      })
      .then((body) => setText(body.slice(0, 500_000)))
      .catch(() => setError("Unable to load file contents"))
      .finally(() => setLoading(false));
  }, [document, mode, previewUrl]);

  return { text, error, loading, mode: mode as PreviewMode };
}

function MarkdownPreview({ content, expanded }: { content: string; expanded?: boolean }) {
  const lines = content.split(/\r?\n/);

  return (
    <article
      className={cn(
        "prose prose-invert max-w-none rounded-lg border border-border/40 bg-background/60 p-4",
        expanded ? "prose-sm md:prose-base" : "prose-sm",
      )}
    >
      {lines.map((line, index) => {
        if (line.startsWith("# ")) {
          return (
            <h1 key={index} className="mb-3 mt-0 text-lg font-semibold text-foreground">
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={index} className="mb-2 mt-4 text-base font-semibold text-foreground">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <p key={index} className="my-1 pl-4 text-sm text-muted-foreground before:content-['•_']">
              {line.slice(2)}
            </p>
          );
        }
        if (!line.trim()) {
          return <div key={index} className="h-2" />;
        }
        return (
          <p key={index} className="my-1 text-sm leading-relaxed text-foreground/90">
            {line}
          </p>
        );
      })}
    </article>
  );
}

function CsvPreview({ content, expanded }: { content: string; expanded?: boolean }) {
  const { headers, rows, truncated } = parseCsvPreview(content, expanded ? 200 : 80);

  if (headers.length === 0) {
    return <p className="text-sm text-muted-foreground">Empty CSV file</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Showing {rows.length} row{rows.length === 1 ? "" : "s"}
        {truncated ? " (truncated)" : ""}
      </p>
      <div className="overflow-auto rounded-lg border border-border/50">
        <table className={cn("w-full text-left", expanded ? "text-sm" : "text-xs")}>
          <thead className="sticky top-0 bg-card/90 text-muted-foreground">
            <tr>
              {headers.map((header, i) => (
                <th key={i} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
                  {header || `Column ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border/40 hover:bg-secondary/30">
                {headers.map((_, colIndex) => (
                  <td key={colIndex} className="max-w-[240px] truncate px-3 py-2 text-foreground/90">
                    {row[colIndex] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function highlightPlainText(content: string, highlightText?: string | null) {
  if (!highlightText?.trim()) return content;
  const needle = highlightText.trim().slice(0, 120);
  const index = content.indexOf(needle);
  if (index < 0) return content;
  return `${content.slice(0, index)}[[[HIGHLIGHT_START]]]${needle}[[[HIGHLIGHT_END]]]${content.slice(index + needle.length)}`;
}

function renderHighlightedText(content: string) {
  const parts = content.split(/\[\[\[HIGHLIGHT_START\]\]\]|\[\[\[HIGHLIGHT_END\]\]\]/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-sm bg-primary/25 px-1 text-foreground">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export function DocumentPreviewContent({
  document,
  previewUrl,
  onDownload,
  className,
  expanded = false,
  highlightText = null,
}: DocumentPreviewContentProps) {
  const { text, error, loading, mode } = useDocumentPreviewText(document, previewUrl);
  const minHeight = expanded ? "min-h-[420px]" : "min-h-[200px]";

  if (mode === "pdf") {
    return (
      <iframe
        title={`PDF preview of ${document.name}`}
        src={previewUrl}
        className={cn("h-full w-full rounded-lg border border-border/40 bg-background", minHeight, className)}
      />
    );
  }

  if (mode === "image") {
    return (
      <div className={cn("flex h-full items-center justify-center", minHeight, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={document.name}
          className="max-h-full max-w-full rounded-lg object-contain shadow-soft"
        />
      </div>
    );
  }

  if (["text", "csv", "markdown", "docx", "xlsx", "pptx"].includes(mode)) {
    return (
      <div className={cn("h-full overflow-auto", minHeight, className)}>
        {loading && (
          <p className="text-sm text-muted-foreground" aria-busy="true">
            Loading {formatPreviewLabel(mode).toLowerCase()} preview…
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {text !== null && mode === "csv" && <CsvPreview content={text} expanded={expanded} />}
        {text !== null && mode === "markdown" && <MarkdownPreview content={text} expanded={expanded} />}
        {text !== null && (mode === "docx" || mode === "xlsx" || mode === "pptx") && (
          <pre
            className={cn(
              "whitespace-pre-wrap break-words rounded-lg border border-border/40 bg-background/80 p-4 font-mono leading-relaxed text-foreground",
              expanded ? "text-sm" : "text-xs",
            )}
          >
            {renderHighlightedText(highlightPlainText(text, highlightText))}
          </pre>
        )}
        {text !== null && mode === "text" && (
          <pre
            className={cn(
              "whitespace-pre-wrap break-words rounded-lg border border-border/40 bg-background/80 p-4 font-mono leading-relaxed text-foreground",
              expanded ? "text-sm" : "text-xs",
            )}
          >
            {renderHighlightedText(highlightPlainText(text, highlightText))}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10 text-center",
        minHeight,
        className,
      )}
    >
      <FileText className="size-12 text-muted-foreground/50" aria-hidden />
      <p className="text-sm text-muted-foreground">
        Inline preview is not available for {getDocumentTypeLabel(document)} files.
      </p>
      <Button type="button" size="sm" onClick={onDownload}>
        Download to view
      </Button>
    </div>
  );
}
