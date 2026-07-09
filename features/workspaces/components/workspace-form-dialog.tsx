"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { createWorkspaceAction, updateWorkspaceAction } from "@/features/workspaces/actions";
import { slugifyName } from "@/features/workspaces/lib/slug";
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

export interface WorkspaceFormValues {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  teamId: string | null;
}

interface TeamOption {
  id: string;
  name: string;
}

interface WorkspaceFormDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TeamOption[];
  workspace?: WorkspaceFormValues | null;
}

export function WorkspaceFormDialog({
  orgId,
  open,
  onOpenChange,
  teams,
  workspace,
}: WorkspaceFormDialogProps) {
  const router = useRouter();
  const isEditing = !!workspace;
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setFieldErrors({});
    setSlugTouched(false);

    if (workspace) {
      setName(workspace.name);
      setSlug(workspace.slug);
      setDescription(workspace.description ?? "");
      setTeamId(workspace.teamId ?? "");
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setTeamId("");
    }
  }, [open, workspace]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched && !isEditing) {
      setSlug(slugifyName(value));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const input = {
      name,
      description: description.trim() ? description.trim() : undefined,
      slug: slug.trim() || undefined,
      teamId: teamId || null,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateWorkspaceAction(workspace!.id, input)
        : await createWorkspaceAction(orgId, input);

      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setError(result.error.message);
        }
        return;
      }

      toast.success(isEditing ? "Workspace updated" : "Workspace created");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="workspace-form-description">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit workspace" : "Create workspace"}</DialogTitle>
          <DialogDescription id="workspace-form-description">
            {isEditing
              ? "Update workspace details and optional team assignment."
              : "Add a workspace to organize projects within this organization."}
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
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              name="name"
              required
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Due diligence"
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && (
              <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-slug">Slug</Label>
            <Input
              id="workspace-slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="due-diligence"
              aria-describedby="workspace-slug-hint"
              aria-invalid={!!fieldErrors.slug}
            />
            <p id="workspace-slug-hint" className="text-xs text-muted-foreground">
              URL-safe identifier, unique within this organization.
            </p>
            {fieldErrors.slug && (
              <p className="text-sm text-destructive">{fieldErrors.slug[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-description">Description (optional)</Label>
            <textarea
              id="workspace-description"
              name="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this workspace for?"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-invalid={!!fieldErrors.description}
            />
            {fieldErrors.description && (
              <p className="text-sm text-destructive">{fieldErrors.description[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-team">Team (optional)</Label>
            <select
              id="workspace-team"
              name="teamId"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-invalid={!!fieldErrors.teamId}
            >
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            {fieldErrors.teamId && (
              <p className="text-sm text-destructive">{fieldErrors.teamId[0]}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Create workspace"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
