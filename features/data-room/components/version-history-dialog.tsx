"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize } from "../lib/mime";
import type { DataRoomDocument } from "../lib/types";

type VersionItem = {
  id: string;
  version: number;
  filePath: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string };
};

interface VersionHistoryDialogProps {
  document: DataRoomDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadNewVersion: (doc: DataRoomDocument) => void;
  onCompare?: (doc: DataRoomDocument) => void;
}

export function VersionHistoryDialog({
  document,
  open,
  onOpenChange,
  onUploadNewVersion,
  onCompare,
}: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !document) return;

    setLoading(true);
    setError(null);
    void fetch(`/api/documents/${document.id}/versions`)
      .then(async (res) => {
        const json = (await res.json()) as {
          success: boolean;
          data?: { items: VersionItem[] };
          error?: { message: string };
        };
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message ?? "Failed to load versions");
        }
        setVersions(json.data?.items ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load versions");
      })
      .finally(() => setLoading(false));
  }, [document, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            {document ? `Versions of ${document.name}` : "Document versions"}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground" aria-busy="true">
            Loading versions…
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {versions.map((version) => (
              <li
                key={version.id}
                className="rounded-lg border border-border/50 bg-card/40 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Version {version.version}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(version.fileSize)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(version.createdAt).toLocaleString()} ·{" "}
                  {version.uploadedBy.name ?? version.uploadedBy.email}
                </p>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!document) return;
                      window.open(
                        `/api/documents/${document.id}?download=1&version=${version.version}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                </div>
              </li>
            ))}
            {versions.length === 0 && (
              <li className="text-sm text-muted-foreground">No versions found.</li>
            )}
          </ul>
        )}

        {document && (
          <div className="flex justify-end gap-2">
            {onCompare && versions.length >= 2 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onCompare(document);
                }}
              >
                Compare versions
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onUploadNewVersion(document);
              }}
            >
              Upload new version
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
