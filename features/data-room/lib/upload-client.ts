"use client";

import { useCallback, useRef } from "react";

import { MAX_UPLOAD_BYTES } from "../lib/mime";
import type { UploadProgressItem } from "../lib/types";

type FileEntry = {
  file: File;
  relativePath?: string;
};

interface UseDataRoomUploadOptions {
  projectId: string;
  folderId: string | null;
  replaceDocumentId?: string | null;
  preserveStructure?: boolean;
  onItemsChange?: (items: UploadProgressItem[]) => void;
  onComplete?: () => void;
}

export function useDataRoomUpload({
  projectId,
  folderId,
  replaceDocumentId,
  preserveStructure = true,
  onItemsChange,
  onComplete,
}: UseDataRoomUploadOptions) {
  const abortControllers = useRef(new Map<string, AbortController>());
  const itemsRef = useRef<UploadProgressItem[]>([]);

  const updateItems = useCallback(
    (updater: UploadProgressItem[] | ((prev: UploadProgressItem[]) => UploadProgressItem[])) => {
      const next =
        typeof updater === "function" ? updater(itemsRef.current) : updater;
      itemsRef.current = next;
      onItemsChange?.(next);
      return next;
    },
    [onItemsChange],
  );

  const uploadSingle = useCallback(
    async (
      entry: FileEntry,
      itemId: string,
      options?: { folderId?: string | null; replaceDocumentId?: string | null },
    ) => {
      const targetFolderId = options?.folderId !== undefined ? options.folderId : folderId;
      const targetReplaceId =
        options?.replaceDocumentId !== undefined ? options.replaceDocumentId : replaceDocumentId;
      if (entry.file.size > MAX_UPLOAD_BYTES) {
        updateItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, status: "error", error: "File exceeds 50MB limit", progress: 0 }
              : item,
          ),
        );
        return false;
      }

      const controller = new AbortController();
      abortControllers.current.set(itemId, controller);

      updateItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: "uploading", progress: 10, file: entry.file } : item,
        ),
      );

      const formData = new FormData();
      formData.append("file", entry.file);
      if (targetFolderId) formData.append("folderId", targetFolderId);
      if (preserveStructure && entry.relativePath) {
        formData.append("relativePath", entry.relativePath);
      }
      if (targetReplaceId) formData.append("replaceDocumentId", targetReplaceId);

      try {
        updateItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, progress: 50 } : item,
          ),
        );

        const res = await fetch(`/api/projects/${projectId}/upload`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        const json = (await res.json()) as {
          success: boolean;
          error?: { message: string };
        };

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message ?? "Upload failed");
        }

        updateItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, status: "done", progress: 100 } : item,
          ),
        );
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          updateItems((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? { ...item, status: "cancelled", progress: 0, error: undefined }
                : item,
            ),
          );
          return false;
        }
        updateItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "error",
                  progress: 0,
                  error: error instanceof Error ? error.message : "Upload failed",
                  file: entry.file,
                }
              : item,
          ),
        );
        return false;
      } finally {
        abortControllers.current.delete(itemId);
      }
    },
    [folderId, preserveStructure, projectId, replaceDocumentId, updateItems],
  );

  const uploadFiles = useCallback(
    async (
      entries: FileEntry[],
      options?: { folderId?: string | null; replaceDocumentId?: string | null },
    ) => {
      if (entries.length === 0) return;

      const progressItems: UploadProgressItem[] = entries.map((entry, index) => ({
        id: `${entry.file.name}-${index}-${Date.now()}`,
        fileName: entry.file.name,
        relativePath: entry.relativePath,
        progress: 0,
        status: "pending",
        file: entry.file,
      }));

      updateItems(progressItems);

      let anySuccess = false;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!;
        const itemId = progressItems[i]!.id;
        const ok = await uploadSingle(entry, itemId, options);
        if (ok) anySuccess = true;
      }

      if (anySuccess) onComplete?.();
    },
    [onComplete, updateItems, uploadSingle],
  );

  const cancelUpload = useCallback((itemId: string) => {
    abortControllers.current.get(itemId)?.abort();
  }, []);

  const retryUpload = useCallback(
    async (itemId: string) => {
      const item = itemsRef.current.find((i) => i.id === itemId);
      if (!item?.file) return;
      await uploadSingle({ file: item.file, relativePath: item.relativePath }, itemId);
      if (itemsRef.current.some((i) => i.status === "done")) {
        onComplete?.();
      }
    },
    [onComplete, uploadSingle],
  );

  return { uploadFiles, cancelUpload, retryUpload, updateItems };
}

export type { FileEntry };
