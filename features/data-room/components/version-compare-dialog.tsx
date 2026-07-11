"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { formatFileSize } from "../lib/mime";
import type { DataRoomDocument } from "../lib/types";

type VersionItem = {
  id: string;
  version: number;
  fileSize: number;
  createdAt: string;
  uploadedBy: { name: string | null; email: string };
};

interface VersionCompareDialogProps {
  document: DataRoomDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionCompareDialog({
  document,
  open,
  onOpenChange,
}: VersionCompareDialogProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [leftVersion, setLeftVersion] = useState<number | null>(null);
  const [rightVersion, setRightVersion] = useState<number | null>(null);
  const [leftText, setLeftText] = useState<string | null>(null);
  const [rightText, setRightText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !document) return;

    setLoading(true);
    void fetch(`/api/documents/${document.id}/versions`)
      .then(async (res) => {
        const json = (await res.json()) as {
          success: boolean;
          data?: { items: VersionItem[] };
        };
        const items = json.data?.items ?? [];
        setVersions(items);
        if (items.length >= 2) {
          setLeftVersion(items[items.length - 1]!.version);
          setRightVersion(items[0]!.version);
        } else if (items.length === 1) {
          setLeftVersion(items[0]!.version);
          setRightVersion(items[0]!.version);
        }
      })
      .finally(() => setLoading(false));
  }, [document, open]);

  useEffect(() => {
    if (!document || leftVersion === null) {
      setLeftText(null);
      return;
    }
    void fetch(`/api/documents/${document.id}?preview=1&version=${leftVersion}`)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error("Failed to load"))))
      .then((text) => setLeftText(text.slice(0, 80_000)))
      .catch(() => setLeftText("Unable to load preview for this version."));
  }, [document, leftVersion]);

  useEffect(() => {
    if (!document || rightVersion === null) {
      setRightText(null);
      return;
    }
    void fetch(`/api/documents/${document.id}?preview=1&version=${rightVersion}`)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error("Failed to load"))))
      .then((text) => setRightText(text.slice(0, 80_000)))
      .catch(() => setRightText("Unable to load preview for this version."));
  }, [document, rightVersion]);

  const versionOptions = versions.length > 0 ? versions : document ? [{ version: document.version, id: document.id, fileSize: document.fileSize, createdAt: document.createdAt, uploadedBy: { name: null, email: "" } }] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Compare versions</DialogTitle>
          <DialogDescription>
            {document ? `Side-by-side preview of ${document.name}` : "Version comparison"}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground" aria-busy="true">
            Loading versions…
          </p>
        )}

        {!loading && document && (
          <>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                Left
                <select
                  value={leftVersion ?? ""}
                  onChange={(e) => setLeftVersion(Number.parseInt(e.target.value, 10))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  aria-label="Left version"
                >
                  {versionOptions.map((v) => (
                    <option key={v.version} value={v.version}>
                      v{v.version} ({formatFileSize(v.fileSize)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                Right
                <select
                  value={rightVersion ?? ""}
                  onChange={(e) => setRightVersion(Number.parseInt(e.target.value, 10))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  aria-label="Right version"
                >
                  {versionOptions.map((v) => (
                    <option key={v.version} value={v.version}>
                      v{v.version} ({formatFileSize(v.fileSize)})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid max-h-[60vh] min-h-[320px] grid-cols-1 gap-3 overflow-hidden md:grid-cols-2">
              <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/50">
                <p className="border-b border-border/50 bg-card/40 px-3 py-2 text-xs font-medium">
                  Version {leftVersion}
                </p>
                <pre
                  className={cn(
                    "min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed",
                    leftText === rightText && leftVersion !== rightVersion
                      ? "text-foreground"
                      : "text-foreground/90",
                  )}
                >
                  {leftText ?? "Loading…"}
                </pre>
              </div>
              <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/50">
                <p className="border-b border-border/50 bg-card/40 px-3 py-2 text-xs font-medium">
                  Version {rightVersion}
                </p>
                <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed text-foreground/90">
                  {rightText ?? "Loading…"}
                </pre>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
