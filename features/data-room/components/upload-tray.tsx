"use client";

import { RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { UploadProgressItem } from "../lib/types";

interface UploadTrayProps {
  items: UploadProgressItem[];
  onDismiss: () => void;
  onCancel?: (itemId: string) => void;
  onRetry?: (itemId: string) => void;
}

export function UploadTray({ items, onDismiss, onCancel, onRetry }: UploadTrayProps) {
  if (items.length === 0) return null;

  const active = items.some(
    (i) => i.status === "uploading" || i.status === "pending",
  );
  const failedCount = items.filter((i) => i.status === "error").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  const title = active
    ? "Uploading…"
    : failedCount > 0 && doneCount === 0
      ? "Upload failed"
      : failedCount > 0
        ? "Upload finished with errors"
        : "Upload complete";

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-xl border border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur-md"
      role="region"
      aria-label="Upload progress"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        {!active && (
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onDismiss}>
            <X className="size-4" />
          </Button>
        )}
      </div>
      <ul className="max-h-48 space-y-2 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="text-xs">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate">{item.relativePath ?? item.fileName}</span>
              <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                {item.status === "done"
                  ? "Done"
                  : item.status === "error"
                    ? "Failed"
                    : item.status === "cancelled"
                      ? "Cancelled"
                      : `${item.progress}%`}
                {item.status === "uploading" && onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={`Cancel upload of ${item.fileName}`}
                    onClick={() => onCancel(item.id)}
                  >
                    <X className="size-3" />
                  </Button>
                )}
                {item.status === "error" && onRetry && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={`Retry upload of ${item.fileName}`}
                    onClick={() => onRetry(item.id)}
                  >
                    <RotateCcw className="size-3" />
                  </Button>
                )}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  item.status === "error"
                    ? "bg-destructive"
                    : item.status === "cancelled"
                      ? "bg-muted-foreground/40"
                      : "bg-primary",
                )}
                style={{ width: `${item.progress}%` }}
              />
            </div>
            {item.error && <p className="mt-0.5 text-destructive">{item.error}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
