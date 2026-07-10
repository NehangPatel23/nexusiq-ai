"use client";

import {
  ArrowRight,
  Building2,
  FolderKanban,
  FolderOpen,
  Layers,
  LayoutGrid,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { ProjectType } from "@prisma/client";

import { bulkDeleteProjectsAction } from "@/features/projects/actions";
import { ProjectCard, type ProjectListItem } from "@/features/projects/components/project-card";
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog";
import { collectDealStatusOptions, type DealStatusFilter } from "@/features/projects/lib/deal-statuses";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useListKeyboardShortcuts } from "@/hooks/use-list-keyboard-shortcuts";
import { easeOut, fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface WorkspaceOption {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

interface ProjectsListProps {
  projects: ProjectListItem[];
  workspaces: WorkspaceOption[];
  organizations: OrganizationOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

type SortOption = "updated" | "name" | "type" | "pinned";

function ProjectsEmptyState({
  organizations,
  workspaces,
  canCreate,
  onCreateClick,
}: {
  organizations: OrganizationOption[];
  workspaces: WorkspaceOption[];
  canCreate: boolean;
  onCreateClick: () => void;
}) {
  const hasOrganizations = organizations.length > 0;
  const hasWorkspaces = workspaces.length > 0;
  const primaryOrg = organizations[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-gradient-to-br from-card/60 via-card/40 to-primary/5 px-6 py-16 text-center md:py-20">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-inner-soft">
          <FolderOpen className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">No projects yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {!hasOrganizations
            ? "Create an organization first, then add a workspace, before starting diligence projects."
            : !hasWorkspaces
              ? "You need at least one workspace before creating projects. Workspaces organize your diligence engagements."
              : "Create your first diligence project to organize documents, run intelligence agents, and track deal risks."}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {!hasOrganizations && (
            <Button size="lg" asChild>
              <Link href="/dashboard/organizations">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Create organization
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}

          {hasOrganizations && !hasWorkspaces && primaryOrg && (
            <Button size="lg" asChild>
              <Link href={`/dashboard/organizations/${primaryOrg.id}/workspaces`}>
                <FolderKanban className="h-4 w-4" aria-hidden="true" />
                Create workspace in {primaryOrg.name}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}

          {hasWorkspaces && canCreate && (
            <Button size="lg" onClick={onCreateClick}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create project
            </Button>
          )}

          {hasWorkspaces && !canCreate && (
            <p className="text-sm text-muted-foreground">
              Contact an organization admin to create projects in your workspaces.
            </p>
          )}
        </div>

        {hasOrganizations && !hasWorkspaces && organizations.length > 1 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-muted-foreground">Or create a workspace in another organization:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {organizations.slice(1).map((org) => (
                <Button key={org.id} variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/organizations/${org.id}/workspaces`}>
                    {org.name}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectsList({
  projects,
  workspaces,
  organizations,
  canCreate,
  canEdit,
  canDelete,
}: ProjectsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceParam = searchParams.get("workspace");
  const createParam = searchParams.get("create");
  const searchRef = useRef<HTMLInputElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProjectType | "ALL">("ALL");
  const [dealStatusFilter, setDealStatusFilter] = useState<DealStatusFilter>("ALL");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("pinned");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isBulkPending, startBulkTransition] = useTransition();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (workspaceParam && workspaces.some((workspace) => workspace.id === workspaceParam)) {
      setWorkspaceFilter(workspaceParam);
    }
  }, [workspaceParam, workspaces]);

  useEffect(() => {
    if (createParam === "true" && canCreate && workspaces.length > 0) {
      setCreateOpen(true);
    }
  }, [createParam, canCreate, workspaces.length]);

  const defaultWorkspaceId =
    workspaceFilter !== "ALL" && workspaces.some((workspace) => workspace.id === workspaceFilter)
      ? workspaceFilter
      : workspaceParam && workspaces.some((workspace) => workspace.id === workspaceParam)
        ? workspaceParam
        : undefined;

  const dealStatusOptions = useMemo(() => collectDealStatusOptions(projects), [projects]);

  function handleWorkspaceFilterChange(value: string) {
    setWorkspaceFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("workspace");
    } else {
      params.set("workspace", value);
    }
    const query = params.toString();
    router.replace(query ? `/dashboard/projects?${query}` : "/dashboard/projects", {
      scroll: false,
    });
  }

  const activeWorkspace =
    workspaceFilter === "ALL"
      ? null
      : workspaces.find((workspace) => workspace.id === workspaceFilter);

  useListKeyboardShortcuts({
    onNew: canCreate && workspaces.length > 0 ? () => setCreateOpen(true) : undefined,
    onFocusSearch: () => searchRef.current?.focus(),
  });

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = projects.filter((project) => {
      const matchesType = typeFilter === "ALL" || project.type === typeFilter;
      const matchesDealStatus =
        dealStatusFilter === "ALL" ||
        (dealStatusFilter === "NONE" && !project.dealStatus) ||
        project.dealStatus === dealStatusFilter;
      const matchesWorkspace =
        workspaceFilter === "ALL" || project.workspace.id === workspaceFilter;
      const matchesSearch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.targetCompany?.toLowerCase().includes(query) ||
        project.workspace.name.toLowerCase().includes(query) ||
        project.workspace.organization.name.toLowerCase().includes(query) ||
        project.slug.toLowerCase().includes(query);
      return matchesType && matchesDealStatus && matchesWorkspace && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "pinned") {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "type") {
        return a.type.localeCompare(b.type);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects, search, typeFilter, dealStatusFilter, workspaceFilter, sortBy]);

  function toggleSelection(projectId: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  }

  function handleBulkDelete() {
    startBulkTransition(async () => {
      const result = await bulkDeleteProjectsAction(Array.from(selectedIds));
      if (!result.success) {
        toast.error(result.error.message);
        setBulkConfirmOpen(false);
        return;
      }
      toast.success(`${result.data?.deleted ?? 0} project(s) deleted`);
      setBulkConfirmOpen(false);
      setBulkMode(false);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  if (projects.length === 0) {
    return (
      <>
        <ProjectsEmptyState
          organizations={organizations}
          workspaces={workspaces}
          canCreate={canCreate}
          onCreateClick={() => setCreateOpen(true)}
        />
        <ProjectFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          workspaces={workspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            organizationName: workspace.organizationName,
          }))}
          defaultWorkspaceId={defaultWorkspaceId}
        />
      </>
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
              <FolderOpen className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{projects.length}</p>
              <p className="text-sm text-muted-foreground">
                Active project{projects.length === 1 ? "" : "s"} across {workspaces.length} workspace
                {workspaces.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {canCreate && workspaces.length > 0 && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New project
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        variants={fadeUp}
        transition={easeOut}
      >
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, target, org… (/ to focus)"
              className="border-border/60 bg-card/40 pl-9"
              aria-label="Search projects"
            />
          </div>
          <select
            value={workspaceFilter}
            onChange={(event) => handleWorkspaceFilterChange(event.target.value)}
            className="flex h-10 max-w-[11rem] rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm"
            aria-label="Filter by workspace"
          >
            <option value="ALL">All workspaces</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as ProjectType | "ALL")}
            className="flex h-10 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm"
            aria-label="Filter by project type"
          >
            <option value="ALL">All types</option>
            <option value="MA">M&A</option>
            <option value="VENDOR_DD">Vendor DD</option>
            <option value="AUDIT">Audit</option>
            <option value="INVESTMENT">Investment</option>
            <option value="INTERNAL">Internal</option>
          </select>
          <select
            value={dealStatusFilter}
            onChange={(event) => setDealStatusFilter(event.target.value as DealStatusFilter)}
            className="flex h-10 max-w-[10rem] rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm"
            aria-label="Filter by deal status"
          >
            <option value="ALL">All statuses</option>
            <option value="NONE">No status</option>
            {dealStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="flex h-10 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm"
            aria-label="Sort projects"
          >
            <option value="pinned">Pinned first</option>
            <option value="updated">Last updated</option>
            <option value="name">Name A–Z</option>
            <option value="type">Type</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canDelete && (
            <Button
              type="button"
              variant={bulkMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setBulkMode((value) => !value);
                setSelectedIds(new Set());
              }}
            >
              {bulkMode ? "Cancel selection" : "Select"}
            </Button>
          )}
          {bulkMode && selectedIds.size > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirmOpen(true)}
            >
              Delete {selectedIds.size}
            </Button>
          )}
          <div
            className="flex rounded-lg border border-border/60 bg-muted/20 p-1"
            role="group"
            aria-label="View mode"
          >
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">List view</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {activeWorkspace && (
        <motion.div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
          variants={fadeUp}
          transition={easeOut}
        >
          <div className="flex items-center gap-2 text-sm">
            <FolderKanban className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              Showing projects in{" "}
              <span className="font-medium text-foreground">{activeWorkspace.name}</span>
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => handleWorkspaceFilterChange("ALL")}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear workspace filter
          </Button>
        </motion.div>
      )}

      {filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/20 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No projects match your search or filters.</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => {
              setSearch("");
              setTypeFilter("ALL");
              setDealStatusFilter("ALL");
              handleWorkspaceFilterChange("ALL");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <ul
          className={cn(
            "gap-4",
            viewMode === "grid"
              ? "grid md:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col",
          )}
          role="list"
        >
          {filteredProjects.map((project) => (
            <motion.li
              key={project.id}
              className={cn("h-full", viewMode === "grid" && "min-h-[280px]")}
              variants={fadeUp}
              transition={easeOut}
            >
              <ProjectCard
                project={project}
                viewMode={viewMode}
                canDelete={canDelete && !bulkMode}
                canEdit={canEdit}
                processingPercent={0}
                bulkMode={bulkMode}
                selected={selectedIds.has(project.id)}
                onSelectChange={(selected) => toggleSelection(project.id, selected)}
              />
            </motion.li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Shortcuts: <kbd className="rounded border border-border/60 px-1.5 py-0.5">N</kbd> new project ·{" "}
        <kbd className="rounded border border-border/60 px-1.5 py-0.5">/</kbd> focus search
      </p>

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={`Delete ${selectedIds.size} project(s)?`}
        description="Selected projects will move to the Deleted tab. Administrators can restore them later."
        confirmLabel="Delete projects"
        cancelLabel="Cancel"
        variant="destructive"
        loading={isBulkPending}
        onConfirm={handleBulkDelete}
      />

      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaces={workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          organizationName: workspace.organizationName,
        }))}
        defaultWorkspaceId={defaultWorkspaceId}
      />
    </motion.div>
  );
}

export type { ProjectListItem };
