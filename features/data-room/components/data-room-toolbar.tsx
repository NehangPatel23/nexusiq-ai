"use client";

import { useState } from "react";
import {
  Archive,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Trash2,
  X,
} from "lucide-react";

import type { DocumentClassification, DocumentStatus, DocumentType } from "@prisma/client";

import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { DOCUMENT_CLASSIFICATIONS, getClassificationLabel } from "../lib/classifications";
import type { DocumentSortKey, SortDirection } from "../lib/table-utils";

interface DataRoomToolbarProps {
  stats: { total: number; pending: number; folders: number; failed?: number };
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: DocumentStatus | "all" | "needs_attention";
  onStatusFilterChange: (value: DocumentStatus | "all" | "needs_attention") => void;
  typeFilter: DocumentType | "all";
  onTypeFilterChange: (value: DocumentType | "all") => void;
  classificationFilter: DocumentClassification | "all" | "unclassified";
  onClassificationFilterChange: (value: DocumentClassification | "all" | "unclassified") => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  availableTags: string[];
  sortKey: DocumentSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: DocumentSortKey) => void;
  selectedCount: number;
  canDelete: boolean;
  canUpload: boolean;
  onBulkDelete?: () => void;
  onBulkReprocess?: () => void;
  onBulkDownloadZip?: () => void;
  onRetryFailed?: () => void;
  onApplyBulkClassification?: (classification: DocumentClassification) => void;
  onExportCsv: () => void;
  folderPanelOpen: boolean;
  previewPanelOpen: boolean;
  onToggleFolderPanel: () => void;
  onTogglePreviewPanel: () => void;
  breadcrumb?: string | null;
}

const SORT_OPTIONS: { value: DocumentSortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "uploaded", label: "Uploaded" },
  { value: "size", label: "Size" },
  { value: "status", label: "Status" },
  { value: "version", label: "Version" },
  { value: "type", label: "Type" },
];

