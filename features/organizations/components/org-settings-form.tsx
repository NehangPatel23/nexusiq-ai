"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOrganizationAction } from "@/features/organizations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrgSettingsFormProps {
  orgId: string;
  name: string;
  description: string | null;
  canEdit: boolean;
}

export function OrgSettingsForm({ orgId, name, description, canEdit }: OrgSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;

    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const input = {
      name: formData.get("name"),
      description: (formData.get("description") as string) || null,
    };

    startTransition(async () => {
      const result = await updateOrganizationAction(orgId, input);
      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setError(result.error.message);
        }
        return;
      }

      toast.success("Organization updated");
      router.refresh();
    });
  }

  return (
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
        <Label htmlFor="settings-org-name">Organization name</Label>
        <Input
          id="settings-org-name"
          name="name"
          defaultValue={name}
          required
          disabled={!canEdit || isPending}
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-org-description">Description</Label>
        <textarea
          id="settings-org-description"
          name="description"
          rows={3}
          defaultValue={description ?? ""}
          disabled={!canEdit || isPending}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-invalid={!!fieldErrors.description}
        />
        {fieldErrors.description && (
          <p className="text-sm text-destructive">{fieldErrors.description[0]}</p>
        )}
      </div>

      {canEdit && (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      )}
    </form>
  );
}
