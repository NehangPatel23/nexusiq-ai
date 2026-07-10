import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { listUserOrganizations } from "@/features/organizations/lib/organizations";
import { DeletedProjectsList, ProjectsTabs } from "@/features/projects/components/projects-tabs";
import { ProjectsList } from "@/features/projects/components/projects-list";
import { buildOrgRoleMap } from "@/features/organizations/lib/org-permissions";
import { canManageAnyListedProject } from "@/features/projects/lib/roles";
import {
  listUserVisibleDeletedProjects,
  listUserProjects,
} from "@/features/projects/lib/projects";
import { listUserWorkspaces } from "@/features/projects/lib/user-workspaces";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [projects, deletedProjects, workspaces, organizations] = await Promise.all([
    listUserProjects(session.user.id),
    listUserVisibleDeletedProjects(session.user.id),
    listUserWorkspaces(session.user.id),
    listUserOrganizations(session.user.id),
  ]);

  const orgRolesByOrgId = buildOrgRoleMap(organizations);
  const canManageDeleted = canManageAnyListedProject(orgRolesByOrgId, deletedProjects);

  const workspaceOptions = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    organizationId: workspace.organization.id,
    organizationName: workspace.organization.name,
  }));

  const orgOptions = organizations.map((org) => ({
    id: org.id,
    name: org.name,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Manage diligence projects across your workspaces. Each project scopes documents, agents, and reports."
      />

      <ProjectsTabs
        activeCount={projects.length}
        deletedCount={deletedProjects.length}
        canManageDeleted={canManageDeleted}
        activePanel={
          <Suspense
            fallback={
              <div className="rounded-xl border border-border/60 bg-card/20 px-6 py-12 text-center text-sm text-muted-foreground">
                Loading projects…
              </div>
            }
          >
            <ProjectsList
              projects={projects}
              workspaces={workspaceOptions}
              organizations={orgOptions}
              orgRolesByOrgId={orgRolesByOrgId}
            />
          </Suspense>
        }
        deletedPanel={
          <DeletedProjectsList
            orgRolesByOrgId={orgRolesByOrgId}
            projects={deletedProjects.map((project) => ({
              ...project,
              deletedAt: project.deletedAt!,
            }))}
          />
        }
      />
    </div>
  );
}
