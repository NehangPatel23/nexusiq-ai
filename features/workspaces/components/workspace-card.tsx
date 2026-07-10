"use client";

import {
  ArrowRight,
  FolderKanban,
  Layers,
  Pencil,
  Users,
} from "lucide-react";
import Link from "next/link";

import { DeleteWorkspaceButton } from "@/features/workspaces/components/delete-workspace-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { WorkspaceListItem } from "./workspaces-list";

interface WorkspaceCardProps {
  workspace: WorkspaceListItem;
  projectCount?: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
}

export function WorkspaceCard({
  workspace,
  projectCount = 0,
  canEdit,
  canDelete,
  onEdit,
}: WorkspaceCardProps) {
  return (
    <Card className="group relative flex h-full min-h-[260px] flex-col overflow-hidden border-border/60 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/60 hover:shadow-soft">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/8 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />

      {canDelete && (
        <div className="absolute right-3 top-3 z-10">
          <DeleteWorkspaceButton workspaceId={workspace.id} workspaceName={workspace.name} />
        </div>
      )}

      <div className="relative flex flex-1 flex-col p-5 pt-5">
        <div className="flex items-start gap-3 pr-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 shadow-inner-soft">
            <FolderKanban className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate font-semibold leading-tight group-hover:text-primary">
              {workspace.name}
            </h3>
            <p className="truncate font-mono text-xs text-muted-foreground">/{workspace.slug}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {workspace.team && (
            <Badge
              variant="outline"
              className="border-blue-500/30 bg-blue-500/10 text-[10px] font-medium uppercase tracking-wide text-blue-300"
            >
              <Users className="mr-1 h-3 w-3" aria-hidden="true" />
              {workspace.team.name}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] font-medium tabular-nums">
            {projectCount} project{projectCount === 1 ? "" : "s"}
          </Badge>
        </div>

        <p
          className={cn(
            "mt-4 line-clamp-2 min-h-[2.5rem] flex-1 text-sm leading-relaxed",
            workspace.description ? "text-muted-foreground" : "text-muted-foreground/40",
          )}
        >
          {workspace.description ?? "No description yet — add context for your diligence team."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/40 pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            Scoped container for projects & diligence
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="default" size="sm" className="gap-1.5" asChild>
            <Link href={`/dashboard/projects?workspace=${workspace.id}`}>
              View projects
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
          )}
        </div>

        {!canEdit && !canDelete && (
          <p className="mt-3 text-xs text-muted-foreground">
            View only — contact an admin to edit workspace settings.
          </p>
        )}
      </div>
    </Card>
  );
}
