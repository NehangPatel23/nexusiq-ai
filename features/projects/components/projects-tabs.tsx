"use client";

import { Archive, FolderOpen, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  hardDeleteProjectAction,
  restoreProjectAction,
} from "@/features/projects/actions";
import type { DeletedProjectListItem } from "@/features/projects/components/project-card";
import { ProjectTypeBadge } from "@/features/projects/components/project-type-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

function formatDeletedAt(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DeletedProjectsList({
  projects,
  readOnly = false,
}: {
  projects: DeletedProjectListItem[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<DeletedProjectListItem | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<DeletedProjectListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRestoreConfirm() {
    if (!restoreTarget) {
      return;
    }

    const projectId = restoreTarget.id;
    setPendingId(projectId);
    startTransition(async () => {
      const result = await restoreProjectAction(projectId);
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error.message);
        setRestoreTarget(null);
        return;
      }
      toast.success("Project restored");
      setRestoreTarget(null);
      router.refresh();
    });
  }

  function handleHardDelete() {
    if (!hardDeleteTarget) {
      return;
    }

    const projectId = hardDeleteTarget.id;
    setPendingId(projectId);
    startTransition(async () => {
      const result = await hardDeleteProjectAction(projectId);
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error.message);
        setHardDeleteTarget(null);
        return;
      }
      toast.success("Project permanently deleted");
      setHardDeleteTarget(null);
      router.refresh();
    });
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-br from-card/50 to-muted/10 px-6 py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted/30">
          <Archive className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">No deleted projects</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {readOnly
            ? "Archived projects removed by an administrator will appear here."
            : "Soft-deleted projects appear here. Restore them or permanently remove them from the database."}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
        {projects.map((project) => (
          <li key={project.id} className="h-full">
            <Card className="flex h-full min-h-[220px] flex-col border-border/60 bg-card/30 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <ProjectTypeBadge type={project.type} />
                  <p className="truncate font-semibold leading-tight">{project.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {project.workspace.organization.name} · {project.workspace.name}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] text-destructive">
                  Deleted
                </Badge>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Deleted {formatDeletedAt(project.deletedAt)}
              </p>

              {!readOnly && (
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending && pendingId === project.id}
                    onClick={() => setRestoreTarget(project)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Permanently delete ${project.name}`}
                    disabled={isPending && pendingId === project.id}
                    onClick={() => setHardDeleteTarget(project)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}

              {readOnly && (
                <p className="mt-auto border-t border-border/40 pt-4 text-xs text-muted-foreground">
                  Contact an administrator to restore this project.
                </p>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {!readOnly && (
        <>
          <ConfirmDialog
            open={!!restoreTarget}
            onOpenChange={(open) => {
              if (!open) {
                setRestoreTarget(null);
              }
            }}
            title={restoreTarget ? `Restore ${restoreTarget.name}?` : "Restore project?"}
            description="This project will return to the Active tab and become available to all organization members again."
            confirmLabel="Restore project"
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
            title={
              hardDeleteTarget
                ? `Permanently delete ${hardDeleteTarget.name}?`
                : "Permanently delete project?"
            }
            description="This removes the project from the database and cannot be undone."
            confirmLabel="Delete permanently"
            cancelLabel="Cancel"
            variant="destructive"
            loading={isPending}
            onConfirm={handleHardDelete}
          />
        </>
      )}
    </>
  );
}

interface ProjectsTabsProps {
  activeCount: number;
  deletedCount: number;
  canManageDeleted: boolean;
  activePanel: React.ReactNode;
  deletedPanel: React.ReactNode;
}

type ProjectTab = "active" | "deleted";

export function ProjectsTabs({
  activeCount,
  deletedCount,
  canManageDeleted,
  activePanel,
  deletedPanel,
}: ProjectsTabsProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("active");

  const showDeletedTab = deletedCount > 0 || canManageDeleted;

  if (!showDeletedTab) {
    return <>{activePanel}</>;
  }

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Project views"
        className="inline-flex rounded-lg border border-border/60 bg-muted/20 p-1"
      >
        <button
          type="button"
          role="tab"
          id="projects-tab-active"
          aria-selected={activeTab === "active"}
          aria-controls="projects-panel-active"
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "active"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("active")}
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          Active
          <Badge variant="outline" className="ml-1 text-[10px]">
            {activeCount}
          </Badge>
        </button>
        <button
          type="button"
          role="tab"
          id="projects-tab-deleted"
          aria-selected={activeTab === "deleted"}
          aria-controls="projects-panel-deleted"
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "deleted"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("deleted")}
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          {canManageDeleted ? "Deleted" : "Archived"}
          <Badge variant="outline" className="ml-1 text-[10px]">
            {deletedCount}
          </Badge>
        </button>
      </div>

      <div
        role="tabpanel"
        id="projects-panel-active"
        aria-labelledby="projects-tab-active"
        hidden={activeTab !== "active"}
      >
        {activePanel}
      </div>

      <div
        role="tabpanel"
        id="projects-panel-deleted"
        aria-labelledby="projects-tab-deleted"
        hidden={activeTab !== "deleted"}
      >
        {deletedPanel}
      </div>
    </div>
  );
}
