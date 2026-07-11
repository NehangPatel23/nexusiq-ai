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
import { Input } from "@/components/ui/input";

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  onRename: (name: string) => Promise<void>;
}

export function RenameFolderDialog({
  open,
  onOpenChange,
  folderName,
  onRename,
}: RenameFolderDialogProps) {
  const [name, setName] = useState(folderName);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName(folderName);
  }, [open, folderName]);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === folderName) {
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      await onRename(trimmed);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename folder</DialogTitle>
          <DialogDescription>Enter a new name for “{folderName}”</DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Folder name"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSubmit();
          }}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleSubmit()}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
