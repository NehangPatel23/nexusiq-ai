"use client";

import { FolderKanban, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { DeleteWorkspaceButton } from "@/features/workspaces/components/delete-workspace-button";
import {
  WorkspaceFormDialog,
  type WorkspaceFormValues,
} from "@/features/workspaces/components/workspace-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { easeOut, fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface TeamOption {
  id: string;
  name: string;
}

export interface WorkspaceListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  teamId: string | null;
  team: { id: string; name: string } | null;
}

interface WorkspacesListProps {
  orgId: string;
  workspaces: WorkspaceListItem[];
  teams: TeamOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function WorkspacesList({
  orgId,
  workspaces,
  teams,
  canCreate,
  canEdit,
  canDelete,
}: WorkspacesListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceFormValues | null>(null);
  const reduceMotion = useReducedMotion();

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-br from-card/50 to-primary/5 px-6 py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-inner-soft">
          <FolderKanban className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">No workspaces yet</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Create a workspace to organize projects, data rooms, and intelligence runs for this
          organization.
        </p>
        {canCreate && (
          <Button className="mt-8" size="lg" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create workspace
          </Button>
        )}
        <WorkspaceFormDialog
          orgId={orgId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          teams={teams}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={reduceMotion ? undefined : staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-card/70 to-primary/5 p-6 md:p-8"
        variants={fadeUp}
        transition={easeOut}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <FolderKanban className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{workspaces.length}</p>
              <p className="text-sm text-muted-foreground">
                Workspace{workspaces.length === 1 ? "" : "s"} in this organization
              </p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New workspace
            </Button>
          )}
        </div>
      </motion.div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
        {workspaces.map((workspace) => (
          <motion.li key={workspace.id} className="h-full" variants={fadeUp} transition={easeOut}>
            <Card className="group relative flex h-full flex-col overflow-hidden border-border/60 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/60 hover:shadow-soft">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />

              <div className="relative flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-semibold leading-tight text-foreground">
                      {workspace.name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      /{workspace.slug}
                    </p>
                  </div>
                  {workspace.team && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {workspace.team.name}
                    </Badge>
                  )}
                </div>

                <p
                  className={cn(
                    "mt-4 min-h-10 line-clamp-2 text-sm leading-relaxed",
                    workspace.description ? "text-muted-foreground" : "text-muted-foreground/40",
                  )}
                >
                  {workspace.description ?? "No description"}
                </p>

                {!canEdit && !canDelete && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    View only — you can browse and create workspaces. Ask an admin to edit settings.
                  </p>
                )}

                <p className="mt-2 text-xs text-muted-foreground/80">
                  Projects and data rooms will open from this workspace in a future update.
                </p>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-4">
                  {canEdit ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEditingWorkspace({
                          id: workspace.id,
                          name: workspace.name,
                          slug: workspace.slug,
                          description: workspace.description,
                          teamId: workspace.teamId,
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                  ) : (
                    <span />
                  )}
                  {canDelete && (
                    <DeleteWorkspaceButton
                      workspaceId={workspace.id}
                      workspaceName={workspace.name}
                    />
                  )}
                </div>
              </div>
            </Card>
          </motion.li>
        ))}
      </ul>

      <WorkspaceFormDialog
        orgId={orgId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        teams={teams}
      />

      <WorkspaceFormDialog
        orgId={orgId}
        open={!!editingWorkspace}
        onOpenChange={(open) => {
          if (!open) {
            setEditingWorkspace(null);
          }
        }}
        teams={teams}
        workspace={editingWorkspace}
      />
    </motion.div>
  );
}
