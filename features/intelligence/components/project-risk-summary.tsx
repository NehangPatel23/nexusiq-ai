"use client";

import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  type FindingSeverityCounts,
  totalFindingCount,
} from "@/features/intelligence/lib/severity-summary";
import { cn } from "@/lib/utils";

const SEVERITY_META = [
  { key: "critical" as const, label: "Critical", fill: "#ef4444" },
  { key: "high" as const, label: "High", fill: "#f97316" },
  { key: "medium" as const, label: "Medium", fill: "#eab308" },
  { key: "low" as const, label: "Low", fill: "#22c55e" },
];

type ProjectRiskSummaryProps = {
  counts: FindingSeverityCounts;
  /** True while agent scans are in progress — hide stale totals messaging. */
  refreshing?: boolean;
  className?: string;
};

export function ProjectRiskSummary({ counts, refreshing = false, className }: ProjectRiskSummaryProps) {
  const total = totalFindingCount(counts);
  const needsAttention = counts.critical + counts.high;
  const hasData = total > 0;

  return (
    <Card
      className={cn("border-border/60 bg-card/40", className)}
      aria-busy={refreshing}
    >
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-3 sm:min-w-[13rem]">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
              refreshing
                ? "border-primary/30 bg-primary/10 text-primary"
                : needsAttention > 0
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
            )}
            aria-hidden="true"
          >
            {refreshing ? (
              <Loader2 className="h-5 w-5 motion-safe:animate-spin" />
            ) : needsAttention > 0 ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Open findings</p>
            <p className="text-xs text-muted-foreground">
              {refreshing
                ? hasData
                  ? "Updating from completed scans in this run…"
                  : "Waiting for new scan results…"
                : hasData
                  ? needsAttention > 0
                    ? `${needsAttention} critical or high need attention`
                    : "No critical or high-severity findings"
                  : "No findings yet — run agents to populate"}
            </p>
          </div>
        </div>

        <div className="flex items-baseline gap-2 sm:ml-auto sm:hidden">
          <span className="font-display text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">total</span>
        </div>

        <ul
          className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4"
          aria-label="Open findings by severity"
        >
          {SEVERITY_META.map((item) => {
            const value = counts[item.key];
            const percent = total > 0 ? Math.round((value / total) * 100) : 0;

            return (
              <li key={item.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.fill }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-xs text-muted-foreground">{item.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-medium">{value}</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-muted/50"
                  role="meter"
                  aria-valuenow={value}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(total, 1)}
                  aria-label={`${item.label} open findings`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: item.fill }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-baseline gap-2 sm:flex">
          <span className="font-display text-3xl font-semibold tabular-nums">{total}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">total</span>
        </div>
      </CardContent>
    </Card>
  );
}
