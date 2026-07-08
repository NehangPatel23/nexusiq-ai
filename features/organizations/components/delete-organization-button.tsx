"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteOrganizationAction } from "@/features/organizations/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

  return (
    <>
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        Delete organization
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${orgName}?`}
        description="This permanently deletes the organization, its teams, members, and pending invitations. This cannot be undone."
        confirmLabel="Confirm delete"
        cancelLabel="Cancel"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
