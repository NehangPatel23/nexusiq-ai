"use client";

import type { DocumentClassification, DocumentStatus, DocumentType } from "@prisma/client";
import { Archive, ClipboardList, FolderOpen, Link2, RefreshCw, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProjectShell } from "@/features/projects/components/project-shell-context";
import { cn } from "@/lib/utils";

import {
  bulkDeleteDocumentsAction,
  bulkPermanentlyDeleteDocumentsAction,
  bulkReprocessDocumentsAction,
  bulkRestoreDocumentsAction,
  bulkUpdateDocumentClassificationAction,
  createFolderAction,
  deleteDocumentAction,
  deleteFolderAction,
  dismissDuplicateAction,
  markIntentionalDuplicateAction,
  permanentlyDeleteDocumentAction,
  permanentlyDeleteFolderAction,
  reprocessDocumentAction,
  restoreDocumentAction,
  restoreFolderAction,
  retryFailedDocumentsAction,
  updateDocumentAction,
  updateDocumentTagsAction,
  updateFolderAction,
} from "../actions";
import {
  buildDuplicateMap,
  collectDocumentTags,
  exportDocumentsCsv,
  filterDocuments,
  sortDocuments,
  type DocumentSortKey,
  type SortDirection,
} from "../lib/table-utils";
import {
  detectDocumentTransitions,
  snapshotDocuments,
} from "../lib/document-transitions";
import { getProcessingErrorHint } from "../lib/processing-errors";
import { DATA_ROOM_UPLOAD_EVENT } from "../lib/data-room-events";
import { useDataRoomUpload } from "../lib/upload-client";
import type { DataRoomDocument, DataRoomFolderNode, UploadProgressItem } from "../lib/types";
import { DataRoomChecklist } from "./data-room-checklist";
import { DataRoomToolbar } from "./data-room-toolbar";
import { DeletedDocumentsPanel, type DeletedDocument } from "./deleted-documents-panel";
import { DeletedFoldersPanel, type DeletedFolder } from "./deleted-folders-panel";
import { DocumentPreview } from "./document-preview";
import { DocumentPreviewModal } from "./document-preview-modal";
import { DocumentTable } from "./document-table";
import { FolderTree } from "./folder-tree";
import { MoveDocumentDialog } from "./move-document-dialog";
import { ProcessingQueuePanel } from "./processing-queue-panel";
import { ProcessingStatusBar, type ProcessingSummary } from "./processing-status-bar";
import { WorkerSetupBanner } from "./worker-setup-banner";
import { RenameFolderDialog } from "./rename-folder-dialog";
import { ShareLinksDialog } from "./share-links-dialog";
import { UploadDropzone } from "./upload-dropzone";
import { UploadTray } from "./upload-tray";
import { VersionHistoryDialog } from "./version-history-dialog";
import { VersionCompareDialog } from "./version-compare-dialog";

function serializeDates<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function flattenFolders(tree: DataRoomFolderNode[]): DataRoomFolderNode[] {
  const out: DataRoomFolderNode[] = [];
  for (const node of tree) {
    out.push(node);
    out.push(...flattenFolders(node.children));
  }
  return out;
}

function formatProcessingDescription(summary: ProcessingSummary) {
  const parts = [
    `${summary.processing} processing`,
    `${summary.pending} pending`,
    `${summary.ready} ready`,
  ];
  if (summary.failed > 0) {
    parts.push(`${summary.failed} failed`);
  }
  return parts.join(" · ");
}

interface DataRoomViewProps {
  projectId: string;
  initialFolders: DataRoomFolderNode[];
  initialDocuments: DataRoomDocument[];
  canUpload: boolean;
  canDelete: boolean;
  canManageDeleted?: boolean;
  retentionDays?: number;
  workerMode?: boolean;
}

type DataRoomViewMode = "active" | "deleted";
type DeletedTab = "files" | "folders";