export function DataRoomToolbar({
  stats,
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  classificationFilter,
  onClassificationFilterChange,
  tagFilter,
  onTagFilterChange,
  availableTags,
  sortKey,
  sortDirection,
  onSortChange,
  selectedCount,
  canDelete,
  canUpload,
  onBulkDelete,
  onBulkReprocess,
  onBulkDownloadZip,
  onRetryFailed,
  onApplyBulkClassification,
  onExportCsv,
  folderPanelOpen,
  previewPanelOpen,
  onToggleFolderPanel,
  onTogglePreviewPanel,
  breadcrumb,
}: DataRoomToolbarProps) {
  const [bulkClassification, setBulkClassification] = useState("");

  const toolbarSelectClass =
    "h-9 w-auto min-w-[9rem] shrink-0 rounded-md border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{stats.total}</strong> documents
        </span>
        <span>
          <strong className="text-foreground">{stats.pending}</strong> pending
        </span>
        {(stats.failed ?? 0) > 0 && (
          <span>
            <strong className="text-destructive">{stats.failed}</strong> failed
          </span>
        )}
        <span>
          <strong className="text-foreground">{stats.folders}</strong> folders
        </span>
        {breadcrumb && (
          <span className="truncate text-foreground/80" aria-label="Current folder">
            {breadcrumb}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 md:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search documents…"
            className="pl-9"
            aria-label="Search documents"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
              aria-label="Clear search"
              onClick={() => onQueryChange("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        <AppSelect
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange(value as DocumentStatus | "all" | "needs_attention")
          }
          triggerClassName={toolbarSelectClass}
          aria-label="Filter by status"
          options={[
            { value: "all", label: "All statuses" },
            { value: "needs_attention", label: "Needs attention" },
            { value: "PENDING", label: "Pending" },
            { value: "PROCESSING", label: "Processing" },
            { value: "READY", label: "Ready" },
            { value: "FAILED", label: "Failed" },
          ]}
        />

        {(stats.failed ?? 0) > 0 && onRetryFailed && (
          <Button type="button" variant="outline" size="sm" onClick={onRetryFailed}>
            Retry failed ({stats.failed})
          </Button>
        )}

        <AppSelect
          value={typeFilter}
          onValueChange={(value) => onTypeFilterChange(value as DocumentType | "all")}
          triggerClassName={toolbarSelectClass}
          aria-label="Filter by type"
          options={[
            { value: "all", label: "All types" },
            { value: "PDF", label: "PDF" },
            { value: "DOCX", label: "DOCX" },
            { value: "XLSX", label: "XLSX" },
            { value: "CSV", label: "CSV" },
            { value: "PPTX", label: "PPTX" },
            { value: "MD", label: "MD" },
            { value: "TXT", label: "TXT" },
            { value: "IMAGE", label: "Image" },
          ]}
        />

        <AppSelect
          value={classificationFilter}
          onValueChange={(value) =>
            onClassificationFilterChange(
              value as DocumentClassification | "all" | "unclassified",
            )
          }
          triggerClassName={toolbarSelectClass}
          aria-label="Filter by classification"
          options={[
            { value: "all", label: "All classes" },
            { value: "unclassified", label: "Unclassified" },
            ...DOCUMENT_CLASSIFICATIONS.map((c) => ({
              value: c,
              label: getClassificationLabel(c) ?? c,
            })),
          ]}
        />

        <AppSelect
          value={tagFilter}
          onValueChange={onTagFilterChange}
          triggerClassName={toolbarSelectClass}
          aria-label="Filter by tag"
          options={[
            { value: "", label: "All tags" },
            ...availableTags.map((tag) => ({ value: tag, label: tag })),
          ]}
        />

        <AppSelect
          value={`${sortKey}-${sortDirection}`}
          onValueChange={(value) => {
            const [key] = value.split("-") as [DocumentSortKey, SortDirection];
            onSortChange(key);
          }}
          triggerClassName={toolbarSelectClass}
          aria-label="Sort documents"
          options={SORT_OPTIONS.map((opt) => ({
            value: `${opt.value}-${sortDirection}`,
            label: `Sort: ${opt.label} (${sortDirection === "asc" ? "↑" : "↓"})`,
          }))}
        />

        <Button type="button" variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="size-4" />
          Export CSV
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          onClick={onToggleFolderPanel}
          aria-label={folderPanelOpen ? "Hide folders" : "Show folders"}
          aria-pressed={folderPanelOpen}
        >
          {folderPanelOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          onClick={onTogglePreviewPanel}
          aria-label={previewPanelOpen ? "Hide preview" : "Show preview"}
          aria-pressed={previewPanelOpen}
        >
          {previewPanelOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </Button>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">{selectedCount} selected</span>
          {onBulkDownloadZip && (
            <Button type="button" size="sm" variant="outline" onClick={onBulkDownloadZip}>
              <Archive className="size-4" />
              Download ZIP
            </Button>
          )}
          {canUpload && onBulkReprocess && (
            <Button type="button" size="sm" variant="outline" onClick={onBulkReprocess}>
              Reprocess
            </Button>
          )}
          {canUpload && onApplyBulkClassification && (
            <div className="flex items-center gap-2">
              <AppSelect
                id="bulk-classification"
                value={bulkClassification}
                onValueChange={(value) => {
                  if (value) onApplyBulkClassification(value as DocumentClassification);
                  setBulkClassification("");
                }}
                triggerClassName="h-8 rounded-md border border-input bg-background px-2 text-xs"
                placeholder="Classify as…"
                aria-label="Bulk classification"
                options={[
                  { value: "", label: "Classify as…" },
                  ...DOCUMENT_CLASSIFICATIONS.map((c) => ({
                    value: c,
                    label: getClassificationLabel(c) ?? c,
                  })),
                ]}
              />
            </div>
          )}
          {canDelete && onBulkDelete && (
            <Button type="button" size="sm" variant="destructive" onClick={onBulkDelete}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
