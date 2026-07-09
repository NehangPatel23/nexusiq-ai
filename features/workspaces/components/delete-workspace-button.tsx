"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteWorkspaceAction } from "@/features/workspaces/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DeleteWorkspaceButtonProps {
  workspaceId: string;
  workspaceName: string;
}

export function DeleteWorkspaceButton({
  workspaceId,
  workspaceName,
}: DeleteWorkspaceButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWorkspaceAction(workspaceId);
      if (!result.success) {
        toast.error(result.error.message);
        setConfirmOpen(false);
        return;
      }

      toast.success("Workspace deleted");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        aria-label={`Delete ${workspaceName}`}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${workspaceName}?`}
        description="This moves the workspace to the Deleted tab. An administrator can restore it from there or permanently remove it."
        confirmLabel="Delete workspace"
        cancelLabel="Cancel"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
