"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ProjectType } from "@prisma/client";

import { createProjectAction } from "@/features/projects/actions";
import { TagsInput } from "@/features/projects/components/tags-input";
import {
  DEFAULT_AGENTS,
  DEFAULT_AGENT_LABELS,
  type DefaultAgent,
} from "@/features/projects/lib/default-agents";
import { COMMON_DEAL_STATUSES } from "@/features/projects/lib/deal-statuses";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from "@/features/projects/lib/project-types";
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

interface WorkspaceOption {
  id: string;
  name: string;
  organizationName: string;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: WorkspaceOption[];
  defaultWorkspaceId?: string;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  workspaces,
  defaultWorkspaceId,
}: ProjectFormDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("MA");
  const [targetCompany, setTargetCompany] = useState("");
  const [dealStatus, setDealStatus] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [defaultAgent, setDefaultAgent] = useState<DefaultAgent | "">("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setFieldErrors({});
    setName("");
    setDescription("");
    setType("MA");
    setTargetCompany("");
    setDealStatus("");
    setTags([]);
    setDefaultAgent("");
    setWorkspaceId(defaultWorkspaceId ?? workspaces[0]?.id ?? "");
  }, [open, defaultWorkspaceId, workspaces]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!workspaceId) {
      setError("Select a workspace for this project");
      return;
    }

    const input = {
      name,
      description: description.trim() ? description.trim() : undefined,
      type,
      targetCompany: targetCompany.trim() ? targetCompany.trim() : undefined,
      dealStatus: dealStatus.trim() ? dealStatus.trim() : undefined,
      tags: tags.length > 0 ? tags : undefined,
      defaultAgent: defaultAgent || undefined,
    };

    startTransition(async () => {
      const result = await createProjectAction(workspaceId, input);
      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        }
        setError(result.error.message);
        return;
      }

      toast.success("Project created");
      onOpenChange(false);
      router.refresh();
      if (result.data?.id) {
        router.push(`/dashboard/projects/${result.data.id}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Start a new diligence project in a workspace. You can upload documents and run agents
            after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Corp Acquisition"
              required
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "project-name-error" : undefined}
            />
            {fieldErrors.name && (
              <p id="project-name-error" className="text-sm text-destructive">
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-type">Type</Label>
            <select
              id="project-type"
              value={type}
              onChange={(event) => setType(event.target.value as ProjectType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-invalid={!!fieldErrors.type}
            >
              {PROJECT_TYPES.map((projectType) => (
                <option key={projectType} value={projectType}>
                  {PROJECT_TYPE_LABELS[projectType]}
                </option>
              ))}
            </select>
            {fieldErrors.type && (
              <p className="text-sm text-destructive">{fieldErrors.type[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-workspace">Workspace</Label>
            <select
              id="project-workspace"
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              {workspaces.length === 0 ? (
                <option value="">No workspaces available</option>
              ) : (
                workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.organizationName})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-target">Target company (optional)</Label>
            <Input
              id="project-target"
              value={targetCompany}
              onChange={(event) => setTargetCompany(event.target.value)}
              placeholder="Acme Corporation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-deal-status">Deal status (optional)</Label>
            <Input
              id="project-deal-status"
              value={dealStatus}
              onChange={(event) => setDealStatus(event.target.value)}
              list="project-deal-status-suggestions"
              placeholder="e.g. In diligence"
            />
            <datalist id="project-deal-status-suggestions">
              {COMMON_DEAL_STATUSES.map((status) => (
                <option key={status} value={status} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-default-agent">Default agent (optional)</Label>
            <select
              id="project-default-agent"
              value={defaultAgent}
              onChange={(event) => setDefaultAgent(event.target.value as DefaultAgent | "")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">No default — choose per session</option>
              {DEFAULT_AGENTS.map((agent) => (
                <option key={agent} value={agent}>
                  {DEFAULT_AGENT_LABELS[agent]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-tags">Tags (optional)</Label>
            <TagsInput id="project-tags" value={tags} onChange={setTags} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description (optional)</Label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Brief context for this diligence engagement"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || workspaces.length === 0}>
              {isPending ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
