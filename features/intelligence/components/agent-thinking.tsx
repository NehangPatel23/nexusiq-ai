"use client";

import { cn } from "@/lib/utils";

type AgentThinkingProps = {
  label?: string;
  className?: string;
};

export function AgentThinking({ label = "Analyzing documents", className }: AgentThinkingProps) {
  return (
    <div
      className={cn("flex items-center gap-3 text-sm text-muted-foreground", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="font-medium text-foreground">{label}</span>
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse"
            style={{ animationDelay: `${index * 180}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
