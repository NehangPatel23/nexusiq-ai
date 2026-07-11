"use client";

import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { DataRoomFolderNode } from "../lib/types";

interface FolderTreeProps {
  tree: DataRoomFolderNode[];
  selectedFolderId: string | null;
  folderDocumentCounts: Record<string, number>;
  onSelect: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onRenameFolder?: (folderId: string, name: string) => void;
  onDeleteFolder?: (folderId: string) => void | Promise<void>;
  onDropFiles?: (folderId: string | null, files: File[]) => void;
  onMoveDocument?: (documentId: string, folderId: string | null) => void;
  canUpload: boolean;
  canDelete: boolean;
  rootDocumentCount?: number;
}

function FolderRow({
  node,
  depth,
  selectedFolderId,
  onSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDropFiles,
  onMoveDocument,
  canUpload,
  canDelete,
  folderDocumentCounts,
  expanded,
  onToggle,
  dropTargetId,
  onDropTarget,
}: {
  node: DataRoomFolderNode;
  depth: number;
  selectedFolderId: string | null;
  folderDocumentCounts: Record<string, number>;
  onSelect: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onRenameFolder?: (folderId: string, name: string) => void;
  onDeleteFolder?: (folderId: string) => void | Promise<void>;
  onDropFiles?: (folderId: string | null, files: File[]) => void;
  onMoveDocument?: (documentId: string, folderId: string | null) => void;
  canUpload: boolean;
  canDelete: boolean;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  dropTargetId: string | null;
  onDropTarget: (id: string | null) => void;
}) {
  const isSelected = selectedFolderId === node.id;
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const count = folderDocumentCounts[node.id] ?? 0;
  const isDropTarget = dropTargetId === node.id;

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    onDropTarget(null);

    const docId = event.dataTransfer.getData("application/x-nexusiq-document-id");
    if (docId && onMoveDocument) {
      onMoveDocument(docId, node.id);
      return;
    }

    if (onDropFiles && event.dataTransfer.files.length > 0) {
      onDropFiles(node.id, Array.from(event.dataTransfer.files));
    }
  }

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-1 py-1 text-sm transition-colors",
          isSelected ? "bg-primary/15 text-primary" : "hover:bg-secondary/60",
          isDropTarget && "ring-2 ring-primary/50 ring-offset-1 ring-offset-background",
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onDragOver={(e) => {
          if (!canUpload) return;
          e.preventDefault();
          onDropTarget(node.id);
        }}
        onDragLeave={() => onDropTarget(null)}
        onDrop={handleDrop}
      >
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          onClick={() => onToggle(node.id)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )
          ) : (
            <span className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => onSelect(node.id)}
        >
          {isExpanded || isSelected ? (
            <FolderOpen className="size-4 shrink-0 text-primary" aria-hidden />
          ) : (
            <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="truncate">{node.name}</span>
          {count > 0 && (
            <span className="ml-auto shrink-0 rounded-full bg-secondary px-1.5 text-[10px] tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </button>
        {canUpload && onRenameFolder && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Rename folder ${node.name}`}
            onClick={() => onRenameFolder(node.id, node.name)}
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
        {canDelete && onDeleteFolder && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Delete folder ${node.name}`}
            onClick={() => void onDeleteFolder(node.id)}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        )}
      </div>

      {count === 0 && !hasChildren && isSelected && canUpload && (
        <p
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground"
          style={{ paddingLeft: `${depth * 12 + 28}px` }}
        >
          <Upload className="size-3" aria-hidden />
          Drop files here to upload
        </p>
      )}

      {hasChildren && isExpanded && (
        <ul className="space-y-0.5" role="group">
          {node.children.map((child) => (
            <FolderRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onDropFiles={onDropFiles}
              onMoveDocument={onMoveDocument}
              canUpload={canUpload}
              canDelete={canDelete}
              folderDocumentCounts={folderDocumentCounts}
              expanded={expanded}
              onToggle={onToggle}
              dropTargetId={dropTargetId}
              onDropTarget={onDropTarget}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FolderTree({
  tree,
  selectedFolderId,
  folderDocumentCounts,
  onSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDropFiles,
  onMoveDocument,
  canUpload,
  canDelete,
  rootDocumentCount = 0,
}: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    const name = draftName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await onCreateFolder(name, selectedFolderId);
      setDraftName("");
      setCreating(false);
      if (selectedFolderId) {
        setExpanded((prev) => new Set(prev).add(selectedFolderId));
      }
    } finally {
      setBusy(false);
    }
  }

  function handleRootDrop(event: React.DragEvent) {
    event.preventDefault();
    setDropTargetId(null);

    const docId = event.dataTransfer.getData("application/x-nexusiq-document-id");
    if (docId && onMoveDocument) {
      onMoveDocument(docId, null);
      return;
    }

    if (onDropFiles && event.dataTransfer.files.length > 0) {
      onDropFiles(null, Array.from(event.dataTransfer.files));
    }
  }

  return (
    <nav aria-label="Folder tree" className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Folders
        </p>
        {canUpload && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="New folder"
            onClick={() => setCreating(true)}
          >
            <FolderPlus className="size-4" />
          </Button>
        )}
      </div>

      <button
        type="button"
        className={cn(
          "mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          selectedFolderId === null
            ? "bg-primary/15 text-primary"
            : "hover:bg-secondary/60",
          dropTargetId === "root" && "ring-2 ring-primary/50",
        )}
        onClick={() => onSelect(null)}
        onDragOver={(e) => {
          if (!canUpload) return;
          e.preventDefault();
          setDropTargetId("root");
        }}
        onDragLeave={() => setDropTargetId(null)}
        onDrop={handleRootDrop}
      >
        <Folder className="size-4 shrink-0" aria-hidden />
        All documents
        {rootDocumentCount > 0 && (
          <span className="ml-auto rounded-full bg-secondary px-1.5 text-[10px] tabular-nums">
            {rootDocumentCount}
          </span>
        )}
      </button>

      {creating && (
        <div className="mb-2 space-y-2 rounded-md border border-border/60 p-2">
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Folder name"
            aria-label="New folder name"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setDraftName("");
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void handleCreate()}>
              Create
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setDraftName("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {tree.length === 0 && !creating && (
        <p className="mb-2 px-1 text-xs text-muted-foreground">
          No folders yet. Create one or drop a folder when uploading.
        </p>
      )}

      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto" role="tree">
        {tree.map((node) => (
          <FolderRow
            key={node.id}
            node={node}
            depth={0}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onDropFiles={onDropFiles}
            onMoveDocument={onMoveDocument}
            canUpload={canUpload}
            canDelete={canDelete}
            folderDocumentCounts={folderDocumentCounts}
            expanded={expanded}
            onToggle={toggle}
            dropTargetId={dropTargetId}
            onDropTarget={setDropTargetId}
          />
        ))}
      </ul>
    </nav>
  );
}
