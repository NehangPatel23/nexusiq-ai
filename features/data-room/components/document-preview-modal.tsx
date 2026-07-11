"use client";

import type { DocumentClassification } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  Download,
  ExternalLink,
  FolderInput,
  History,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagsInput } from "@/features/projects/components/tags-input";
import { cn } from "@/lib/utils";
import { fadeIn, scaleIn, springSoft } from "@/lib/motion";

import { DOCUMENT_CLASSIFICATIONS, getClassificationLabel } from "../lib/classifications";
import { formatFileSize } from "../lib/mime";
import { formatPreviewLabel, getPreviewMode } from "../lib/preview";
import type { DataRoomDocument } from "../lib/types";
import { DocumentPreviewContent } from "./document-preview-content";
import { ClassificationBadge } from "./classification-badge";
import { DocumentActivityPanel } from "./document-activity-panel";
import { DocumentStatusBadge } from "./document-status-badge";

interface DocumentPreviewModalProps {
  document: DataRoomDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  canEditTags: boolean;
  canDelete: boolean;
  canUpload: boolean;
  onDownload: (doc: DataRoomDocument) => void;
  onTagsChange: (doc: DataRoomDocument, tags: string[]) => Promise<void>;
  onClassificationChange: (doc: DataRoomDocument, classification: DocumentClassification | null) => Promise<void>;
  onRename: (doc: DataRoomDocument, name: string) => Promise<void>;
  onReprocess: (doc: DataRoomDocument) => void;
  onVersions: (doc: DataRoomDocument) => void;
  onMove?: (doc: DataRoomDocument) => void;
  onDelete?: (doc: DataRoomDocument) => void;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DocumentPreviewModal({
  document,
  open,
  onOpenChange,
  canEdit,
  canEditTags,
  canDelete,
  canUpload,
  onDownload,
  onTagsChange,
  onClassificationChange,
  onRename,
  onReprocess,
  onVersions,
  onMove,
  onDelete,
}: DocumentPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!document) {
      setTags([]);
      return;
    }
    setTags(document.tags);
    setDraftName(document.name);
    setRenaming(false);
  }, [document]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const prevOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  if (!mounted || !document) return null;

  const previewUrl = `/api/documents/${document.id}?preview=1`;
  const previewMode = getPreviewMode(document);

  async function saveTags(next: string[]) {
    setTags(next);
    if (!canEditTags) return;
    setSavingTags(true);
    try {
      await onTagsChange(document!, next);
    } finally {
      setSavingTags(false);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}?doc=${document!.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          exit="hidden"
          role="presentation"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-background/75 backdrop-blur-md"
            aria-label="Close preview"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-preview-title"
            className={cn(
              "relative flex h-[min(92vh,880px)] w-[min(96vw,1280px)] flex-col overflow-hidden",
              "rounded-2xl border border-border/60 bg-card/95 shadow-2xl shadow-black/40",
              "ring-1 ring-white/5",
            )}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={springSoft}
          >
            {/* Header */}
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/50 bg-gradient-to-r from-card via-card/95 to-card/80 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border/50 bg-secondary/40 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {formatPreviewLabel(previewMode)}
                  </span>
                  <DocumentStatusBadge status={document.status} />
                  {document.classification && (
                    <ClassificationBadge classification={document.classification} />
                  )}
                </div>
                <h2 id="document-preview-title" className="mt-2 truncate text-lg font-semibold tracking-tight">
                  {document.name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {document.type} · v{document.version} · {formatFileSize(document.fileSize)} · Uploaded{" "}
                  {formatDateTime(document.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="Download"
                  onClick={() => onDownload(document)}
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="Open in new tab"
                  onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="Close preview"
                  onClick={close}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </header>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <section className="min-h-0 flex-1 overflow-hidden bg-background/40 p-4 lg:p-5">
                <DocumentPreviewContent
                  document={document}
                  previewUrl={previewUrl}
                  onDownload={() => onDownload(document)}
                  expanded
                  className="h-full"
                />
              </section>

              <aside className="flex w-full shrink-0 flex-col border-t border-border/50 bg-card/60 lg:w-[320px] lg:border-l lg:border-t-0">
                <div className="flex-1 space-y-5 overflow-y-auto p-4">
                  {canEdit && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Classification
                      </p>
                      <select
                        value={document.classification ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          void onClassificationChange(
                            document,
                            value ? (value as DocumentClassification) : null,
                          );
                        }}
                        className="flex h-9 w-full rounded-lg border border-input bg-background/80 px-2.5 text-sm transition-colors focus:border-primary/50"
                        aria-label="Document classification"
                      >
                        <option value="">Unclassified</option>
                        {DOCUMENT_CLASSIFICATIONS.map((c) => (
                          <option key={c} value={c}>
                            {getClassificationLabel(c)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Tags
                    </p>
                    <TagsInput
                      value={tags}
                      onChange={(next) => void saveTags(next)}
                      disabled={!canEditTags || savingTags}
                      placeholder={canEditTags ? "Add a tag" : "No tags"}
                    />
                  </div>

                  {canEdit && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Rename
                      </p>
                      {renaming ? (
                        <div className="flex gap-2">
                          <Input
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            aria-label="Document name"
                            className="h-9"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                void onRename(document, draftName.trim()).then(() => setRenaming(false));
                              }
                              if (e.key === "Escape") setRenaming(false);
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              void onRename(document, draftName.trim()).then(() => setRenaming(false))
                            }
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setDraftName(document.name);
                            setRenaming(true);
                          }}
                        >
                          {document.name}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
                    <dl className="space-y-2">
                      <div className="flex justify-between gap-2">
                        <dt>Document ID</dt>
                        <dd className="truncate font-mono text-[10px] text-foreground/70">{document.id.slice(0, 8)}…</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Version</dt>
                        <dd>v{document.version}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>MIME type</dt>
                        <dd className="truncate">{document.mimeType}</dd>
                      </div>
                    </dl>
                  </div>

                  <DocumentActivityPanel document={document} />
                </div>

                <footer className="shrink-0 space-y-2 border-t border-border/50 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="justify-start"
                      onClick={() => onVersions(document)}
                    >
                      <History className="size-3.5" />
                      Versions
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="justify-start"
                      onClick={() => void copyLink()}
                    >
                      <Copy className="size-3.5" />
                      {copied ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                  {canUpload && (
                    <div className="grid grid-cols-2 gap-2">
                      {onMove && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="justify-start"
                          onClick={() => onMove(document)}
                        >
                          <FolderInput className="size-3.5" />
                          Move
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start"
                        onClick={() => onReprocess(document)}
                      >
                        <RefreshCw className="size-3.5" />
                        Reprocess
                      </Button>
                    </div>
                  )}
                  {canDelete && onDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => onDelete(document)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete document
                    </Button>
                  )}
                </footer>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    window.document.body,
  );
}
