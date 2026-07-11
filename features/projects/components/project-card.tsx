"use client";

import type { ProjectType } from "@prisma/client";
import {
  AlertCircle,
  Building2,
  FileStack,
  FolderKanban,
  Layers,
  Pin,
} from "lucide-react";
import Link from "next/link";

import { DeleteProjectButton } from "@/features/projects/components/delete-project-button";
import { ProjectCardMenu } from "@/features/projects/components/project-card-menu";
import { ProjectTypeBadge } from "@/features/projects/components/project-type-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ProjectType;
  targetCompany: string | null;
  dealStatus: string | null;
  pinned: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  documentCount?: number;
  workspace: {
    id: string;
    name: string;
    organization: { id: string; name: string };
  };
}

export interface DeletedProjectListItem extends ProjectListItem {
  deletedAt: Date | string;
}

interface ProjectCardProps {
  project: ProjectListItem;
  viewMode?: "grid" | "list";
  canDelete?: boolean;
  canEdit?: boolean;
  processingPercent?: number;
  documentCount?: number;
  riskScore?: string | number | null;
  bulkMode?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
}

export function ProjectCard({
  project,
  viewMode = "grid",
  canDelete = false,
  canEdit = true,
  processingPercent = 0,
  documentCount = 0,
  riskScore = null,
  bulkMode = false,
  selected = false,
  onSelectChange,
}: ProjectCardProps) {
  const isList = viewMode === "list";

  return (
    <Card
      className={cn(
        "group relative flex h-full min-h-[280px] overflow-hidden border-border/60 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/60 hover:shadow-soft",
        isList && "min-h-0 flex-row items-stretch",
        selected && "border-primary/50 ring-1 ring-primary/30",
        project.pinned && "border-primary/20",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />

      {project.pinned && (
        <div className="absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <Pin className="h-3 w-3 text-primary" aria-hidden="true" />
          <span className="sr-only">Pinned project</span>
        </div>
      )}

      <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5">
        {bulkMode && onSelectChange && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectChange(checked === true)}
            aria-label={`Select ${project.name}`}
            className="mr-1 border-border/80 bg-background/80"
          />
        )}
        <ProjectCardMenu
          projectId={project.id}
          projectName={project.name}
          pinned={project.pinned}
          canEdit={canEdit}
        />
        {canDelete && (
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
        )}
      </div>

      <Link
        href={`/dashboard/projects/${project.id}`}
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isList ? "p-4 pr-24" : "p-5 pt-12",
          project.pinned && !isList && "pt-12",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ProjectTypeBadge type={project.type} />
          {project.dealStatus && (
            <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {project.dealStatus}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <h3 className="truncate font-semibold leading-tight group-hover:text-primary">
            {project.name}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {project.targetCompany ?? "No target company"}
          </p>
        </div>

        <p
          className={cn(
            "mt-3 line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed",
            project.description ? "text-muted-foreground" : "text-muted-foreground/40",
            isList && "hidden sm:block",
          )}
        >
          {project.description ?? "No description yet"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {project.workspace.organization.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <FolderKanban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {project.workspace.name}
          </span>
        </div>

        {!isList && processingPercent > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>Processing</span>
              <span className="tabular-nums">{processingPercent}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted/60"
              role="progressbar"
              aria-valuenow={processingPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${project.name} processing progress`}
            >
              <div
                className="h-full max-w-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-500"
                style={{ width: `${processingPercent}%` }}
              />
            </div>
          </div>
        )}

        <div
          className={cn(
            "mt-auto flex flex-wrap items-center gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground",
            isList ? "mt-3 border-t-0 pt-0" : "mt-4",
          )}
        >
          {(documentCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <FileStack className="h-3.5 w-3.5" aria-hidden="true" />
              {documentCount} doc{documentCount === 1 ? "" : "s"}
            </span>
          )}
          {riskScore != null && (
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Risk {riskScore}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            /{project.slug}
          </span>
          <span className="ml-auto" title={new Date(project.updatedAt).toLocaleString()}>
            {formatRelativeTime(project.updatedAt)}
          </span>
        </div>
      </Link>
    </Card>
  );
}
