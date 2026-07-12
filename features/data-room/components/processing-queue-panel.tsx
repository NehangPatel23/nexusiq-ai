"use client";

import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getProcessingErrorHint } from "../lib/processing-errors";
import { DocumentStatusBadge } from "./document-status-badge";
import type { ProcessingSummary } from "./processing-status-bar";

interface ProcessingQueuePanelProps {
  summary: ProcessingSummary | null;
  loading?: boolean;
  canUpload?: boolean;
  onReprocess?: (documentId: string) => void;
  className?: string;
}

export function ProcessingQueuePanel({
  summary,
  loading,
  canUpload,
  onReprocess,
  className,
}: ProcessingQueuePanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (!summary && !loading) return null;

  const items = summary?.items ?? [];
  const showPanel = loading || items.length > 0 || (summary?.failed ?? 0) > 0;

  if (!showPanel) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-border/60 bg-card/30 text-sm",
        className,
      )}
      aria-label="Document processing queue"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <div>
          <h2 className="font-medium">Processing queue</h2>
          {summary && (
            <p className="text-xs text-muted-foreground">
              {summary.processing} processing · {summary.pending} pending · {summary.ready} ready
              {summary.failed > 0 ? ` · ${summary.failed} failed` : ""}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse processing queue" : "Expand processing queue"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {expanded && (
        <ul className="max-h-56 space-y-1 overflow-y-auto border-t border-border/60 px-2 py-2">
          {loading && items.length === 0 && (
            <li className="px-2 py-2 text-xs text-muted-foreground">Loading queue…</li>
          )}
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg px-2 py-2 hover:bg-secondary/30"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                {"errorMessage" in item && item.errorMessage ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getProcessingErrorHint(item.errorMessage as string)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <DocumentStatusBadge
                  status={item.status as "PENDING" | "PROCESSING" | "READY" | "FAILED"}
                  errorMessage={"errorMessage" in item ? (item.errorMessage as string) : null}
                />
                {canUpload && onReprocess && item.status === "FAILED" && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label={`Reprocess ${item.name}`}
                    onClick={() => onReprocess(item.id)}
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
          {!loading && items.length === 0 && (
            <li className="px-2 py-2 text-xs text-muted-foreground">No active queue items.</li>
          )}
        </ul>
      )}
    </section>
  );
}
