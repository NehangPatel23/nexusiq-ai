"use client";

import { Terminal } from "lucide-react";

import { cn } from "@/lib/utils";

interface WorkerSetupBannerProps {
  visible: boolean;
  className?: string;
}

export function WorkerSetupBanner({ visible, className }: WorkerSetupBannerProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground",
        className,
      )}
      role="status"
    >
      <Terminal className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-medium">Processing worker required</p>
        <p className="mt-1 text-muted-foreground">
          Inline processing is disabled. Start the worker in a separate terminal with{" "}
          <code className="rounded bg-background/80 px-1 py-0.5 text-xs">pnpm worker:process</code>{" "}
          to move uploaded documents from pending to ready.
        </p>
      </div>
    </div>
  );
}
