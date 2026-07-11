"use client";

import {
  Copy,
  Download,
  Expand,
  Eye,
  FileText,
  FolderInput,
  History,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getDocumentTypeLabel } from "../lib/mime";

import { FileNameTooltip } from "@/components/ui/truncate-tooltip";

import { formatFileSize } from "../lib/mime";
import type { DocumentSortKey, SortDirection } from "../lib/table-utils";
import type { DataRoomDocument } from "../lib/types";
import { ClassificationBadge } from "./classification-badge";
import { DocumentStatusBadge } from "./document-status-badge";

interface DocumentTableProps {
  documents: DataRoomDocument[];
  selectedId: string | null;
  selectedIds: Set<string>;
  focusedIndex?: number | null;
  duplicateOf: Map<string, { id: string; name: string }>;
  sortKey: DocumentSortKey;
  sortDirection: SortDirection;
  onSort: (key: DocumentSortKey) => void;
  onSelect: (doc: DataRoomDocument) => void;
  onExpand?: (doc: DataRoomDocument) => void;
  onToggleSelect: (doc: DataRoomDocument, selected: boolean) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onDownload: (doc: DataRoomDocument) => void;
  onVersions: (doc: DataRoomDocument) => void;
  onReprocess: (doc: DataRoomDocument) => void;
  onMove?: (doc: DataRoomDocument) => void;
  onRename?: (doc: DataRoomDocument) => void;
  onDelete?: (doc: DataRoomDocument) => void;
  canDelete: boolean;
  canUpload: boolean;
  draggable?: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDirection,
  onSort,
}: {
  label: string;
  column: DocumentSortKey;
  sortKey: DocumentSortKey;
  sortDirection: SortDirection;
  onSort: (key: DocumentSortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() => onSort(column)}
    >
      {label}
      {active && <span aria-hidden="true">{sortDirection === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

export function DocumentTable({
  documents,
  selectedId,
  selectedIds,
  focusedIndex = null,
  duplicateOf,
  sortKey,
  sortDirection,
  onSort,
  onSelect,
  onExpand,
  onToggleSelect,
  onToggleSelectAll,
  onDownload,
  onVersions,
  onReprocess,
  onMove,
  onRename,
  onDelete,
  canDelete,
  canUpload,
  draggable = false,
}: DocumentTableProps) {
  if (documents.length === 0) {
    return null;
  }

  const allSelected = documents.length > 0 && documents.every((d) => selectedIds.has(d.id));
  const someSelected = documents.some((d) => selectedIds.has(d.id));

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-border/60 bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="w-10 px-2 py-2.5">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => onToggleSelectAll(checked === true)}
                aria-label="Select all documents"
              />
            </th>
            <th scope="col" className="px-3 py-2.5">
              <SortHeader label="Name" column="name" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
            </th>
            <th scope="col" className="px-3 py-2.5">
              <SortHeader label="Type" column="type" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">Class</th>
            <th scope="col" className="px-3 py-2.5">
              <SortHeader label="Status" column="status" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
            </th>
            <th scope="col" className="px-3 py-2.5">
              <SortHeader label="Ver" column="version" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
            </th>
            <th scope="col" className="px-3 py-2.5">
              <SortHeader label="Size" column="size" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
            </th>
            <th scope="col" className="px-3 py-2.5">
              <SortHeader label="Uploaded" column="uploaded" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
            </th>
            <th scope="col" className="px-3 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, index) => {
            const selected = selectedId === doc.id;
            const checked = selectedIds.has(doc.id);
            const dup = duplicateOf.get(doc.id);
            const focused = focusedIndex === index;

            return (
              <tr
                key={doc.id}
                draggable={draggable && canUpload}
                tabIndex={focused ? 0 : -1}
                className={cn(
                  "border-b border-border/40 transition-colors last:border-0",
                  selected || checked ? "bg-primary/10" : "hover:bg-secondary/40",
                  focused && "ring-2 ring-inset ring-primary/40",
                )}
                onDoubleClick={() => onExpand?.(doc)}
                onDragStart={(e) => {
                  if (!draggable || !canUpload) return;
                  e.dataTransfer.setData("application/x-nexusiq-document-id", doc.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
              >
                <td className="px-2 py-2.5">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => onToggleSelect(doc, value === true)}
                    aria-label={`Select ${doc.name}`}
                  />
                </td>
                <td className="max-w-[240px] px-3 py-2.5">
                  <FileNameTooltip name={doc.name}>
                    <button
                      type="button"
                      className="flex w-full max-w-[220px] items-center gap-2 overflow-hidden text-left font-medium hover:text-primary"
                      onClick={() => onSelect(doc)}
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="block min-w-0 flex-1 truncate">{doc.name}</span>
                    </button>
                  </FileNameTooltip>
                  {dup && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                      <Copy className="size-3" aria-hidden />
                      Duplicate of {dup.name}
                    </p>
                  )}
                  {doc.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {doc.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="normal-case tracking-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{getDocumentTypeLabel(doc)}</td>
                <td className="px-3 py-2.5">
                  <ClassificationBadge classification={doc.classification} />
                </td>
                <td className="px-3 py-2.5">
                  <DocumentStatusBadge status={doc.status} />
                </td>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">v{doc.version}</td>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                  {formatFileSize(doc.fileSize)}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{formatDate(doc.createdAt)}</td>
                <td className="px-3 py-2.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Actions for ${doc.name}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelect(doc)}>
                        <Eye className="size-4" />
                        Preview
                      </DropdownMenuItem>
                      {onExpand && (
                        <DropdownMenuItem onClick={() => onExpand(doc)}>
                          <Expand className="size-4" />
                          Open full preview
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDownload(doc)}>
                        <Download className="size-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onVersions(doc)}>
                        <History className="size-4" />
                        Version history
                      </DropdownMenuItem>
                      {canUpload && onRename && (
                        <DropdownMenuItem onClick={() => onRename(doc)}>
                          <Pencil className="size-4" />
                          Rename
                        </DropdownMenuItem>
                      )}
                      {canUpload && onMove && (
                        <DropdownMenuItem onClick={() => onMove(doc)}>
                          <FolderInput className="size-4" />
                          Move to folder
                        </DropdownMenuItem>
                      )}
                      {canUpload && (
                        <DropdownMenuItem onClick={() => onReprocess(doc)}>
                          <RefreshCw className="size-4" />
                          Reprocess
                        </DropdownMenuItem>
                      )}
                      {canDelete && onDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(doc)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
