"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import {
  kindHref,
  kindLabel,
  listRunningBackgroundExtracts,
  subscribeAllBackgroundExtracts,
  viewLabel,
  type BackgroundExtractSnapshot,
} from "@/features/projects/lib/background-extract-runner";
import { cn } from "@/lib/utils";

interface BackgroundExtractBannerProps {
  projectId: string;
}

export function BackgroundExtractBanner({ projectId }: BackgroundExtractBannerProps) {
  const [running, setRunning] = useState<BackgroundExtractSnapshot[]>(() =>
    listRunningBackgroundExtracts(projectId),
  );

  useEffect(() => {
    let cancelled = false;
    setRunning(listRunningBackgroundExtracts(projectId));
    const unsubscribe = subscribeAllBackgroundExtracts(projectId, (next) => {
      if (cancelled) return;
      startTransition(() => {
        if (!cancelled) setRunning(next);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [projectId]);

  if (running.length === 0) return null;

  return (
    <div className="space-y-2">
      {running.map((job) => {
        const href = kindHref(projectId, job.kind);
        const linkLabel = viewLabel(job.kind);

        return (
          <div
            key={job.kind}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30",
              "bg-primary/5 px-4 py-2.5 text-sm",
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
              <span>
                <span className="font-medium text-foreground">{kindLabel(job.kind)}</span>
                {" running in the background"}
              </span>
            </div>
            <Link href={href} className="shrink-0 text-sm font-medium text-primary hover:underline">
              {linkLabel}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
