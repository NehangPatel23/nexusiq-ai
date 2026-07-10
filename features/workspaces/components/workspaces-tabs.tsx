"use client";

import { Archive, FolderKanban, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  hardDeleteWorkspaceAction,
  restoreWorkspaceAction,
} from "@/features/workspaces/actions";
import type { WorkspaceListItem } from "@/features/workspaces/components/workspaces-list";
import { WorkspacesList } from "@/features/workspaces/components/workspaces-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface TeamOption {
  id: string;
  name: string;
}

export interface DeletedWorkspaceListItem extends WorkspaceListItem {
  deletedAt: Date;
}

interface WorkspacesTabsProps {
  orgId: string;
  workspaces: WorkspaceListItem[];
  deletedWorkspaces: DeletedWorkspaceListItem[];
  teams: TeamOption[];
  projectCountByWorkspaceId?: Record<string, number>;
  canCreate: boolean;
  canEdit: boolean;
  canManageDeleted: boolean;
}

type WorkspaceTab = "active" | "deleted";

function formatDeletedAt(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DeletedWorkspacesList({
  workspaces,
}: {
  workspaces: DeletedWorkspaceListItem[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<DeletedWorkspaceListItem | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<DeletedWorkspaceListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRestoreConfirm() {
    if (!restoreTarget) {
      return;
    }

    const workspaceId = restoreTarget.id;
    setPendingId(workspaceId);
    startTransition(async () => {
      const result = await restoreWorkspaceAction(workspaceId);
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error.message);
        setRestoreTarget(null);
        return;
      }
      toast.success("Workspace restored");
      setRestoreTarget(null);
      router.refresh();
    });
  }

  function handleHardDelete() {
    if (!hardDeleteTarget) {
      return;
    }

    const workspaceId = hardDeleteTarget.id;
    setPendingId(workspaceId);
    startTransition(async () => {
      const result = await hardDeleteWorkspaceAction(workspaceId);
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error.message);
        setHardDeleteTarget(null);
        return;
      }
      toast.success("Workspace permanently deleted");
      setHardDeleteTarget(null);
      router.refresh();
    });
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-br from-card/50 to-muted/10 px-6 py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted/30">
          <Archive className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">No deleted workspaces</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Soft-deleted workspaces appear here. Restore them or permanently remove them from the
          database.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
        {workspaces.map((workspace) => (
          <li key={workspace.id} className="h-full">
            <Card className="flex h-full flex-col border-border/60 bg-card/30 p-5">
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

              <p className="mt-3 text-xs text-muted-foreground">
                Deleted {formatDeletedAt(workspace.deletedAt)}
              </p>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending && pendingId === workspace.id}
                  onClick={() => setRestoreTarget(workspace)}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Restore
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Permanently delete ${workspace.name}`}
                  disabled={isPending && pendingId === workspace.id}
                  onClick={() => setHardDeleteTarget(workspace)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!restoreTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreTarget(null);
          }
        }}
        title={restoreTarget ? `Restore ${restoreTarget.name}?` : "Restore workspace?"}
        description="This workspace will return to the Active tab and become available to all organization members again."
        confirmLabel="Restore workspace"
        cancelLabel="Cancel"
        loading={isPending}
        onConfirm={handleRestoreConfirm}
      />

      <ConfirmDialog
        open={!!hardDeleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setHardDeleteTarget(null);
          }
        }}
        title={hardDeleteTarget ? `Permanently delete ${hardDeleteTarget.name}?` : "Permanently delete workspace?"}
        description="This removes the workspace from the database and cannot be undone. Projects and data added in future slices will also be removed when linked."
        confirmLabel="Delete permanently"
        cancelLabel="Cancel"
        variant="destructive"
        loading={isPending}
        onConfirm={handleHardDelete}
      />
    </>
  );
}

export function WorkspacesTabs({
  orgId,
  workspaces,
  deletedWorkspaces,
  teams,
  projectCountByWorkspaceId = {},
  canCreate,
  canEdit,
  canManageDeleted,
}: WorkspacesTabsProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("active");

  if (!canManageDeleted) {
    return (
      <WorkspacesList
        orgId={orgId}
        workspaces={workspaces}
        teams={teams}
        projectCountByWorkspaceId={projectCountByWorkspaceId}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Workspace views"
        className="inline-flex rounded-lg border border-border/60 bg-muted/20 p-1"
      >
        <button
          type="button"
          role="tab"
          id="workspaces-tab-active"
          aria-selected={activeTab === "active"}
          aria-controls="workspaces-panel-active"
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "active"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("active")}
        >
          <FolderKanban className="h-4 w-4" aria-hidden="true" />
          Active
          <Badge variant="outline" className="ml-1 text-[10px]">
            {workspaces.length}
          </Badge>
        </button>
        <button
          type="button"
          role="tab"
          id="workspaces-tab-deleted"
          aria-selected={activeTab === "deleted"}
          aria-controls="workspaces-panel-deleted"
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "deleted"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("deleted")}
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          Deleted
          <Badge variant="outline" className="ml-1 text-[10px]">
            {deletedWorkspaces.length}
          </Badge>
        </button>
      </div>

      <div
        role="tabpanel"
        id="workspaces-panel-active"
        aria-labelledby="workspaces-tab-active"
        hidden={activeTab !== "active"}
      >
        <WorkspacesList
          orgId={orgId}
          workspaces={workspaces}
          teams={teams}
          projectCountByWorkspaceId={projectCountByWorkspaceId}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canManageDeleted}
        />
      </div>

      <div
        role="tabpanel"
        id="workspaces-panel-deleted"
        aria-labelledby="workspaces-tab-deleted"
        hidden={activeTab !== "deleted"}
      >
        <DeletedWorkspacesList workspaces={deletedWorkspaces} />
      </div>
    </div>
  );
}
