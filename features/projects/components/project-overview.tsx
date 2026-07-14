"use client";

import { AlertTriangle, FileQuestion, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { AgentType, ConfidenceLevel, ProjectType } from "@prisma/client";

import { ProcessingProgress } from "@/features/projects/components/processing-progress";
import { TagsInput } from "@/features/projects/components/tags-input";
import { useProjectShell } from "@/features/projects/components/project-shell-context";
import { updateProjectAction } from "@/features/projects/actions";
import { ProjectTypeBadge } from "@/features/projects/components/project-type-badge";
import { AgentScoreGauge } from "@/features/intelligence/components/agent-score-gauge";
import {
  DEFAULT_AGENTS,
  DEFAULT_AGENT_LABELS,
  type DefaultAgent,
} from "@/features/projects/lib/default-agents";
import { COMMON_DEAL_STATUSES } from "@/features/projects/lib/deal-statuses";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from "@/features/projects/lib/project-types";
import { getSnapshotDefaultAgent } from "@/features/projects/lib/project-snapshot";
import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const AGENT_LABELS: Record<AgentType, string> = {
  FINANCIAL: "Financial",
  LEGAL: "Legal",
  COMPLIANCE: "Compliance",
  RISK: "Risk",
  FRAUD: "Fraud",
  EXECUTIVE: "Executive",
};

const OVERVIEW_AGENTS: AgentType[] = ["FINANCIAL", "LEGAL", "COMPLIANCE", "RISK", "FRAUD"];

const OVERVIEW_SELECT_TRIGGER_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export type OverviewConsensusSummary = {
  id: string;
  finalRecommendation: string;
  decisionConfidence: ConfidenceLevel;
  createdAt: string;
  conflictCount: number;
  agreementCount: number;
};

type ProjectOverviewProps = {
  agentScores?: Partial<Record<AgentType, number | null>>;
  enterpriseRiskScore?: number | null;
  latestConsensus?: OverviewConsensusSummary | null;
  contradictionOpenCount?: number;
  missingOpenCount?: number;
};

function confidenceBadgeVariant(confidence: ConfidenceLevel) {
  if (confidence === "HIGH") return "secondary" as const;
  if (confidence === "MEDIUM") return "outline" as const;
  if (confidence === "LOW") return "destructive" as const;
  return "outline" as const;
}

export function ProjectOverview({
  agentScores = {},
  enterpriseRiskScore = null,
  latestConsensus = null,
  contradictionOpenCount = 0,
  missingOpenCount = 0,
}: ProjectOverviewProps) {
  const { project, setProject, canEdit } = useProjectShell();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [type, setType] = useState(project.type);
  const [targetCompany, setTargetCompany] = useState(project.targetCompany ?? "");
  const [dealStatus, setDealStatus] = useState(project.dealStatus ?? "");
  const [tags, setTags] = useState(project.tags);
  const [defaultAgent, setDefaultAgent] = useState<DefaultAgent | "">(
    getSnapshotDefaultAgent(project) ?? "",
  );
  const [isPending, startTransition] = useTransition();

  function resetFormFromProject() {
    setName(project.name);
    setDescription(project.description ?? "");
    setType(project.type);
    setTargetCompany(project.targetCompany ?? "");
    setDealStatus(project.dealStatus ?? "");
    setTags(project.tags);
    setDefaultAgent(getSnapshotDefaultAgent(project) ?? "");
  }

  function handleStartEditing() {
    resetFormFromProject();
    setEditing(true);
  }

  function handleCancelEditing() {
    resetFormFromProject();
    setEditing(false);
  }

  function handleSave() {
    startTransition(async () => {
      const payload = {
        name,
        description: description.trim() ? description.trim() : null,
        type,
        targetCompany: targetCompany.trim() ? targetCompany.trim() : null,
        dealStatus: dealStatus.trim() ? dealStatus.trim() : null,
        tags,
        defaultAgent: defaultAgent || null,
      };

      const result = await updateProjectAction(project.id, payload);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      if (result.data?.project) {
        setProject(result.data.project);
      }

      toast.success("Project updated");
      setEditing(false);
    });
  }

  const displayDefaultAgent = getSnapshotDefaultAgent(project);
  const consensusHref = `/dashboard/projects/${project.id}/intelligence?tab=consensus${
    latestConsensus ? `&consensus=${latestConsensus.id}` : ""
  }`;

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
            <Button variant="outline" size="sm" onClick={handleStartEditing}>
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
                  <AppSelect
                    id="overview-type"
                    value={type}
                    onValueChange={(value) => setType(value as ProjectType)}
                    triggerClassName={OVERVIEW_SELECT_TRIGGER_CLASS}
                    options={PROJECT_TYPES.map((projectType) => ({
                      value: projectType,
                      label: PROJECT_TYPE_LABELS[projectType],
                    }))}
                  />
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
                  <AppSelect
                    id="overview-default-agent"
                    value={defaultAgent}
                    onValueChange={(value) => setDefaultAgent(value as DefaultAgent | "")}
                    triggerClassName={OVERVIEW_SELECT_TRIGGER_CLASS}
                    options={[
                      { value: "", label: "No default — choose per session" },
                      ...DEFAULT_AGENTS.map((agent) => ({
                        value: agent,
                        label: DEFAULT_AGENT_LABELS[agent],
                      })),
                    ]}
                  />
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
                <Button type="button" variant="outline" onClick={handleCancelEditing}>
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

      <Card className="border-border/60 bg-card/40">
        <CardContent className="p-6">
          <AgentScoreGauge
            score={enterpriseRiskScore}
            label="Enterprise risk"
            description="Composite score from the latest Risk agent assessment"
          />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40">
        <CardHeader>
          <CardTitle className="text-base">Diligence gaps</CardTitle>
          <CardDescription>
            Cross-document conflicts and outstanding checklist items
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`/dashboard/projects/${project.id}/contradictions`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle
                className={cn(
                  "h-4 w-4",
                  contradictionOpenCount > 0 ? "text-rose-400" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              <span className="text-sm font-medium">Contradictions</span>
            </div>
            <span className="font-display text-lg font-semibold tabular-nums">
              {contradictionOpenCount}
            </span>
          </Link>
          <Link
            href={`/dashboard/projects/${project.id}/missing`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex items-center gap-2.5">
              <FileQuestion
                className={cn(
                  "h-4 w-4",
                  missingOpenCount > 0 ? "text-amber-400" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              <span className="text-sm font-medium">Missing info</span>
            </div>
            <span className="font-display text-lg font-semibold tabular-nums">
              {missingOpenCount}
            </span>
          </Link>
          {contradictionOpenCount === 0 && missingOpenCount === 0 ? (
            <p className="col-span-full flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              No open diligence gaps detected yet.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">Agent scores</h3>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/projects/${project.id}/intelligence`}>Open intelligence</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {OVERVIEW_AGENTS.map((agent) => {
            const score = agentScores[agent];
            return (
              <Card key={agent} className="border-border/60 bg-card/40">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{AGENT_LABELS[agent]}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {score === null || score === undefined ? "—" : Math.round(score)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card
        className={
          latestConsensus
            ? "border-primary/20 bg-primary/5"
            : "border-dashed border-border/60 bg-transparent"
        }
      >
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Consensus recommendation</CardTitle>
            <CardDescription>
              {latestConsensus
                ? `Synthesized ${new Date(latestConsensus.createdAt).toLocaleString()}`
                : "Run intelligence agents to generate a consensus recommendation with cited evidence."}
            </CardDescription>
          </div>
          {latestConsensus ? (
            <Badge variant={confidenceBadgeVariant(latestConsensus.decisionConfidence)}>
              {latestConsensus.decisionConfidence}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {latestConsensus ? (
            <>
              <p className="text-sm leading-6 text-foreground/90">{latestConsensus.finalRecommendation}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{latestConsensus.agreementCount} agreement(s)</span>
                <span>{latestConsensus.conflictCount} conflict(s)</span>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href={consensusHref}>View full consensus</Link>
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No consensus run yet. Run specialists from the Intelligence tab, then Consensus or Full
                analysis.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/projects/${project.id}/intelligence?tab=consensus`}>
                  Open Consensus tab
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
