"use client";

import type { TimelineCategory } from "@prisma/client";
import {
  Briefcase,
  Building2,
  CalendarClock,
  CalendarPlus,
  Download,
  DollarSign,
  FileSignature,
  FileText,
  Gavel,
  Loader2,
  Network,
  Pencil,
  Pin,
  RotateCcw,
  Scale,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AgentThinking } from "@/features/intelligence/components/agent-thinking";
import { useBackgroundExtract } from "@/features/projects/hooks/use-background-extract";
import { startBackgroundExtract } from "@/features/projects/lib/background-extract-runner";
import {
  buildCategoryCounts,
  TimelineStats,
  type CategoryMeta,
} from "@/features/timeline/components/timeline-stats";
import {
  downloadTextFile,
  timelineEventsToCsv,
  timelineEventsToIcs,
} from "@/features/timeline/lib/export";
import type { TimelineEventView } from "@/features/timeline/lib/timeline-events";
import { timelineCategorySchema } from "@/features/timeline/schemas";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type TimelinePageProps = {
  projectId: string;
  projectName: string;
  initialEvents: TimelineEventView[];
  hasProcessedDocs: boolean;
};

const CATEGORIES = timelineCategorySchema.options;

const CATEGORY_META: Record<
  TimelineCategory,
  {
    label: string;
    icon: typeof DollarSign;
    className: string;
    accent: string;
    barClass: string;
    railClass: string;
  }
> = {
  FUNDING: {
    label: "Funding",
    icon: Wallet,
    className: "border-emerald-500/40 text-emerald-300",
    accent: "text-emerald-300",
    barClass: "bg-emerald-500",
    railClass: "bg-emerald-500",
  },
  HIRING: {
    label: "Hiring",
    icon: Users,
    className: "border-sky-500/40 text-sky-300",
    accent: "text-sky-300",
    barClass: "bg-sky-500",
    railClass: "bg-sky-500",
  },
  ACQUISITION: {
    label: "Acquisition",
    icon: Building2,
    className: "border-violet-500/40 text-violet-300",
    accent: "text-violet-300",
    barClass: "bg-violet-500",
    railClass: "bg-violet-500",
  },
  LAWSUIT: {
    label: "Lawsuit",
    icon: Gavel,
    className: "border-rose-500/40 text-rose-300",
    accent: "text-rose-300",
    barClass: "bg-rose-500",
    railClass: "bg-rose-500",
  },
  LEADERSHIP: {
    label: "Leadership",
    icon: Briefcase,
    className: "border-amber-500/40 text-amber-300",
    accent: "text-amber-300",
    barClass: "bg-amber-500",
    railClass: "bg-amber-500",
  },
  REVENUE: {
    label: "Revenue",
    icon: DollarSign,
    className: "border-lime-500/40 text-lime-300",
    accent: "text-lime-300",
    barClass: "bg-lime-500",
    railClass: "bg-lime-500",
  },
  CONTRACT: {
    label: "Contract",
    icon: FileSignature,
    className: "border-cyan-500/40 text-cyan-300",
    accent: "text-cyan-300",
    barClass: "bg-cyan-500",
    railClass: "bg-cyan-500",
  },
  OTHER: {
    label: "Other",
    icon: Scale,
    className: "border-border text-muted-foreground",
    accent: "text-muted-foreground",
    barClass: "bg-slate-500",
    railClass: "bg-slate-500",
  },
};

const STATS_CATEGORY_META = Object.fromEntries(
  (Object.keys(CATEGORY_META) as TimelineCategory[]).map((key) => [
    key,
    {
      label: CATEGORY_META[key].label,
      accent: CATEGORY_META[key].accent,
      barClass: CATEGORY_META[key].barClass,
    },
  ]),
) as CategoryMeta;

type EventFormState = {
  title: string;
  description: string;
  eventDate: string;
  category: TimelineCategory;
};

const EMPTY_FORM: EventFormState = {
  title: "",
  description: "",
  eventDate: new Date().toISOString().slice(0, 10),
  category: "OTHER",
};

function formatEventDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatEventMonthDay(iso: string): { month: string; day: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { month: "—", day: "—" };
  return {
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: String(date.getDate()),
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json()) as ApiEnvelope<T>;
}

