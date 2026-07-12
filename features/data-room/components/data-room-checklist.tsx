"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

import { computeChecklistProgress } from "../lib/checklist";
import type { DataRoomDocument } from "../lib/types";

interface DataRoomChecklistProps {
  documents: DataRoomDocument[];
  className?: string;
}

export function DataRoomChecklist({ documents, className }: DataRoomChecklistProps) {
  const { items, completeCount, total, percent } = computeChecklistProgress(documents);

  return (
    <section
      className={cn(
        "rounded-xl border border-border/60 bg-card/30 p-4",
        className,
      )}
      aria-label="Data room completeness"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Completeness</h2>
          <p className="text-xs text-muted-foreground">
            {completeCount} of {total} expected categories
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-primary">{percent}%</p>
        </div>
      </div>

      <div
        className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted/60"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Data room completeness"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="max-h-48 space-y-1.5 overflow-y-auto">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-start gap-2 rounded-md px-2 py-1.5 text-xs",
              item.complete ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {item.complete ? (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
            ) : (
              <Circle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="font-medium">{item.label}</p>
              {item.complete && item.documentNames.length > 0 ? (
                <p className="truncate text-muted-foreground">{item.documentNames.join(", ")}</p>
              ) : item.processingCount > 0 || item.failedCount > 0 ? (
                <p className="text-muted-foreground">
                  {item.processingCount > 0 && `${item.processingCount} processing`}
                  {item.processingCount > 0 && item.failedCount > 0 && " · "}
                  {item.failedCount > 0 && `${item.failedCount} failed`}
                </p>
              ) : (
                <p className="text-muted-foreground">{item.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