export function DataRoomView({
  projectId,
  initialFolders,
  initialDocuments,
  canUpload,
  canDelete,
  canManageDeleted = canDelete,
  retentionDays = 30,
  workerMode = false,
}: DataRoomViewProps) {
  const { canEdit } = useProjectShell();
  const searchParams = useSearchParams();
  const deepLinkHandled = useRef(false);
  const previewHighlight = searchParams.get("highlight");
  const processingWasActiveRef = useRef(false);
  const processingToastIdRef = useRef<string | number | null>(null);
  const documentSnapshotRef = useRef(snapshotDocuments(initialDocuments));
  const tableRef = useRef<HTMLDivElement>(null);
  const [tree, setTree] = useState(initialFolders);
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DataRoomDocument | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceDocumentId, setReplaceDocumentId] = useState<string | null>(null);
  const [versionsDoc, setVersionsDoc] = useState<DataRoomDocument | null>(null);
  const [moveDoc, setMoveDoc] = useState<DataRoomDocument | null>(null);
  const [renameDoc, setRenameDoc] = useState<DataRoomDocument | null>(null);
  const [renameFolder, setRenameFolder] = useState<{ id: string; name: string } | null>(null);
  const [renameDocName, setRenameDocName] = useState("");
  const [uploadTrayItems, setUploadTrayItems] = useState<UploadProgressItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "document"; doc: DataRoomDocument }
    | { type: "folder"; folderId: string; name: string }
    | { type: "bulk"; count: number }
    | null
  >(null);
  const [previewOpenMobile, setPreviewOpenMobile] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [compareDoc, setCompareDoc] = useState<DataRoomDocument | null>(null);
  const [folderPanelOpen, setFolderPanelOpen] = useState(true);
  const [previewPanelOpen, setPreviewPanelOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all" | "needs_attention">("all");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [classificationFilter, setClassificationFilter] = useState<
    DocumentClassification | "all" | "unclassified"
  >("all");
  const [tagFilter, setTagFilter] = useState("");
  const [sortKey, setSortKey] = useState<DocumentSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [preserveStructure, setPreserveStructure] = useState(true);
  const [viewMode, setViewMode] = useState<DataRoomViewMode>("active");
  const [deletedTab, setDeletedTab] = useState<DeletedTab>("files");
  const [deletedDocuments, setDeletedDocuments] = useState<DeletedDocument[]>([]);
  const [deletedFolders, setDeletedFolders] = useState<DeletedFolder[]>([]);
  const [deletedSelectedIds, setDeletedSelectedIds] = useState<Set<string>>(new Set());
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [deletedFoldersLoading, setDeletedFoldersLoading] = useState(false);
  const [processingSummary, setProcessingSummary] = useState<ProcessingSummary | null>(null);
  const [processingLoading, setProcessingLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  const applyDocumentTransitions = useCallback((items: DataRoomDocument[]) => {
    const transitions = detectDocumentTransitions(documentSnapshotRef.current, items);
    for (const transition of transitions) {
      if (transition.type === "ready") {
        toast.success(`${transition.doc.name} is ready`, {
          description: `${transition.doc.chunkCount ?? 0} chunk${(transition.doc.chunkCount ?? 0) === 1 ? "" : "s"}`,
        });
      } else if (transition.type === "failed") {
        toast.error(`${transition.doc.name} failed`, {
          description: getProcessingErrorHint(transition.doc.errorMessage),
        });
      } else if (transition.type === "auto-folder") {
        toast.message(`Moved ${transition.doc.name}`, {
          description: `Auto-filed to ${transition.folderPath} based on classification`,
        });
      }
    }
    documentSnapshotRef.current = snapshotDocuments(items);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const folderQuery = selectedFolderId === null ? "all" : selectedFolderId;

      const [foldersRes, docsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/folders`, { cache: "no-store" }),
        fetch(
          `/api/projects/${projectId}/documents?folderId=${encodeURIComponent(folderQuery)}`,
          { cache: "no-store" },
        ),
      ]);

      const foldersJson = (await foldersRes.json()) as {
        success: boolean;
        data?: { tree: DataRoomFolderNode[] };
        error?: { message: string };
      };
      const docsJson = (await docsRes.json()) as {
        success: boolean;
        data?: { items: DataRoomDocument[] };
        error?: { message: string };
      };

      if (!foldersRes.ok || !foldersJson.success) {
        throw new Error(foldersJson.error?.message ?? "Failed to load folders");
      }
      if (!docsRes.ok || !docsJson.success) {
        throw new Error(docsJson.error?.message ?? "Failed to load documents");
      }

      setTree(serializeDates(foldersJson.data?.tree ?? []));
      const items = serializeDates(docsJson.data?.items ?? []);
      applyDocumentTransitions(items);
      setDocuments(items);
      setSelectedDoc((current) =>
        current ? items.find((d) => d.id === current.id) ?? null : null,
      );
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data room");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedFolderId, applyDocumentTransitions]);

  const handleUploadBatchComplete = useCallback(
    async ({ successCount, failCount }: { successCount: number; failCount: number }) => {
      setUploadOpen(false);
      setReplaceDocumentId(null);

      if (successCount > 0) {
        try {
          await refresh();
          if (failCount === 0) {
            toast.success(
              `Uploaded ${successCount} file${successCount === 1 ? "" : "s"}`,
            );
          } else {
            toast.warning(
              `Uploaded ${successCount} file${successCount === 1 ? "" : "s"}; ${failCount} failed`,
            );
          }
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Upload succeeded but refresh failed",
          );
        }
        return;
      }

      if (failCount > 0) {
        toast.error(
          `${failCount} upload${failCount === 1 ? "" : "s"} failed. Check the progress panel for details.`,
        );
      }
    },
    [refresh],
  );

  const { uploadFiles, cancelUpload, retryUpload } = useDataRoomUpload({
    projectId,
    folderId: selectedFolderId,
    replaceDocumentId,
    preserveStructure,
    onItemsChange: setUploadTrayItems,
    onBatchComplete: (result) => {
      void handleUploadBatchComplete(result);
    },
  });

  useEffect(() => {
    if (renameDoc) setRenameDocName(renameDoc.name);
  }, [renameDoc]);

  const refreshDeleted = useCallback(async () => {
    setDeletedLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/deleted`);
      const json = (await res.json()) as {
        success: boolean;
        data?: { items: DeletedDocument[] };
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Failed to load deleted documents");
      }
      setDeletedDocuments(serializeDates(json.data?.items ?? []));
      setDeletedSelectedIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load deleted documents");
    } finally {
      setDeletedLoading(false);
    }
  }, [projectId]);

  const refreshDeletedFolders = useCallback(async () => {
    setDeletedFoldersLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/folders/deleted`);
      const json = (await res.json()) as {
        success: boolean;
        data?: { items: DeletedFolder[] };
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Failed to load deleted folders");
      }
      setDeletedFolders(serializeDates(json.data?.items ?? []));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load deleted folders");
    } finally {
      setDeletedFoldersLoading(false);
    }
  }, [projectId]);

  const showProcessingToast = useCallback((summary: ProcessingSummary) => {
    if (summary.active > 0) {
      processingToastIdRef.current = toast.message("Document processing", {
        id: processingToastIdRef.current ?? "document-processing-status",
        description: formatProcessingDescription(summary),
        duration: 4500,
      });
      return;
    }

    if (!processingWasActiveRef.current) {
      return;
    }

    if (summary.failed > 0) {
      processingToastIdRef.current = toast.error(
        `${summary.failed} document${summary.failed === 1 ? "" : "s"} failed processing`,
        {
          id: processingToastIdRef.current ?? "document-processing-status",
          description: `${summary.ready} ready · ${summary.failed} failed`,
          duration: 6000,
        },
      );
      return;
    }

    processingToastIdRef.current = toast.success("Document processing complete", {
      id: processingToastIdRef.current ?? "document-processing-status",
      description: `${summary.ready} document${summary.ready === 1 ? "" : "s"} ready`,
      duration: 4500,
    });
  }, []);

  const refreshProcessingStatus = useCallback(async () => {
    setProcessingLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/processing-status`);
      const json = (await res.json()) as {
        success: boolean;
        data?: ProcessingSummary;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Failed to load processing status");
      }
      const summary = serializeDates(json.data ?? null);
      setProcessingSummary(summary);
      if (summary) {
        showProcessingToast(summary);
      }
      if (json.data && json.data.active === 0 && json.data.failed === 0) {
        return false;
      }
      return Boolean(json.data && json.data.active > 0);
    } catch {
      return false;
    } finally {
      setProcessingLoading(false);
    }
  }, [projectId, showProcessingToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void refreshDeleted();
    void refreshDeletedFolders();
  }, [refreshDeleted, refreshDeletedFolders]);

  useEffect(() => {
    if (viewMode !== "active") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      const shouldContinue = await refreshProcessingStatus();
      if (cancelled) return;
      if (processingWasActiveRef.current && !shouldContinue) {
        await refresh();
      }
      processingWasActiveRef.current = shouldContinue;
      if (shouldContinue) {
        timer = setTimeout(() => void poll(), 3000);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [viewMode, refreshProcessingStatus, documents]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "u" && canUpload && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setReplaceDocumentId(null);
        setUploadOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUpload]);

  useEffect(() => {
    function onUploadEvent() {
      setReplaceDocumentId(null);
      setUploadOpen(true);
    }
    window.addEventListener(DATA_ROOM_UPLOAD_EVENT, onUploadEvent);
    return () => window.removeEventListener(DATA_ROOM_UPLOAD_EVENT, onUploadEvent);
  }, []);

  const availableTags = useMemo(() => collectDocumentTags(documents), [documents]);

  const folderDocumentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const doc of documents) {
      if (doc.folderId) {
        counts[doc.folderId] = (counts[doc.folderId] ?? 0) + 1;
      }
    }
    return counts;
  }, [documents]);

  const rootDocumentCount = useMemo(
    () => documents.filter((d) => !d.folderId).length,
    [documents],
  );

  const stats = useMemo(
    () => ({
      total: documents.length,
      pending: documents.filter((d) => d.status === "PENDING" || d.status === "PROCESSING").length,
      failed: documents.filter((d) => d.status === "FAILED").length,
      folders: flattenFolders(tree).length,
    }),
    [documents, tree],
  );

  const handleViewDuplicateOriginal = useCallback(
    (documentId: string) => {
      const doc = documents.find((item) => item.id === documentId);
      if (!doc) return;
      setSelectedDoc(doc);
      setPreviewPanelOpen(true);
    },
    [documents],
  );

  const handleDismissDuplicate = useCallback(
    async (doc: DataRoomDocument) => {
      const result = await dismissDuplicateAction(projectId, doc.id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Duplicate flag dismissed");
      await refresh();
    },
    [projectId, refresh],
  );

  const handleMarkIntentionalDuplicate = useCallback(
    async (doc: DataRoomDocument) => {
      const result = await markIntentionalDuplicateAction(projectId, doc.id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Marked as intentional duplicate");
      await refresh();
    },
    [projectId, refresh],
  );

  const handleRetryFailed = useCallback(async () => {
    const result = await retryFailedDocumentsAction(projectId);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`Queued ${result.data?.updated ?? 0} failed documents`);
    await refresh();
    void refreshProcessingStatus();
  }, [projectId, refresh, refreshProcessingStatus]);

  const handleBulkClassification = useCallback(
    async (classification: DocumentClassification) => {
      const result = await bulkUpdateDocumentClassificationAction(projectId, {
        documentIds: Array.from(selectedIds),
        classification,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`Updated classification on ${result.data?.updated ?? 0} documents`);
      await refresh();
    },
    [projectId, selectedIds, refresh],
  );

  const duplicateOf = useMemo(() => buildDuplicateMap(documents), [documents]);

  const visibleDocuments = useMemo(() => {
    let list =
      selectedFolderId === null
        ? documents
        : documents.filter((d) => d.folderId === selectedFolderId);
    list = filterDocuments(list, {
      query,
      status: statusFilter,
      type: typeFilter,
      classification: classificationFilter,
      tag: tagFilter,
    });
    return sortDocuments(list, sortKey, sortDirection);
  }, [
    documents,
    selectedFolderId,
    query,
    statusFilter,
    typeFilter,
    classificationFilter,
    tagFilter,
    sortKey,
    sortDirection,
  ]);

  useEffect(() => {
    const docId = searchParams.get("doc");
    if (!docId || deepLinkHandled.current || documents.length === 0) return;
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      deepLinkHandled.current = true;
      setSelectedDoc(doc);
      setPreviewModalOpen(true);
      setPreviewPanelOpen(true);
    }
  }, [searchParams, documents]);

  useEffect(() => {
    if (focusedIndex !== null && focusedIndex >= visibleDocuments.length) {
      setFocusedIndex(visibleDocuments.length > 0 ? visibleDocuments.length - 1 : null);
    }
  }, [focusedIndex, visibleDocuments.length]);

  useEffect(() => {
    function onTableKeyDown(e: KeyboardEvent) {
      if (!tableRef.current?.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }
      if (visibleDocuments.length === 0) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const current = focusedIndex ?? (selectedDoc ? visibleDocuments.findIndex((d) => d.id === selectedDoc.id) : 0);
      const idx = current < 0 ? 0 : current;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(idx + 1, visibleDocuments.length - 1);
        setFocusedIndex(next);
        setSelectedDoc(visibleDocuments[next]!);
        setPreviewPanelOpen(true);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(idx - 1, 0);
        setFocusedIndex(next);
        setSelectedDoc(visibleDocuments[next]!);
        setPreviewPanelOpen(true);
      } else if (e.key === "Enter" && visibleDocuments[idx]) {
        e.preventDefault();
        setPreviewModalOpen(true);
      } else if (e.key === "Escape") {
        setSelectedDoc(null);
        setPreviewOpenMobile(false);
        setPreviewModalOpen(false);
        setFocusedIndex(null);
      }
    }
    window.addEventListener("keydown", onTableKeyDown);
    return () => window.removeEventListener("keydown", onTableKeyDown);
  }, [focusedIndex, selectedDoc, visibleDocuments]);

  const breadcrumb = useMemo(() => {
    if (!selectedFolderId) return null;
    const flat = flattenFolders(tree);
    const folder = flat.find((f) => f.id === selectedFolderId);
    return folder?.path ?? null;
  }, [selectedFolderId, tree]);

  function handleSort(key: DocumentSortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  async function handleCreateFolder(name: string, parentId: string | null) {
    const result = await createFolderAction(projectId, { name, parentId });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Folder created");
    await refresh();
  }

  async function handleRenameFolder(name: string) {
    if (!renameFolder) return;
    const result = await updateFolderAction(projectId, renameFolder.id, { name });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Folder renamed");
    await refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    if (deleteTarget.type === "bulk") {
      const result = await bulkDeleteDocumentsAction(projectId, {
        documentIds: Array.from(selectedIds),
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`Moved ${result.data?.deleted ?? 0} documents to Deleted`);
      setSelectedIds(new Set());
    } else if (deleteTarget.type === "document") {
      const result = await deleteDocumentAction(projectId, deleteTarget.doc.id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Document moved to Deleted");
      if (selectedDoc?.id === deleteTarget.doc.id) {
        setSelectedDoc(null);
        setPreviewOpenMobile(false);
      }
    } else {
      const result = await deleteFolderAction(projectId, deleteTarget.folderId);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Folder deleted");
      if (selectedFolderId === deleteTarget.folderId) {
        setSelectedFolderId(null);
      }
    }
    setDeleteTarget(null);
    await refresh();
    await Promise.all([refreshDeleted(), refreshDeletedFolders()]);
  }

  async function handleRestoreDocument(doc: DeletedDocument) {
    const result = await restoreDocumentAction(projectId, doc.id);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Document restored");
    await Promise.all([refresh(), refreshDeleted()]);
    setViewMode("active");
  }

  async function handlePermanentDelete(doc: DeletedDocument) {
    const result = await permanentlyDeleteDocumentAction(projectId, doc.id);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Document permanently deleted");
    await refreshDeleted();
  }

  async function handleBulkRestoreDeleted() {
    const result = await bulkRestoreDocumentsAction(projectId, {
      documentIds: Array.from(deletedSelectedIds),
    });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`Restored ${result.data?.restored ?? 0} documents`);
    await Promise.all([refresh(), refreshDeleted()]);
    setViewMode("active");
  }

  async function handleBulkPermanentDelete() {
    const result = await bulkPermanentlyDeleteDocumentsAction(projectId, {
      documentIds: Array.from(deletedSelectedIds),
    });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`Permanently deleted ${result.data?.deleted ?? 0} documents`);
    await refreshDeleted();
  }

  async function handleRestoreFolder(folder: DeletedFolder) {
    const result = await restoreFolderAction(projectId, folder.id);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Folder restored");
    await Promise.all([refresh(), refreshDeleted(), refreshDeletedFolders()]);
    setViewMode("active");
  }

  async function handlePermanentDeleteFolder(folder: DeletedFolder) {
    const result = await permanentlyDeleteFolderAction(projectId, folder.id);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Folder permanently deleted");
    await refreshDeletedFolders();
  }

  function handleExportAuditCsv() {
    window.open(`/api/projects/${projectId}/audit/export`, "_blank", "noopener,noreferrer");
  }

  function handleDownload(doc: DataRoomDocument) {
    window.open(`/api/documents/${doc.id}?download=1`, "_blank", "noopener,noreferrer");
  }

  function handleExportCsv() {
    const csv = exportDocumentsCsv(visibleDocuments);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-room-${projectId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBulkDownloadZip() {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : visibleDocuments.map((d) => d.id);
    if (ids.length === 0) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/documents/download-zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ids }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message: string } };
        throw new Error(json.error?.message ?? "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-room-${projectId.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${ids.length} file${ids.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function handleMoveDocumentToFolder(documentId: string, folderId: string | null) {
    const result = await updateDocumentAction(projectId, documentId, { folderId });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Document moved");
    await refresh();
  }

  async function handleDropFilesOnFolder(folderId: string | null, files: File[]) {
    if (!canUpload || files.length === 0) return;
    await uploadFiles(
      files.map((file) => ({ file })),
      { folderId },
    );
  }

  async function handleUploadFromDropzone(entries: Parameters<typeof uploadFiles>[0]) {
    await uploadFiles(entries);
  }

  const gridClass = cn(
    "grid min-h-0 flex-1 gap-3",
    folderPanelOpen && previewPanelOpen && "lg:grid-cols-[220px_minmax(0,1fr)_minmax(280px,340px)]",
    folderPanelOpen && !previewPanelOpen && "lg:grid-cols-[220px_minmax(0,1fr)]",
    !folderPanelOpen && previewPanelOpen && "lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]",
    !folderPanelOpen && !previewPanelOpen && "grid-cols-1",
  );

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Data Room</h1>
          <p className="text-sm text-muted-foreground">
            Organize diligence files with folders, versions, and previews.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageDeleted && viewMode === "active" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
              >
                <Link2 className="size-4" />
                Share
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportAuditCsv}
              >
                <ClipboardList className="size-4" />
                Audit log
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (viewMode === "deleted") {
                if (deletedTab === "folders") {
                  void refreshDeletedFolders();
                } else {
                  void refreshDeleted();
                }
              } else {
                startTransition(() => void refresh());
              }
            }}
            disabled={loading || deletedLoading || deletedFoldersLoading}
          >
            <RefreshCw
              className={cn(
                "size-4",
                (loading || deletedLoading || deletedFoldersLoading) && "animate-spin",
              )}
            />
            Refresh
          </Button>
          {canUpload && viewMode === "active" && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setReplaceDocumentId(null);
                setUploadOpen(true);
              }}
            >
              <Upload className="size-4" />
              Upload
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-border/50 bg-card/30 p-1">
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            viewMode === "active"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setViewMode("active")}
        >
          Files
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            viewMode === "deleted"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => {
            setViewMode("deleted");
            void refreshDeleted();
            void refreshDeletedFolders();
          }}
        >
          <Archive className="size-3.5" aria-hidden />
          Deleted
          {(deletedDocuments.length > 0 || deletedFolders.length > 0) && (
            <span className="rounded-full bg-background/20 px-1.5 text-[10px] tabular-nums">
              {deletedDocuments.length + deletedFolders.length}
            </span>
          )}
        </button>
      </div>

      {viewMode === "active" && (
        <>
          <WorkerSetupBanner
            visible={
              workerMode &&
              (processingSummary?.active ?? 0) > 0 &&
              (processingSummary?.pending ?? 0) > 0
            }
          />
          <ProcessingStatusBar summary={processingSummary} loading={processingLoading} />
          <ProcessingQueuePanel
            summary={processingSummary}
            loading={processingLoading}
            canUpload={canUpload}
            onReprocess={(documentId) => {
              void reprocessDocumentAction(projectId, documentId).then((result) => {
                if (!result.success) {
                  toast.error(result.error.message);
                  return;
                }
                toast.success("Queued for reprocessing");
                void refresh();
              });
            }}
          />
        </>
      )}

      {viewMode === "active" && (
        <>
      <DataRoomChecklist documents={documents} />

      <DataRoomToolbar
        stats={stats}
        query={query}
        onQueryChange={setQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        classificationFilter={classificationFilter}
        onClassificationFilterChange={setClassificationFilter}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        availableTags={availableTags}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSortChange={handleSort}
        selectedCount={selectedIds.size}
        canDelete={canDelete}
        canUpload={canUpload}
        onBulkDelete={
          canDelete
            ? () => setDeleteTarget({ type: "bulk", count: selectedIds.size })
            : undefined
        }
        onBulkReprocess={
          canUpload
            ? () => {
                void bulkReprocessDocumentsAction(projectId, {
                  documentIds: Array.from(selectedIds),
                }).then((result) => {
                  if (!result.success) {
                    toast.error(result.error.message);
                    return;
                  }
                  toast.success(`Queued ${result.data?.updated ?? 0} documents`);
                  void refresh();
                });
              }
            : undefined
        }
        onBulkDownloadZip={handleBulkDownloadZip}
        onRetryFailed={canUpload ? () => void handleRetryFailed() : undefined}
        onApplyBulkClassification={
          canUpload && selectedIds.size > 0
            ? (classification) => void handleBulkClassification(classification)
            : undefined
        }
        onExportCsv={handleExportCsv}
        folderPanelOpen={folderPanelOpen}
        previewPanelOpen={previewPanelOpen}
        onToggleFolderPanel={() => setFolderPanelOpen((v) => !v)}
        onTogglePreviewPanel={() => setPreviewPanelOpen((v) => !v)}
        breadcrumb={breadcrumb}
      />

      {error && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <p>{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      )}

      <div className={gridClass}>
        {folderPanelOpen && (
          <div className="min-h-[320px] overflow-hidden rounded-xl border border-border/60 bg-card/30 p-3 lg:min-h-0">
            <FolderTree
              tree={tree}
              selectedFolderId={selectedFolderId}
              folderDocumentCounts={folderDocumentCounts}
              rootDocumentCount={rootDocumentCount}
              onSelect={setSelectedFolderId}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={
                canUpload
                  ? (folderId, name) => setRenameFolder({ id: folderId, name })
                  : undefined
              }
              onDeleteFolder={canDelete ? (id) => {
                const folder = flattenFolders(tree).find((f) => f.id === id);
                setDeleteTarget({ type: "folder", folderId: id, name: folder?.name ?? "folder" });
              } : undefined}
              onDropFiles={canUpload ? handleDropFilesOnFolder : undefined}
              onMoveDocument={canUpload ? handleMoveDocumentToFolder : undefined}
              canUpload={canUpload}
              canDelete={canDelete}
            />
          </div>
        )}

        <div
          ref={tableRef}
          tabIndex={-1}
          className="min-h-[320px] min-w-0 overflow-auto rounded-xl border border-border/60 bg-card/20 p-3 outline-none lg:min-h-0"
        >
          {loading && documents.length === 0 ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading documents">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted/40" />
              ))}
            </div>
          ) : visibleDocuments.length === 0 ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 px-6 text-center">
              <FolderOpen className="size-12 text-muted-foreground/40" aria-hidden />
              <div>
                <p className="text-base font-medium">
                  {documents.length === 0 ? "Upload your first document" : "No documents match filters"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Drag and drop PDFs, spreadsheets, or text files to get started.
                </p>
              </div>
              {canUpload && documents.length === 0 && (
                <Button
                  type="button"
                  onClick={() => {
                    setReplaceDocumentId(null);
                    setUploadOpen(true);
                  }}
                >
                  <Upload className="size-4" />
                  Upload documents
                </Button>
              )}
            </div>
          ) : (
            <DocumentTable
              documents={visibleDocuments}
              selectedId={selectedDoc?.id ?? null}
              selectedIds={selectedIds}
              focusedIndex={focusedIndex}
              duplicateOf={duplicateOf}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              onSelect={(doc) => {
                setSelectedDoc(doc);
                setFocusedIndex(visibleDocuments.findIndex((d) => d.id === doc.id));
                setPreviewOpenMobile(true);
                setPreviewPanelOpen(true);
              }}
              onExpand={(doc) => {
                setSelectedDoc(doc);
                setPreviewModalOpen(true);
              }}
              draggable
              onToggleSelect={(doc, selected) => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (selected) next.add(doc.id);
                  else next.delete(doc.id);
                  return next;
                });
              }}
              onToggleSelectAll={(selected) => {
                setSelectedIds(
                  selected ? new Set(visibleDocuments.map((d) => d.id)) : new Set(),
                );
              }}
              onDownload={handleDownload}
              onVersions={setVersionsDoc}
              onReprocess={(doc) => {
                void reprocessDocumentAction(projectId, doc.id).then((result) => {
                  if (!result.success) {
                    toast.error(result.error.message);
                    return;
                  }
                  toast.success("Queued for reprocessing");
                  void refresh();
                });
              }}
              onMove={canUpload ? setMoveDoc : undefined}
              onRename={canUpload ? setRenameDoc : undefined}
              onDelete={
                canDelete
                  ? (doc) => setDeleteTarget({ type: "document", doc })
                  : undefined
              }
              onViewDuplicateOriginal={handleViewDuplicateOriginal}
              onDismissDuplicate={canUpload ? handleDismissDuplicate : undefined}
              onMarkIntentionalDuplicate={canUpload ? handleMarkIntentionalDuplicate : undefined}
              canDelete={canDelete}
              canUpload={canUpload}
            />
          )}
        </div>

        {previewPanelOpen && (
          <div
            className={cn(
              "min-h-[320px] min-w-0 lg:min-h-0",
              previewOpenMobile && selectedDoc
                ? "fixed inset-x-3 bottom-3 top-24 z-40 lg:static lg:inset-auto lg:z-auto"
                : "hidden lg:block",
            )}
          >
            <DocumentPreview
              document={selectedDoc}
              canEditTags={canEdit && canUpload}
              canEdit={canEdit && canUpload}
              highlightText={previewHighlight}
              onExpand={() => setPreviewModalOpen(true)}
              onClose={() => {
                setSelectedDoc(null);
                setPreviewOpenMobile(false);
              }}
              onDownload={handleDownload}
              onTagsChange={async (doc, tags) => {
                const result = await updateDocumentTagsAction(projectId, doc.id, { tags });
                if (!result.success) {
                  toast.error(result.error.message);
                  return;
                }
                toast.success("Tags updated");
                await refresh();
              }}
              onClassificationChange={async (doc, classification) => {
                const result = await updateDocumentAction(projectId, doc.id, { classification });
                if (!result.success) {
                  toast.error(result.error.message);
                  return;
                }
                toast.success("Classification updated");
                await refresh();
              }}
              onRename={async (doc, name) => {
                const result = await updateDocumentAction(projectId, doc.id, { name });
                if (!result.success) {
                  toast.error(result.error.message);
                  return;
                }
                toast.success("Document renamed");
                await refresh();
              }}
              onViewDuplicateOriginal={handleViewDuplicateOriginal}
              className="h-full min-h-[320px] bg-background shadow-lg lg:min-h-0 lg:bg-card/40 lg:shadow-none"
            />
          </div>
        )}
      </div>
        </>
      )}

      {viewMode === "deleted" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Items in Deleted are automatically purged after{" "}
            <strong className="text-foreground">{retentionDays} days</strong>.
          </p>

          <div className="flex gap-1 rounded-lg border border-border/50 bg-card/20 p-1">
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                deletedTab === "files"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setDeletedTab("files")}
            >
              Files
              {deletedDocuments.length > 0 && (
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-[10px] tabular-nums">
                  {deletedDocuments.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                deletedTab === "folders"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setDeletedTab("folders")}
            >
              <FolderOpen className="size-3.5" aria-hidden />
              Folders
              {deletedFolders.length > 0 && (
                <span className="rounded-full bg-background/20 px-1.5 text-[10px] tabular-nums">
                  {deletedFolders.length}
                </span>
              )}
            </button>
          </div>

          {deletedTab === "files" ? (
            <DeletedDocumentsPanel
              documents={deletedDocuments}
              selectedIds={deletedSelectedIds}
              canManage={canManageDeleted}
              loading={deletedLoading}
              onToggleSelect={(doc, selected) => {
                setDeletedSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (selected) next.add(doc.id);
                  else next.delete(doc.id);
                  return next;
                });
              }}
              onToggleSelectAll={(selected) => {
                setDeletedSelectedIds(
                  selected ? new Set(deletedDocuments.map((d) => d.id)) : new Set(),
                );
              }}
              onRestore={(doc) => void handleRestoreDocument(doc)}
              onPermanentDelete={(doc) => void handlePermanentDelete(doc)}
              onBulkRestore={
                canManageDeleted && deletedSelectedIds.size > 0
                  ? () => void handleBulkRestoreDeleted()
                  : undefined
              }
              onBulkPermanentDelete={
                canManageDeleted && deletedSelectedIds.size > 0
                  ? () => void handleBulkPermanentDelete()
                  : undefined
              }
            />
          ) : (
            <DeletedFoldersPanel
              folders={deletedFolders}
              canManage={canManageDeleted}
              loading={deletedFoldersLoading}
              onRestore={(folder) => void handleRestoreFolder(folder)}
              onPermanentDelete={(folder) => void handlePermanentDeleteFolder(folder)}
            />
          )}
        </div>
      )}

      <ShareLinksDialog
        projectId={projectId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      <UploadDropzone
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        replaceDocumentId={replaceDocumentId}
        preserveStructure={preserveStructure}
        onPreserveStructureChange={setPreserveStructure}
        onUploadFiles={handleUploadFromDropzone}
      />

      <UploadTray
        items={uploadTrayItems}
        onDismiss={() => setUploadTrayItems([])}
        onCancel={cancelUpload}
        onRetry={(id) => void retryUpload(id)}
      />

      <VersionHistoryDialog
        document={versionsDoc}
        open={Boolean(versionsDoc)}
        onOpenChange={(open) => {
          if (!open) setVersionsDoc(null);
        }}
        onUploadNewVersion={(doc) => {
          setReplaceDocumentId(doc.id);
          setUploadOpen(true);
        }}
        onCompare={(doc) => {
          setVersionsDoc(null);
          setCompareDoc(doc);
        }}
      />

      <VersionCompareDialog
        document={compareDoc}
        open={Boolean(compareDoc)}
        onOpenChange={(open) => {
          if (!open) setCompareDoc(null);
        }}
      />

      <MoveDocumentDialog
        open={Boolean(moveDoc)}
        onOpenChange={(open) => {
          if (!open) setMoveDoc(null);
        }}
        documentName={moveDoc?.name ?? ""}
        tree={tree}
        currentFolderId={moveDoc?.folderId ?? null}
        onMove={async (folderId) => {
          if (!moveDoc) return;
          const result = await updateDocumentAction(projectId, moveDoc.id, { folderId });
          if (!result.success) {
            toast.error(result.error.message);
            return;
          }
          toast.success("Document moved");
          await refresh();
        }}
      />

      <RenameFolderDialog
        open={Boolean(renameFolder)}
        onOpenChange={(open) => {
          if (!open) setRenameFolder(null);
        }}
        folderName={renameFolder?.name ?? ""}
        onRename={handleRenameFolder}
      />

      <Dialog open={Boolean(renameDoc)} onOpenChange={(open) => !open && setRenameDoc(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename document</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDocName || renameDoc?.name || ""}
            onChange={(e) => setRenameDocName(e.target.value)}
            aria-label="Document name"
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameDoc) {
                void updateDocumentAction(projectId, renameDoc.id, {
                  name: renameDocName.trim() || renameDoc.name,
                }).then((result) => {
                  if (!result.success) {
                    toast.error(result.error.message);
                    return;
                  }
                  toast.success("Document renamed");
                  setRenameDoc(null);
                  void refresh();
                });
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRenameDoc(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!renameDoc) return;
                void updateDocumentAction(projectId, renameDoc.id, {
                  name: renameDocName.trim() || renameDoc.name,
                }).then((result) => {
                  if (!result.success) {
                    toast.error(result.error.message);
                    return;
                  }
                  toast.success("Document renamed");
                  setRenameDoc(null);
                  void refresh();
                });
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={
          deleteTarget?.type === "folder"
            ? "Delete folder?"
            : deleteTarget?.type === "bulk"
              ? `Delete ${deleteTarget.count} documents?`
              : "Delete document?"
        }
        description={
          deleteTarget?.type === "folder"
            ? `Delete “${deleteTarget.name}” and its contents? They will move to Deleted.`
            : deleteTarget?.type === "bulk"
              ? "Selected documents will move to the Deleted tab. Admins can restore them later."
              : `Move “${deleteTarget?.type === "document" ? deleteTarget.doc.name : ""}” to Deleted?`
        }
        confirmLabel={deleteTarget?.type === "folder" ? "Delete" : "Move to Deleted"}
        variant="destructive"
        onConfirm={() => void confirmDelete()}
      />

      <DocumentPreviewModal
        document={selectedDoc}
        open={previewModalOpen && Boolean(selectedDoc)}
        onOpenChange={setPreviewModalOpen}
        highlightText={previewHighlight}
        canEdit={canEdit && canUpload}
        canEditTags={canEdit && canUpload}
        canDelete={canDelete}
        canUpload={canUpload}
        onDownload={handleDownload}
        onTagsChange={async (doc, tags) => {
          const result = await updateDocumentTagsAction(projectId, doc.id, { tags });
          if (!result.success) {
            toast.error(result.error.message);
            return;
          }
          toast.success("Tags updated");
          await refresh();
        }}
        onClassificationChange={async (doc, classification) => {
          const result = await updateDocumentAction(projectId, doc.id, { classification });
          if (!result.success) {
            toast.error(result.error.message);
            return;
          }
          toast.success("Classification updated");
          await refresh();
        }}
        onRename={async (doc, name) => {
          const result = await updateDocumentAction(projectId, doc.id, { name });
          if (!result.success) {
            toast.error(result.error.message);
            return;
          }
          toast.success("Document renamed");
          await refresh();
        }}
        onReprocess={(doc) => {
          void reprocessDocumentAction(projectId, doc.id).then((result) => {
            if (!result.success) {
              toast.error(result.error.message);
              return;
            }
            toast.success("Queued for reprocessing");
            void refresh();
          });
        }}
        onVersions={(doc) => {
          setPreviewModalOpen(false);
          setVersionsDoc(doc);
        }}
        onMove={
          canUpload
            ? (doc) => {
                setPreviewModalOpen(false);
                setMoveDoc(doc);
              }
            : undefined
        }
        onDelete={
          canDelete
            ? (doc) => {
                setPreviewModalOpen(false);
                setDeleteTarget({ type: "document", doc });
              }
            : undefined
        }
      />
    </div>
  );
}
