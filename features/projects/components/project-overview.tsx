"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ProjectType } from "@prisma/client";

import { ProcessingProgress } from "@/features/projects/components/processing-progress";
import { TagsInput } from "@/features/projects/components/tags-input";
import { updateProjectAction } from "@/features/projects/actions";
import { ProjectTypeBadge } from "@/features/projects/components/project-type-badge";
import {
  DEFAULT_AGENTS,
  DEFAULT_AGENT_LABELS,
  getDefaultAgentFromMetadata,
  type DefaultAgent,
} from "@/features/projects/lib/default-agents";
import { COMMON_DEAL_STATUSES } from "@/features/projects/lib/deal-statuses";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from "@/features/projects/lib/project-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectOverviewProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    type: ProjectType;
    targetCompany: string | null;
    dealStatus: string | null;
    tags: string[];
    metadata: unknown;
    workspace: { name: string; organization: { name: string } };
  };
  canEdit: boolean;
}

const AGENT_PLACEHOLDERS = [
  { name: "Financial", score: "—" },
  { name: "Legal", score: "—" },
  { name: "Compliance", score: "—" },
  { name: "Risk", score: "—" },
  { name: "Fraud", score: "—" },
];

export function ProjectOverview({ project, canEdit }: ProjectOverviewProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [type, setType] = useState(project.type);
  const [targetCompany, setTargetCompany] = useState(project.targetCompany ?? "");
  const [dealStatus, setDealStatus] = useState(project.dealStatus ?? "");
  const [tags, setTags] = useState(project.tags);
  const [defaultAgent, setDefaultAgent] = useState<DefaultAgent | "">(
    getDefaultAgentFromMetadata(project.metadata) ?? "",
  );
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateProjectAction(project.id, {
        name,
        description: description.trim() ? description.trim() : null,
        type,
        targetCompany: targetCompany.trim() ? targetCompany.trim() : null,
        dealStatus: dealStatus.trim() ? dealStatus.trim() : null,
        tags,
        defaultAgent: defaultAgent || null,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success("Project updated");
      setEditing(false);
      router.refresh();
    });
  }

  const displayDefaultAgent = getDefaultAgentFromMetadata(project.metadata);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Deal metadata</CardTitle>
            <CardDescription>
              {project.workspace.organization.name} · {project.workspace.name}
            </CardDescription>
          </div>
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleSave();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="overview-name">Name</Label>
                  <Input
                    id="overview-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overview-type">Type</Label>
                  <select
                    id="overview-type"
                    value={type}
                    onChange={(event) => setType(event.target.value as ProjectType)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {PROJECT_TYPES.map((projectType) => (
                      <option key={projectType} value={projectType}>
                        {PROJECT_TYPE_LABELS[projectType]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overview-target">Target company</Label>
                  <Input
                    id="overview-target"
                    value={targetCompany}
                    onChange={(event) => setTargetCompany(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overview-status">Deal status</Label>
                  <Input
                    id="overview-status"
                    value={dealStatus}
                    onChange={(event) => setDealStatus(event.target.value)}
                    list="overview-deal-status-suggestions"
                    placeholder="e.g. In diligence"
                  />
                  <datalist id="overview-deal-status-suggestions">
                    {COMMON_DEAL_STATUSES.map((status) => (
                      <option key={status} value={status} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="overview-default-agent">Default agent</Label>
                  <select
                    id="overview-default-agent"
                    value={defaultAgent}
                    onChange={(event) => setDefaultAgent(event.target.value as DefaultAgent | "")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No default — choose per session</option>
                    {DEFAULT_AGENTS.map((agent) => (
                      <option key={agent} value={agent}>
                        {DEFAULT_AGENT_LABELS[agent]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="overview-tags">Tags</Label>
                <TagsInput id="overview-tags" value={tags} onChange={setTags} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overview-description">Description</Label>
                <textarea
                  id="overview-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Project name</dt>
                <dd className="font-medium">{project.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd>
                  <ProjectTypeBadge type={project.type} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Target company</dt>
                <dd className="font-medium">{project.targetCompany ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Deal status</dt>
                <dd className="font-medium">{project.dealStatus ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Default agent</dt>
                <dd className="font-medium">
                  {displayDefaultAgent ? DEFAULT_AGENT_LABELS[displayDefaultAgent] : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Tags</dt>
                <dd>
                  {project.tags.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Description</dt>
                <dd className="text-sm text-muted-foreground">{project.description ?? "—"}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Processing progress</h3>
        <ProcessingProgress
          percent={0}
          hint="Upload documents in the Data Room to begin processing."
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Agent scores</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {AGENT_PLACEHOLDERS.map((agent) => (
            <Card key={agent.name} className="border-border/60 bg-card/40">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{agent.name}</p>
                <p className="mt-1 text-2xl font-semibold">{agent.score}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-dashed border-border/60 bg-transparent">
        <CardHeader>
          <CardTitle className="text-base">Consensus recommendation</CardTitle>
          <CardDescription>
            Run intelligence agents to generate a consensus recommendation with cited evidence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No consensus run yet. Run agents from the Intelligence tab to build a recommendation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