export function TimelinePage({
  projectId,
  projectName,
  initialEvents,
  hasProcessedDocs,
}: TimelinePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const extract = useBackgroundExtract(projectId, "timeline");
  const extracting = extract.status === "running";
  const ollamaDown = extract.ollamaUnavailable;
  const extractMessage =
    extract.result && "message" in extract.result ? (extract.result.message ?? null) : null;
  const prevExtractStatus = useRef(extract.status);
  const listRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState(initialEvents);
  const [categoryFilter, setCategoryFilter] = useState<TimelineCategory | "ALL">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [yearJump, setYearJump] = useState<string | "ALL">("ALL");
  const [showTrash, setShowTrash] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimelineEventView | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimelineEventView | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeEvents = useMemo(
    () => events.filter((event) => !event.deletedAt),
    [events],
  );
  const archivedEvents = useMemo(
    () => events.filter((event) => Boolean(event.deletedAt)),
    [events],
  );
  const sourceEvents = showTrash ? archivedEvents : activeEvents;

  const categoryCounts = useMemo(() => buildCategoryCounts(sourceEvents), [sourceEvents]);

  const years = useMemo(() => {
    const set = new Set(
      sourceEvents.map((event) => new Date(event.eventDate).getFullYear().toString()),
    );
    return [...set].sort((a, b) => Number(b) - Number(a));
  }, [sourceEvents]);

  const filtered = useMemo(() => {
    return sourceEvents.filter((event) => {
      if (categoryFilter !== "ALL" && event.category !== categoryFilter) return false;
      if (yearJump !== "ALL") {
        const year = new Date(event.eventDate).getFullYear().toString();
        if (year !== yearJump) return false;
      }
      const time = new Date(event.eventDate).getTime();
      if (fromDate) {
        const from = new Date(fromDate).getTime();
        if (!Number.isNaN(from) && time < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (!Number.isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          if (time > to.getTime()) return false;
        }
      }
      return true;
    });
  }, [sourceEvents, categoryFilter, yearJump, fromDate, toDate]);

  const flatEvents = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
    });
    return sorted;
  }, [filtered]);

  const groupedByYear = useMemo(() => {
    const groups = new Map<string, TimelineEventView[]>();
    for (const event of flatEvents) {
      const year = new Date(event.eventDate).getFullYear().toString();
      const list = groups.get(year) ?? [];
      list.push(event);
      groups.set(year, list);
    }
    return [...groups.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [flatEvents]);

  useEffect(() => {
    setFocusIndex(0);
  }, [categoryFilter, yearJump, fromDate, toDate, showTrash]);

  async function refreshEvents() {
    const [activeRes, trashRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/timeline?trash=active`),
      fetch(`/api/projects/${projectId}/timeline?trash=archived`),
    ]);
    const activePayload = await readJson<{ events: TimelineEventView[] }>(activeRes);
    const trashPayload = await readJson<{ events: TimelineEventView[] }>(trashRes);
    if (activePayload.success && trashPayload.success) {
      setEvents([...activePayload.data.events, ...trashPayload.data.events]);
    }
  }

  function runExtract(opts: { force?: boolean; all?: boolean } = {}) {
    startBackgroundExtract({
      projectId,
      kind: "timeline",
      force: opts.force,
      all: opts.all,
    });
  }

  useEffect(() => {
    if (prevExtractStatus.current === "running" && extract.status === "idle") {
      void refreshEvents();
      startTransition(() => router.refresh());
    }
    prevExtractStatus.current = extract.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh only on status transitions
  }, [extract.status]);

  useEffect(() => {
    if (searchParams.get("extract") === "1") {
      runExtract({});
      const url = new URL(window.location.href);
      url.searchParams.delete("extract");
      router.replace(url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on ?extract=1
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    function onKeyDown(event: KeyboardEvent) {
      if (dialogOpen || !flatEvents.length) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusIndex((prev) => Math.min(flatEvents.length - 1, prev + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusIndex((prev) => Math.max(0, prev - 1));
      } else if (event.key === "Enter") {
        const focused = flatEvents[focusIndex];
        if (focused && !focused.deletedAt) openEdit(focused);
      } else if (event.key === "p" || event.key === "P") {
        const focused = flatEvents[focusIndex];
        if (focused && !focused.deletedAt) void togglePin(focused);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flatEvents, focusIndex, dialogOpen]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(event: TimelineEventView) {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      eventDate: event.eventDate.slice(0, 10),
      category: event.category,
    });
    setDialogOpen(true);
  }

  async function saveEvent() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        eventDate: new Date(form.eventDate).toISOString(),
        category: form.category,
      };

      const response = editing
        ? await fetch(`/api/timeline/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/projects/${projectId}/timeline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const payload = await readJson<{ event: TimelineEventView }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success(editing ? "Event updated" : "Event added");
      setDialogOpen(false);
      await refreshEvents();
    } catch {
      toast.error("Could not save event");
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(event: TimelineEventView) {
    try {
      const response = await fetch(`/api/timeline/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !event.pinned }),
      });
      const payload = await readJson<{ event: TimelineEventView }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      setEvents((prev) =>
        prev.map((row) => (row.id === event.id ? payload.data.event : row)),
      );
    } catch {
      toast.error("Could not update pin");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const permanent = Boolean(deleteTarget.deletedAt);
      const response = await fetch(
        `/api/timeline/${deleteTarget.id}${permanent ? "?permanent=1" : ""}`,
        { method: "DELETE" },
      );
      const payload = await readJson<{ ok: boolean }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success(permanent ? "Event permanently deleted" : "Event moved to Deleted");
      setDeleteTarget(null);
      await refreshEvents();
    } catch {
      toast.error("Could not delete event");
    } finally {
      setDeleting(false);
    }
  }

  async function restoreEvent(event: TimelineEventView) {
    try {
      const response = await fetch(`/api/timeline/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      const payload = await readJson<{ event: TimelineEventView }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success("Event restored");
      await refreshEvents();
    } catch {
      toast.error("Could not restore event");
    }
  }

  function exportCsv() {
    downloadTextFile(
      `${projectName.replace(/\s+/g, "-").toLowerCase()}-timeline.csv`,
      timelineEventsToCsv(flatEvents),
      "text/csv;charset=utf-8",
    );
  }

  function exportIcs() {
    downloadTextFile(
      `${projectName.replace(/\s+/g, "-").toLowerCase()}-timeline.ics`,
      timelineEventsToIcs(flatEvents, `${projectName} Timeline`),
      "text/calendar;charset=utf-8",
    );
  }

  function jumpToYear(year: string) {
    setYearJump(year);
    const node = document.getElementById(`timeline-year-${year}`);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  let flatCursor = -1;

  return (
    <div className="space-y-6" ref={listRef}>
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-[hsl(var(--glass))] p-5 shadow-sm backdrop-blur-md sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(217_91%_60%/0.12),transparent_55%),radial-gradient(ellipse_at_bottom_left,hsl(262_83%_58%/0.08),transparent_50%)]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              Project chronology
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              Timeline
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Dated milestones for <span className="text-foreground/90">{projectName}</span> —
              funding, legal, leadership, and commercial events with citations into the data room.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={openCreate}>
              <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add event
            </Button>
            <Button type="button" variant="outline" onClick={() => runExtract({ all: true })} disabled={extracting}>
              Extract all
            </Button>
            <Button type="button" onClick={() => runExtract({})} disabled={extracting}>
              {extracting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Extract events
            </Button>
          </div>
        </div>
      </header>

      <TimelineStats events={activeEvents} categoryMeta={STATS_CATEGORY_META} />

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/30 p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5 sm:w-44">
          <Label className="text-xs text-muted-foreground">From</Label>
          <DatePicker value={fromDate || null} onChange={setFromDate} placeholder="Start date" />
        </div>
        <div className="space-y-1.5 sm:w-44">
          <Label className="text-xs text-muted-foreground">To</Label>
          <DatePicker value={toDate || null} onChange={setToDate} placeholder="End date" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(fromDate || toDate) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
            >
              Clear dates
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant={showTrash ? "default" : "outline"}
            onClick={() => setShowTrash((prev) => !prev)}
            aria-label={showTrash ? "Show active events" : "Show deleted events"}
            aria-pressed={showTrash}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Deleted
            {archivedEvents.length > 0 && (
              <span className="ml-1.5 tabular-nums opacity-70">{archivedEvents.length}</span>
            )}
          </Button>
          {flatEvents.length > 0 && (
            <>
              <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                CSV
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={exportIcs}>
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                ICS
              </Button>
            </>
          )}
        </div>
      </div>

      {years.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Jump to year">
          <Button
            type="button"
            size="sm"
            variant={yearJump === "ALL" ? "default" : "outline"}
            onClick={() => setYearJump("ALL")}
          >
            All years
          </Button>
          {years.map((year) => (
            <Button
              key={year}
              type="button"
              size="sm"
              variant={yearJump === year ? "default" : "outline"}
              onClick={() => jumpToYear(year)}
            >
              {year}
            </Button>
          ))}
        </div>
      )}

      {sourceEvents.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <Button
            type="button"
            size="sm"
            variant={categoryFilter === "ALL" ? "default" : "outline"}
            onClick={() => setCategoryFilter("ALL")}
          >
            All
            <span className="ml-1.5 tabular-nums opacity-70">{sourceEvents.length}</span>
          </Button>
          {CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const count = categoryCounts[category];
            if (count === 0) return null;
            return (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={categoryFilter === category ? "default" : "outline"}
                onClick={() => setCategoryFilter(category)}
              >
                {meta.label}
                <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
              </Button>
            );
          })}
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {flatEvents.length} events shown. Use up and down arrows to move, Enter to edit, P to pin.
      </p>

      {extracting && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
          <AgentThinking label="Extracting dated events from documents" />
        </div>
      )}

      {ollamaDown && (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          Ollama is unavailable. Viewing still works; extraction needs a reachable{" "}
          <code className="font-mono text-xs">OLLAMA_BASE_URL</code>.
        </div>
      )}

      {extractMessage && (
        <p className="text-sm text-muted-foreground" role="status">
          {extractMessage}
        </p>
      )}

      {!hasProcessedDocs && activeEvents.length === 0 && !showTrash && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/20 px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-secondary/40">
            <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mt-4 text-base font-medium">Process documents first</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Timeline extraction reads indexed chunks from the data room — upload and wait for READY
            status, then extract dated events.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link href={`/dashboard/projects/${projectId}/data-room`}>Open data room</Link>
          </Button>
        </div>
      )}

      {hasProcessedDocs && activeEvents.length === 0 && !extracting && !showTrash && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/20 px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-4 text-base font-medium">No timeline events yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Run AI extract to pull dated milestones from processed documents, or add a milestone
            manually.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button type="button" variant="outline" onClick={openCreate}>
              Add event
            </Button>
            <Button type="button" onClick={() => runExtract({})}>
              Extract events
            </Button>
          </div>
        </div>
      )}

      {showTrash && archivedEvents.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No deleted events.
        </p>
      )}

      {filtered.length > 0 && (
        <ol className="relative space-y-10 border-l border-primary/25 pl-6 sm:pl-8">
          {groupedByYear.map(([year, yearEvents]) => (
            <li key={year} id={`timeline-year-${year}`} className="relative space-y-4 scroll-mt-24">
              <div
                className="absolute -left-[1.55rem] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-primary/50 bg-background shadow-[0_0_12px_hsl(217_91%_60%/0.35)] sm:-left-[2.05rem]"
                aria-hidden="true"
              >
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground/90">
                {year}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {yearEvents.length} event{yearEvents.length === 1 ? "" : "s"}
                </span>
              </h2>
              <ul className="space-y-3">
                {yearEvents.map((event) => {
                  flatCursor += 1;
                  const index = flatCursor;
                  const meta = CATEGORY_META[event.category];
                  const Icon = meta.icon;
                  const { month, day } = formatEventMonthDay(event.eventDate);
                  const focused = index === focusIndex;
                  return (
                    <li
                      key={event.id}
                      tabIndex={focused ? 0 : -1}
                      aria-current={focused ? "true" : undefined}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border border-border/60 bg-card/50",
                        "shadow-sm transition-[border-color,box-shadow] motion-safe:duration-200",
                        "hover:border-primary/30 hover:shadow-[0_0_0_1px_hsl(217_91%_60%/0.12)]",
                        focused && "border-primary/50 ring-2 ring-primary/30",
                        event.pinned && "border-amber-500/35 bg-amber-500/5",
                      )}
                      onClick={() => setFocusIndex(index)}
                    >
                      <div
                        className={cn("absolute inset-y-0 left-0 w-1", meta.railClass)}
                        aria-hidden="true"
                      />
                      <div className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-stretch sm:gap-4">
                        <div className="flex shrink-0 flex-row items-center gap-3 sm:w-16 sm:flex-col sm:justify-center sm:gap-0 sm:border-r sm:border-border/50 sm:pr-4">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {month}
                          </span>
                          <span className="font-display text-2xl font-semibold tabular-nums leading-none">
                            {day}
                          </span>
                          <time dateTime={event.eventDate} className="sr-only">
                            {formatEventDate(event.eventDate)}
                          </time>
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn("gap-1", meta.className)}>
                              <Icon className="h-3 w-3" aria-hidden="true" />
                              {meta.label}
                            </Badge>
                            {event.pinned && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-500/40 text-amber-200"
                              >
                                <Pin className="h-3 w-3" aria-hidden="true" />
                                Pinned
                              </Badge>
                            )}
                            {event.isManual ? (
                              <Badge variant="secondary" className="text-xs">
                                Manual
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-primary/30 text-xs text-primary/90"
                              >
                                AI
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-base font-medium leading-snug">{event.title}</h3>
                          {event.description && (
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {event.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3">
                            {event.documentId && (
                              <Link
                                href={`/dashboard/projects/${projectId}/data-room?doc=${event.documentId}`}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                Source · {event.documentName ?? "Document"}
                              </Link>
                            )}
                            <Link
                              href={`/dashboard/projects/${projectId}/graph?q=${encodeURIComponent(event.title.split(/\s+/).slice(0, 3).join(" "))}`}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 hover:underline"
                            >
                              <Network className="h-3.5 w-3.5" aria-hidden="true" />
                              Find in graph
                            </Link>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-1 self-start opacity-80 transition-opacity group-hover:opacity-100 sm:self-center">
                          {event.deletedAt ? (
                            <>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Restore ${event.title}`}
                                onClick={() => void restoreEvent(event)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Permanently delete ${event.title}`}
                                onClick={() => setDeleteTarget(event)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={event.pinned ? `Unpin ${event.title}` : `Pin ${event.title}`}
                                onClick={() => void togglePin(event)}
                              >
                                <Pin
                                  className={cn("h-4 w-4", event.pinned && "fill-amber-400 text-amber-300")}
                                />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Edit ${event.title}`}
                                onClick={() => openEdit(event)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Delete ${event.title}`}
                                onClick={() => setDeleteTarget(event)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {sourceEvents.length > 0 && filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No events match the current filters.
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit event" : "Add event"}</DialogTitle>
            <DialogDescription>
              Manual events are kept when AI extraction runs without force replace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timeline-title">Title</Label>
              <Input
                id="timeline-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline-date">Date</Label>
              <DatePicker
                id="timeline-date"
                value={form.eventDate}
                onChange={(ymd) => setForm((prev) => ({ ...prev, eventDate: ymd }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline-category">Category</Label>
              <select
                id="timeline-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    category: e.target.value as TimelineCategory,
                  }))
                }
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_META[category].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeline-description">Description</Label>
              <textarea
                id="timeline-description"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                maxLength={4000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEvent()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteTarget?.deletedAt ? "Permanently delete event?" : "Move event to Deleted?"}
        description={
          deleteTarget
            ? deleteTarget.deletedAt
              ? `Permanently remove “${deleteTarget.title}”. This cannot be undone.`
              : `Move “${deleteTarget.title}” to Deleted. You can restore it later.`
            : undefined
        }
        confirmLabel={deleteTarget?.deletedAt ? "Delete forever" : "Move to Deleted"}
        variant="destructive"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
