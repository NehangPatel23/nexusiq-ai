"use client";

import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { FileEntry } from "../lib/upload-client";

interface UploadDropzoneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replaceDocumentId?: string | null;
  uploading?: boolean;
  preserveStructure: boolean;
  onPreserveStructureChange: (value: boolean) => void;
  onUploadFiles: (entries: FileEntry[]) => Promise<void>;
}

export function UploadDropzone({
  open,
  onOpenChange,
  replaceDocumentId,
  uploading = false,
  preserveStructure,
  onPreserveStructureChange,
  onUploadFiles,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function readEntry(
    entry: FileSystemEntry,
    pathPrefix = "",
  ): Promise<FileEntry[]> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
      const relativePath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
      return [{ file, relativePath: pathPrefix ? relativePath : undefined }];
    }

    if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const children: FileSystemEntry[] = [];
      // readEntries returns batches (often max 100); loop until empty.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
          reader.readEntries(resolve, reject);
        });
        if (batch.length === 0) break;
        children.push(...batch);
      }
      const nextPrefix = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
      const nested: FileEntry[] = [];
      for (const child of children) {
        nested.push(...(await readEntry(child, nextPrefix)));
      }
      return nested;
    }

    return [];
  }

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const files = event.dataTransfer.files;
    if (!files?.length) return;

    const entries: FileEntry[] = [];
    const itemsList = event.dataTransfer.items;

    if (itemsList) {
      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        if (!item || item.kind !== "file") continue;
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          entries.push(...(await readEntry(entry)));
        } else {
          const file = item.getAsFile();
          if (file) entries.push({ file });
        }
      }
    }

    if (entries.length === 0) {
      entries.push(...Array.from(files).map((file) => ({ file })));
    }

    await onUploadFiles(entries);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (uploading) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{replaceDocumentId ? "Upload new version" : "Upload documents"}</DialogTitle>
          <DialogDescription>
            PDF, DOCX, XLSX, CSV, PPTX, TXT, MD, PNG, JPG — max 50MB each. Folder drops preserve
            structure.
          </DialogDescription>
        </DialogHeader>

        {!replaceDocumentId && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={preserveStructure}
              onCheckedChange={(checked) => onPreserveStructureChange(checked === true)}
            />
            Preserve folder structure on bulk upload
          </label>
        )}

        <div
          role="button"
          tabIndex={0}
          aria-label="Drag and drop files to upload"
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/10"
              : "border-border/60 bg-card/30 hover:border-primary/50",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => void handleDrop(e)}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <Upload className="size-8 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium">Drop files or folders here</p>
            <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            multiple={!replaceDocumentId}
            accept=".pdf,.docx,.xlsx,.csv,.pptx,.txt,.md,.markdown,.png,.jpg,.jpeg,application/pdf,text/plain,text/markdown,image/png,image/jpeg"
            onChange={(e) => {
              const fileList = e.target.files;
              if (fileList?.length) {
                void onUploadFiles(Array.from(fileList).map((file) => ({ file })));
              }
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
