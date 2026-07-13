"use client";

import { FolderKanban, Plus, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { WorkspaceCard } from "@/features/workspaces/components/workspace-card";
import {
  WorkspaceFormDialog,
  type WorkspaceFormValues,
} from "@/features/workspaces/components/workspace-form-dialog";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListKeyboardShortcuts } from "@/hooks/use-list-keyboard-shortcuts";
import { easeOut, fadeUp, staggerContainer } from "@/lib/motion";

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
  projectCountByWorkspaceId?: Record<string, number>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function WorkspacesList({
  orgId,
  workspaces,
  teams,
  projectCountByWorkspaceId = {},
  canCreate,
  canEdit,
  canDelete,
}: WorkspacesListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceFormValues | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "slug">("name");
  const searchRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  useListKeyboardShortcuts({
    onNew: canCreate ? () => setCreateOpen(true) : undefined,
    onFocusSearch: () => searchRef.current?.focus(),
  });

  const filteredWorkspaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = workspaces.filter((workspace) => {
      if (!query) {
        return true;
      }
      return (
        workspace.name.toLowerCase().includes(query) ||
        workspace.slug.toLowerCase().includes(query) ||
        workspace.description?.toLowerCase().includes(query) ||
        workspace.team?.name.toLowerCase().includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "slug") {
        return a.slug.localeCompare(b.slug);
      }
      return a.name.localeCompare(b.name);
    });
  }, [workspaces, search, sortBy]);

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
      initial={false}
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search workspaces… (/ to focus)"
            className="border-border/60 bg-card/40 pl-9"
            aria-label="Search workspaces"
          />
        </div>
        <AppSelect
          value={sortBy}
          onValueChange={(value) => setSortBy(value as "name" | "slug")}
          triggerClassName="flex h-10 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm"
          aria-label="Sort workspaces"
          options={[
            { value: "name", label: "Name A–Z" },
            { value: "slug", label: "Slug A–Z" },
          ]}
        />
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
        {filteredWorkspaces.map((workspace) => (
          <motion.li key={workspace.id} className="h-full" variants={fadeUp} transition={easeOut}>
            <WorkspaceCard
              workspace={workspace}
              projectCount={projectCountByWorkspaceId[workspace.id] ?? 0}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() =>
                setEditingWorkspace({
                  id: workspace.id,
                  name: workspace.name,
                  slug: workspace.slug,
                  description: workspace.description,
                  teamId: workspace.teamId,
                })
              }
            />
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
