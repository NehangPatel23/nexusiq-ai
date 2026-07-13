"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DASHBOARD_PANEL_HEIGHT_CLASS } from "@/features/projects/lib/dashboard-panels";

interface RiskOverviewDonutProps {
  data: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
} as const;

const SEVERITY_META = [
  { key: "critical" as const, label: "Critical", fill: COLORS.critical },
  { key: "high" as const, label: "High", fill: COLORS.high },
  { key: "medium" as const, label: "Medium", fill: COLORS.medium },
  { key: "low" as const, label: "Low", fill: COLORS.low },
];

export function RiskOverviewDonut({ data }: RiskOverviewDonutProps) {
  const chartData = SEVERITY_META.map((item) => ({
    name: item.label,
    value: data[item.key],
    fill: item.fill,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const needsAttention = data.critical + data.high;
  const hasData = total > 0;

  return (
    <Card className={`flex ${DASHBOARD_PANEL_HEIGHT_CLASS} flex-col border-border/60 bg-card/40`}>
      <CardHeader className="shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Risk overview</CardTitle>
            <CardDescription>Open findings by severity across your projects</CardDescription>
          </div>
          {hasData ? (
            <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-right">
              <p className="text-lg font-semibold tabular-nums leading-none">{total}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Open</p>
            </div>
          ) : null}
        </div>
        {hasData ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-amber-200/90">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {needsAttention} need attention
            </span>
            <span>
              {data.critical} critical · {data.high} high · {data.medium} medium · {data.low} low
            </span>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-premium">
        {hasData ? (
          <>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative mx-auto h-36 w-36 shrink-0 sm:mx-0" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={64}
                      paddingAngle={2}
                      stroke="transparent"
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-semibold tabular-nums">{total}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    findings
                  </span>
                </div>
              </div>

              <ul className="min-w-0 flex-1 space-y-3" aria-label="Risk severity breakdown">
                {SEVERITY_META.map((item) => {
                  const value = data[item.key];
                  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

                  return (
                    <li key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.fill }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {value}
                          <span className="ml-1.5 text-foreground/70">{percent}%</span>
                        </span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-muted/50"
                        role="meter"
                        aria-valuenow={value}
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-label={`${item.label} findings`}
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
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground">
                {needsAttention > 0
                  ? `Prioritize ${needsAttention} critical or high-severity finding${needsAttention === 1 ? "" : "s"} in Intelligence.`
                  : "No critical or high-severity findings right now."}
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/intelligence">Review in Intelligence</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
            <div
              className="mb-4 flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-border/60"
              aria-hidden="true"
            >
              <span className="text-2xl font-semibold text-muted-foreground">—</span>
            </div>
            <p className="text-sm font-medium">No risk data yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Run intelligence agents on your projects to populate severity breakdowns and open
              finding counts.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/dashboard/intelligence">Run intelligence scan</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
