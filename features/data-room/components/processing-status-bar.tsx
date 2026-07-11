"use client";

import { AlertCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProcessingSummary = {
  pending: number;
  processing: number;
  ready: number;
  failed: number;
  total: number;
  active: number;
  items: Array<{
    id: string;
    name: string;
    status: string;
    updatedAt: string;
  }>;
};

interface ProcessingStatusBarProps {
  summary: ProcessingSummary | null;
  loading?: boolean;
  className?: string;
}

export function ProcessingStatusBar({ summary, loading, className }: ProcessingStatusBarProps) {
  if (!summary && !loading) return null;

  const active = summary?.active ?? 0;
  const failed = summary?.failed ?? 0;

  if (!loading && active === 0 && failed === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-card/40 px-4 py-2.5 text-sm",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={loading || active > 0}
    >
      {(loading || active > 0) && (
        <span className="inline-flex items-center gap-2 text-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          <span>
            Processing{" "}
            <strong>{summary?.processing ?? 0}</strong> · Pending{" "}
            <strong>{summary?.pending ?? 0}</strong>
          </span>
        </span>
      )}

      {failed > 0 && (
        <span className="inline-flex items-center gap-1.5 text-destructive">
          <AlertCircle className="size-4" aria-hidden />
          <strong>{failed}</strong> failed
        </span>
      )}

      {summary && summary.ready > 0 && active === 0 && !loading && (
        <span className="text-muted-foreground">
          <strong className="text-foreground">{summary.ready}</strong> ready
        </span>
      )}
    </div>
  );
}
