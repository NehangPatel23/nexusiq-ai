"use client";

import { Folder, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export type DeletedFolder = {
  id: string;
  name: string;
  path: string;
  deletedAt: Date | string | null;
};

interface DeletedFoldersPanelProps {
  folders: DeletedFolder[];
  canManage: boolean;
  loading?: boolean;
  onRestore: (folder: DeletedFolder) => void;
  onPermanentDelete: (folder: DeletedFolder) => void;
}

function formatDeletedAt(iso: string | Date | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DeletedFoldersPanel({
  folders,
  canManage,
  loading = false,
  onRestore,
  onPermanentDelete,
}: DeletedFoldersPanelProps) {
  const [restoreTarget, setRestoreTarget] = useState<DeletedFolder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeletedFolder | null>(null);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading deleted folders">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted/40" />
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 px-6 text-center">
        <Folder className="size-10 text-muted-foreground/40" aria-hidden />
        <p className="text-base font-medium">No deleted folders</p>
        <p className="text-sm text-muted-foreground">
          Deleted folders and their contents appear here. Admins can restore or permanently remove
          them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Restoring a folder also restores documents inside it. Permanent delete removes all nested
        folders and files from storage.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border/60 bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">Folder</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Path</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Deleted</th>
              {canManage && (
                <th scope="col" className="px-3 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {folders.map((folder) => (
              <tr key={folder.id} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2.5 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Folder className="size-4 text-muted-foreground" aria-hidden />
                    {folder.name}
                  </span>
                </td>
                <td className={cn("max-w-[320px] truncate px-3 py-2.5 text-muted-foreground")}>
                  {folder.path}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {formatDeletedAt(folder.deletedAt)}
                </td>
                {canManage && (
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRestoreTarget(folder)}
                      >
                        <RotateCcw className="size-3.5" />
                        Restore
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(folder)}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
        title={restoreTarget ? `Restore ${restoreTarget.name}?` : "Restore folder?"}
        description="The folder and its deleted documents will return to the data room."
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
        description="This removes the folder, all nested folders, and all files from storage. This cannot be undone."
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
