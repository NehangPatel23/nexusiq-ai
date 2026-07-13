"use client";

import type { DocumentClassification, DocumentType } from "@prisma/client";
import { ChevronDown, Filter, X } from "lucide-react";
import { useId, useState } from "react";

import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { SearchFilters } from "../lib/types";

interface FolderOption {
  id: string;
  path: string;
}

interface SearchFiltersBarProps {
  filters: SearchFilters;
  folders: FolderOption[];
  availableTags: string[];
  onChange: (filters: SearchFilters) => void;
  onClear: () => void;
  disabled?: boolean;
}

const DOCUMENT_TYPES: DocumentType[] = [
  "PDF",
  "DOCX",
  "XLSX",
  "CSV",
  "PPTX",
  "TXT",
  "MD",
  "IMAGE",
  "OTHER",
];

const CLASSIFICATIONS: DocumentClassification[] = [
  "FINANCIAL",
  "LEGAL",
  "TAX",
  "HR",
  "OPERATIONAL",
  "COMPLIANCE",
  "CONTRACT",
  "CORRESPONDENCE",
  "OTHER",
];

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const FILTER_SELECT_TRIGGER_CLASS =
  "h-10 w-full rounded-lg border border-border/50 bg-background/50 px-3 text-sm text-foreground transition-colors hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function countActiveFilters(filters: SearchFilters) {
  let count = 0;
  if (filters.type) count++;
  if (filters.classification) count++;
  if (filters.folderId) count++;
  if (filters.tags?.length) count++;
  if (filters.dateFrom) count++;
  if (filters.dateTo) count++;
  return count;
}

export function SearchFiltersBar({
  filters,
  folders,
  availableTags,
  onChange,
  onClear,
  disabled = false,
}: SearchFiltersBarProps) {
  const barId = useId();
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveFilters(filters);

  return (
    <section
      aria-labelledby={barId}
      className="overflow-hidden rounded-2xl border border-border/50 bg-card/20"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/20"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={`${barId}-panel`}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-background/50">
            <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 id={barId} className="text-sm font-medium text-foreground">
              Refine results
            </h2>
            <p className="text-xs text-muted-foreground">
              {activeCount > 0
                ? `${activeCount} filter${activeCount === 1 ? "" : "s"} active`
                : "Type, classification, folder, tags, date range"}
            </p>
          </div>
          {activeCount > 0 && (
            <Badge variant="default" className="ml-1">
              {activeCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              disabled={disabled}
              className="h-8 gap-1 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </Button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {expanded && (
        <div id={`${barId}-panel`} className="border-t border-border/40 px-5 pb-5 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Type
              </span>
              <AppSelect
                triggerClassName={FILTER_SELECT_TRIGGER_CLASS}
                value={filters.type ?? ""}
                disabled={disabled}
                onValueChange={(value) =>
                  onChange({
                    ...filters,
                    type: (value || undefined) as DocumentType | undefined,
                  })
                }
                options={[
                  { value: "", label: "All types" },
                  ...DOCUMENT_TYPES.map((type) => ({ value: type, label: type })),
                ]}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Classification
              </span>
              <AppSelect
                triggerClassName={FILTER_SELECT_TRIGGER_CLASS}
                value={filters.classification ?? ""}
                disabled={disabled}
                onValueChange={(value) =>
                  onChange({
                    ...filters,
                    classification: (value || undefined) as DocumentClassification | undefined,
                  })
                }
                options={[
                  { value: "", label: "All classifications" },
                  ...CLASSIFICATIONS.map((value) => ({ value, label: formatLabel(value) })),
                ]}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Folder
              </span>
              <AppSelect
                triggerClassName={FILTER_SELECT_TRIGGER_CLASS}
                value={filters.folderId ?? ""}
                disabled={disabled}
                onValueChange={(value) =>
                  onChange({
                    ...filters,
                    folderId: value || undefined,
                  })
                }
                options={[
                  { value: "", label: "All folders" },
                  ...folders.map((folder) => ({ value: folder.id, label: folder.path })),
                ]}
              />
            </label>

            <fieldset className="space-y-2 sm:col-span-2 lg:col-span-4">
              <legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tags
              </legend>
              {availableTags.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tags in this project yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const selected = filters.tags?.includes(tag) ?? false;
                    return (
                      <label
                        key={tag}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                          selected
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border/50 bg-background/50 text-muted-foreground hover:border-border/80",
                          disabled && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-border accent-primary"
                          checked={selected}
                          disabled={disabled}
                          onChange={(event) => {
                            const current = filters.tags ?? [];
                            const next = event.target.checked
                              ? [...current, tag]
                              : current.filter((value) => value !== tag);
                            onChange({
                              ...filters,
                              tags: next.length > 0 ? next : undefined,
                            });
                          }}
                        />
                        {tag}
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                From date
              </span>
              <Input
                type="date"
                value={filters.dateFrom ? filters.dateFrom.slice(0, 10) : ""}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    dateFrom: event.target.value
                      ? new Date(`${event.target.value}T00:00:00.000Z`).toISOString()
                      : undefined,
                  })
                }
                className="h-10 bg-background/50"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                To date
              </span>
              <Input
                type="date"
                value={filters.dateTo ? filters.dateTo.slice(0, 10) : ""}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    dateTo: event.target.value
                      ? new Date(`${event.target.value}T23:59:59.999Z`).toISOString()
                      : undefined,
                  })
                }
                className="h-10 bg-background/50"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
