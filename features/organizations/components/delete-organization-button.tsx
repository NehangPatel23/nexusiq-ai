"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteOrganizationAction } from "@/features/organizations/actions";
import { Button } from "@/components/ui/button";

interface DeleteOrganizationButtonProps {
  orgId: string;
  orgName: string;
}

export function DeleteOrganizationButton({ orgId, orgName }: DeleteOrganizationButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOrganizationAction(orgId);
      if (result && !result.success) {
        toast.error(result.error.message);
        setConfirmOpen(false);
        return;
      }
      toast.success("Organization deleted");
      router.push("/dashboard/organizations");
      router.refresh();
    });
  }

  if (!confirmOpen) {
    return (
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        Delete organization
      </Button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby="delete-org-title"
      aria-describedby="delete-org-description"
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
    >
      <h3 id="delete-org-title" className="font-semibold text-destructive">
        Delete {orgName}?
      </h3>
      <p id="delete-org-description" className="mt-2 text-sm text-muted-foreground">
        This will soft-delete the organization. Members will lose access. This action cannot be
        undone from the UI.
      </p>
      <div className="mt-4 flex gap-3">
        <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
          {isPending ? "Deleting…" : "Confirm delete"}
        </Button>
      </div>
    </div>
  );
}
