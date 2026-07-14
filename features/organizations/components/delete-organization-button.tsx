"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteOrganizationAction,
  restoreOrganizationAction,
} from "@/features/organizations/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DeleteOrganizationButtonProps {
  orgId: string;
  orgName: string;
  /** When set, show restore UI instead of delete. */
  tombstoned?: boolean;
  purgeAfterIso?: string | null;
}

export function DeleteOrganizationButton({
  orgId,
  orgName,
  tombstoned = false,
  purgeAfterIso,
}: DeleteOrganizationButtonProps) {
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
      toast.success("Organization deactivated — permanently removed after 24 hours");
      router.push("/dashboard/organizations");
      router.refresh();
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreOrganizationAction(orgId);
      if (result && !result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Organization restored");
      router.refresh();
    });
  }

  if (tombstoned) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          This organization is deactivated
          {purgeAfterIso
            ? ` and will be permanently removed after ${new Date(purgeAfterIso).toLocaleString()}.`
            : "."}
        </p>
        <Button onClick={handleRestore} disabled={isPending}>
          {isPending ? "Restoring…" : "Restore organization"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        Delete organization
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${orgName}?`}
        description="The organization is deactivated immediately and permanently removed after 24 hours. You can restore it from this page during the grace period."
        confirmLabel="Deactivate organization"
        cancelLabel="Cancel"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
