"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createOrganizationAction } from "@/features/organizations/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectToSettings?: boolean;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  redirectToSettings = false,
}: CreateOrganizationDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const input = {
      name: formData.get("name"),
      description: formData.get("description") || undefined,
    };

    startTransition(async () => {
      const result = await createOrganizationAction(input);
      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setError(result.error.message);
        }
        return;
      }

      toast.success("Organization created");
      onOpenChange(false);
      router.refresh();

      if (redirectToSettings && result.data?.id) {
        router.push(`/dashboard/organizations/${result.data.id}/settings`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="create-org-description">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription id="create-org-description">
            Set up a new organization for your team. You will be assigned as the owner.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              name="name"
              required
              placeholder="Acme Corp"
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-description">Description (optional)</Label>
            <textarea
              id="org-description"
              name="description"
              rows={3}
              placeholder="What does this organization do?"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-invalid={!!fieldErrors.description}
            />
            {fieldErrors.description && (
              <p className="text-sm text-destructive">{fieldErrors.description[0]}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
