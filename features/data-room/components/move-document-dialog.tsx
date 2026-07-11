"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { DataRoomFolderNode } from "../lib/types";

interface MoveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  tree: DataRoomFolderNode[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => Promise<void>;
}

function FolderOption({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: DataRoomFolderNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = selectedId === node.id;
  return (
    <>
      <button
        type="button"
        className={cn(
          "flex w-full rounded-md px-2 py-1.5 text-left text-sm",
          selected ? "bg-primary/15 text-primary" : "hover:bg-secondary/60",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {node.name}
      </button>
      {node.children.map((child) => (
        <FolderOption
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function MoveDocumentDialog({
  open,
  onOpenChange,
  documentName,
  tree,
  currentFolderId,
  onMove,
}: MoveDocumentDialogProps) {
  const [targetFolderId, setTargetFolderId] = useState<string | null>(currentFolderId);
  const [busy, setBusy] = useState(false);

  async function handleMove() {
    setBusy(true);
    try {
      await onMove(targetFolderId);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move document</DialogTitle>
          <DialogDescription>Move “{documentName}” to a folder</DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-border/60 p-2">
          <button
            type="button"
            className={cn(
              "flex w-full rounded-md px-2 py-1.5 text-left text-sm",
              targetFolderId === null ? "bg-primary/15 text-primary" : "hover:bg-secondary/60",
            )}
            onClick={() => setTargetFolderId(null)}
          >
            Root (no folder)
          </button>
          {tree.map((node) => (
            <FolderOption
              key={node.id}
              node={node}
              depth={0}
              selectedId={targetFolderId}
              onSelect={setTargetFolderId}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleMove()}>
            Move
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
