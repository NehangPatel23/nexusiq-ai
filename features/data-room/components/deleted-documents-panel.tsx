"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

import { formatFileSize, getDocumentTypeLabel } from "../lib/mime";
import type { DataRoomDocument } from "../lib/types";

export type DeletedDocument = DataRoomDocument & { deletedAt: string };

interface DeletedDocumentsPanelProps {
  documents: DeletedDocument[];
  selectedIds: Set<string>;
  canManage: boolean;
  loading?: boolean;
  onToggleSelect: (doc: DeletedDocument, selected: boolean) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onRestore: (doc: DeletedDocument) => void;
  onPermanentDelete: (doc: DeletedDocument) => void;
  onBulkRestore?: () => void;
  onBulkPermanentDelete?: () => void;
}

function formatDeletedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DeletedDocumentsPanel({
  documents,
  selectedIds,
  canManage,
  loading = false,
  onToggleSelect,
  onToggleSelectAll,
  onRestore,
  onPermanentDelete,
  onBulkRestore,
  onBulkPermanentDelete,
}: DeletedDocumentsPanelProps) {
  const [restoreTarget, setRestoreTarget] = useState<DeletedDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeletedDocument | null>(null);

  const allSelected = documents.length > 0 && documents.every((d) => selectedIds.has(d.id));
  const someSelected = documents.some((d) => selectedIds.has(d.id));

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading deleted documents">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted/40" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-6 text-center">
        <Trash2 className="size-10 text-muted-foreground/40" aria-hidden />
        <p className="text-base font-medium">No deleted documents</p>
        <p className="text-sm text-muted-foreground">
          Deleted files appear here. Admins can restore them or permanently remove them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Soft-deleted documents are kept here until restored or permanently deleted. Storage files
        are only removed on permanent delete.
      </p>

      {canManage && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/30 px-3 py-2 text-sm">
          <span className="font-medium">{selectedIds.size} selected</span>
          {onBulkRestore && (
            <Button type="button" size="sm" variant="outline" onClick={onBulkRestore}>
              <RotateCcw className="size-4" />
              Restore
            </Button>
          )}
          {onBulkPermanentDelete && (
            <Button type="button" size="sm" variant="destructive" onClick={onBulkPermanentDelete}>
              <Trash2 className="size-4" />
              Delete permanently
            </Button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border/60 bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {canManage && (
                <th scope="col" className="w-10 px-2 py-2.5">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(checked) => onToggleSelectAll(checked === true)}
                    aria-label="Select all deleted documents"
                  />
                </th>
              )}
              <th scope="col" className="px-3 py-2.5 font-medium">Name</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Type</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Size</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Deleted</th>
              {canManage && (
                <th scope="col" className="px-3 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const checked = selectedIds.has(doc.id);
              return (
                <tr
                  key={doc.id}
                  className={cn(
                    "border-b border-border/40 last:border-0",
                    checked && "bg-primary/10",
                  )}
                >
                  {canManage && (
                    <td className="px-2 py-2.5">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => onToggleSelect(doc, value === true)}
                        aria-label={`Select ${doc.name}`}
                      />
                    </td>
                  )}
                  <td className="max-w-[280px] truncate px-3 py-2.5 font-medium">{doc.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{getDocumentTypeLabel(doc)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                    {formatFileSize(doc.fileSize)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {doc.deletedAt ? formatDeletedAt(doc.deletedAt) : "—"}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRestoreTarget(doc)}
                        >
                          <RotateCcw className="size-3.5" />
                          Restore
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(doc)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
        title={restoreTarget ? `Restore ${restoreTarget.name}?` : "Restore document?"}
        description="The document will return to the data room. If its folder was deleted, it will be placed in the root."
        confirmLabel="Restore"
        onConfirm={() => {
          if (restoreTarget) onRestore(restoreTarget);
          setRestoreTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteTarget ? `Permanently delete ${deleteTarget.name}?` : "Permanently delete?"}
        description="This removes the file from storage and cannot be undone."
        confirmLabel="Delete permanently"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) onPermanentDelete(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
