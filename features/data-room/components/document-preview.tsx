"use client";

import { Download, Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { DocumentClassification } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagsInput } from "@/features/projects/components/tags-input";
import { cn } from "@/lib/utils";

import { DOCUMENT_CLASSIFICATIONS, getClassificationLabel } from "../lib/classifications";
import { formatFileSize, getDocumentTypeLabel } from "../lib/mime";
import type { DataRoomDocument } from "../lib/types";
import { DocumentPreviewContent } from "./document-preview-content";
import { DocumentEntitiesPanel } from "./document-entities-panel";
import { DocumentStatusBadge } from "./document-status-badge";

interface DocumentPreviewProps {
  document: DataRoomDocument | null;
  canEditTags: boolean;
  canEdit: boolean;
  onClose: () => void;
  onExpand?: (doc: DataRoomDocument) => void;
  onDownload: (doc: DataRoomDocument) => void;
  onTagsChange: (doc: DataRoomDocument, tags: string[]) => Promise<void>;
  onClassificationChange?: (doc: DataRoomDocument, classification: DocumentClassification | null) => Promise<void>;
  onRename?: (doc: DataRoomDocument, name: string) => Promise<void>;
  onViewDuplicateOriginal?: (documentId: string) => void;
  className?: string;
}

export function DocumentPreview({
  document,
  canEditTags,
  canEdit,
  onClose,
  onExpand,
  onDownload,
  onTagsChange,
  onClassificationChange,
  onRename,
  onViewDuplicateOriginal,
  className,
}: DocumentPreviewProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    if (!document) {
      setTags([]);
      return;
    }
    setTags(document.tags);
  }, [document]);

  if (!document) {
    return (
      <aside
        className={cn(
          "flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/20 p-6 text-center",
          className,
        )}
        aria-label="Document preview"
      >
        <p className="text-sm text-muted-foreground">Select a document to preview</p>
      </aside>
    );
  }

  const previewUrl = `/api/documents/${document.id}?preview=1`;

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

  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40",
        className,
      )}
      aria-label={`Preview of ${document.name}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-border/60 p-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{document.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <DocumentStatusBadge status={document.status} errorMessage={document.errorMessage} />
            <span className="text-xs text-muted-foreground">
              {getDocumentTypeLabel(document)} · v{document.version} · {formatFileSize(document.fileSize)}
            </span>
          </div>
          {document.status === "READY" && document.classification && (
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-classified as {getClassificationLabel(document.classification as DocumentClassification)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {onExpand && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Expand preview"
              onClick={() => onExpand(document)}
            >
              <Maximize2 className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Download"
            onClick={() => onDownload(document)}
          >
            <Download className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Close preview"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <DocumentPreviewContent
          document={document}
          previewUrl={previewUrl}
          onDownload={() => onDownload(document)}
        />
      </div>

      <div className="space-y-3 border-t border-border/60 p-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(document.chunkCount ?? 0) > 0 && (
            <div>
              <p className="text-muted-foreground">Chunks</p>
              <p className="font-medium">{document.chunkCount}</p>
            </div>
          )}
          {document.pageCount != null && document.pageCount > 0 && (
            <div>
              <p className="text-muted-foreground">Pages</p>
              <p className="font-medium">{document.pageCount}</p>
            </div>
          )}
          {document.processedAt && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Processed</p>
              <p className="font-medium">
                {new Date(document.processedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>

        {document.duplicateOf && onViewDuplicateOriginal && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onViewDuplicateOriginal(document.duplicateOf!.id)}
          >
            View original duplicate
          </Button>
        )}

        {document.status === "READY" && (
          <DocumentEntitiesPanel documentId={document.id} />
        )}

        {canEdit && onClassificationChange && (
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
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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

        {canEdit && onRename && (
          <div>
            {renaming ? (
              <div className="flex gap-2">
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  aria-label="Document name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void onRename(document, draftName.trim()).then(() => setRenaming(false));
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void onRename(document, draftName.trim()).then(() => setRenaming(false))}
                >
                  Save
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraftName(document.name);
                  setRenaming(true);
                }}
              >
                Rename document
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
