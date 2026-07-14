"use client";

import type { TimelineCategory } from "@prisma/client";
import { CalendarRange, Layers, Sparkles, UserPen } from "lucide-react";

import type { TimelineEventView } from "@/features/timeline/lib/timeline-events";
import { cn } from "@/lib/utils";

export type CategoryMeta = Record<
  TimelineCategory,
  { label: string; accent: string; barClass: string }
>;

type TimelineStatsProps = {
  events: TimelineEventView[];
  categoryMeta: CategoryMeta;
  className?: string;
};

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function buildCategoryCounts(events: TimelineEventView[]): Record<TimelineCategory, number> {
  const counts = {
    FUNDING: 0,
    HIRING: 0,
    ACQUISITION: 0,
    LAWSUIT: 0,
    LEADERSHIP: 0,
    REVENUE: 0,
    CONTRACT: 0,
    OTHER: 0,
  } satisfies Record<TimelineCategory, number>;
  for (const event of events) counts[event.category] += 1;
  return counts;
}

export function TimelineStats({ events, categoryMeta, className }: TimelineStatsProps) {
  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
  );
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  const manual = events.filter((e) => e.isManual).length;
  const ai = events.length - manual;
  const counts = buildCategoryCounts(events);
  const topCategory = (Object.entries(counts) as Array<[TimelineCategory, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Timeline summary"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            Total events
          </div>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums tracking-tight">
            {events.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {topCategory && topCategory[1] > 0
              ? `Most common: ${categoryMeta[topCategory[0]].label}`
              : "Across all categories"}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
            Date span
          </div>
          <p className="mt-2 text-sm font-medium leading-snug">
            {oldest && newest ? (
              <>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatShortDate(oldest.eventDate)}
                </span>
                <span className="mx-1.5 text-muted-foreground">→</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatShortDate(newest.eventDate)}
                </span>
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Oldest to newest dated event</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI extracted
          </div>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums tracking-tight">{ai}</p>
          <p className="mt-1 text-xs text-muted-foreground">From document excerpts</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserPen className="h-3.5 w-3.5" aria-hidden="true" />
            Manual
          </div>
          <p className="mt-2 font-display text-2xl font-semibold tabular-nums tracking-tight">
            {manual}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Preserved on re-extract</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Category mix
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Events by category">
          {(Object.keys(counts) as TimelineCategory[])
            .filter((key) => counts[key] > 0)
            .map((key) => {
              const count = counts[key];
              const meta = categoryMeta[key];
              const pct = Math.round((count / maxCount) * 100);
              return (
                <li key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={cn("truncate", meta.accent)}>{meta.label}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn("h-full rounded-full transition-[width] motion-safe:duration-300", meta.barClass)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
        </ul>
      </div>
    </section>
  );
}
