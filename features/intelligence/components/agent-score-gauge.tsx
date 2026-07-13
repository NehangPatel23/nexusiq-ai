"use client";

import { cn } from "@/lib/utils";

type AgentScoreGaugeProps = {
  score: number | null;
  label: string;
  description?: string;
  className?: string;
};

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

export function AgentScoreGauge({ score, label, description, className }: AgentScoreGaugeProps) {
  const display = score === null ? "—" : Math.round(score);
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <p
          className={cn("font-display text-4xl font-semibold tabular-nums", score === null ? "text-muted-foreground" : scoreTone(score))}
          aria-label={`${label}: ${score === null ? "not available" : `${display} out of 100`}`}
        >
          {display}
        </p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted/60"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score === null ? undefined : pct}
        aria-label={`${label} score`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            score === null ? "w-0 bg-muted-foreground/30" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
