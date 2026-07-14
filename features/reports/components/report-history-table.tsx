"use client";

import type { ReportType } from "@prisma/client";
import { Copy, Eye, GitCompareArrows, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { ReportDownloadMenu } from "./report-download-menu";
import {
  FORMAT_LABELS,
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
  REPORT_TYPES,
  reportTypeAccent,
} from "../lib/labels";
import type { ReportSummary } from "../lib/reports";

type ReportHistoryTableProps = {
  reports: ReportSummary[];
  onView: (reportId: string) => void;
  onDelete: (reportId: string) => void;
  onRename: (reportId: string, currentTitle: string) => void;
  onDuplicate: (reportId: string) => void;
  onCompare?: (reportId: string) => void;
  deletingId?: string | null;
  selectedId?: string | null;
};

export function ReportHistoryTable({
  reports,
  onView,
  onDelete,
  onRename,
  onDuplicate,
  onCompare,
  deletingId,
  selectedId,
}: ReportHistoryTableProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ReportType | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((report) => {
      if (typeFilter !== "ALL" && report.reportType !== typeFilter) return false;
      if (!q) return true;
      return report.title.toLowerCase().includes(q);
    });
  }, [reports, query, typeFilter]);

  return (
    <section aria-labelledby="report-history-heading" className="space-y-4 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="report-history-heading" className="font-display text-lg font-semibold tracking-tight">
            History
          </h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {reports.length} report{reports.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title…"
            aria-label="Search reports by title"
            className="sm:w-56"
          />
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as ReportType | "ALL")}
          >
            <SelectTrigger className="w-[11rem]" aria-label="Filter by report type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {REPORT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
          No reports match your filters.
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {filtered.map((report) => {
            const TypeIcon = REPORT_TYPE_ICONS[report.reportType];
            const selected = selectedId === report.id;
            return (
              <li key={report.id}>
                <article
                  className={cn(
                    "group flex flex-wrap items-center gap-4 rounded-2xl border bg-card/40 p-4 transition-colors",
                    selected
                      ? "border-primary/40 bg-primary/[0.06] shadow-sm"
                      : "border-border/60 hover:border-primary/25 hover:bg-card/70",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onView(report.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`View ${report.title}`}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                        reportTypeAccent(report.reportType),
                      )}
                      aria-hidden="true"
                    >
                      <TypeIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 space-y-1.5">
                      <span className="block truncate font-medium text-foreground">
                        {report.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-border/60 text-[10px]">
                          {REPORT_TYPE_LABELS[report.reportType]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleString()}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-1 pt-0.5">
                        {report.formatsAvailable.map((format) => (
                          <Badge
                            key={format}
                            variant="secondary"
                            className="bg-muted/50 text-[10px] font-normal text-muted-foreground"
                          >
                            {FORMAT_LABELS[format]}
                          </Badge>
                        ))}
                      </span>
                    </span>
                  </button>

                  <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
                    <Button
                      variant={selected ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => onView(report.id)}
                      aria-label={`Open ${report.title}`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      View
                    </Button>
                    <ReportDownloadMenu
                      reportId={report.id}
                      formats={report.formatsAvailable}
                      variant="ghost"
                      includeZip
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" aria-label={`More actions for ${report.title}`}>
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onRename(report.id, report.title)}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onDuplicate(report.id)}>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          Duplicate
                        </DropdownMenuItem>
                        {onCompare ? (
                          <DropdownMenuItem onSelect={() => onCompare(report.id)}>
                            <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
                            Compare…
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={deletingId === report.id}
                          onSelect={() => onDelete(report.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
