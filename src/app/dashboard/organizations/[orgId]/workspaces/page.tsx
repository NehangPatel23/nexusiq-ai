import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import {
  getOrganizationById,
  listOrganizationTeams,
} from "@/features/organizations/lib/organizations";
import {
  canCreateWorkspace,
  canEditWorkspace,
  canManageWorkspaces,
} from "@/features/workspaces/lib/roles";
import { WorkspacesBreadcrumbs } from "@/features/workspaces/components/workspaces-breadcrumbs";
import { OrgRolesInfoButton } from "@/features/organizations/components/org-roles-info-button";
import { WorkspacesTabs } from "@/features/workspaces/components/workspaces-tabs";
import {
  listDeletedOrganizationWorkspaces,
  listOrganizationWorkspaces,
} from "@/features/workspaces/lib/workspaces";
import { countProjectsByWorkspaceIds } from "@/features/projects/lib/projects";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgId } = await params;
  const organization = await getOrganizationById(orgId);
  return {
    title: organization ? `${organization.name} Workspaces` : "Workspaces",
  };
}

export default async function OrganizationWorkspacesPage({ params }: PageProps) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { orgId } = await params;
  const organization = await getOrganizationById(orgId);
  if (!organization) {
    notFound();
  }

  const membership = await getOrganizationMembership(orgId, session.user.id);
  if (!membership) {
    redirect("/dashboard/organizations");
  }

  const canCreate = canCreateWorkspace(membership.role);
  const canEdit = canEditWorkspace(membership.role);
  const canManageDeleted = canManageWorkspaces(membership.role);

  const [workspaces, deletedWorkspaces, teams] = await Promise.all([
    listOrganizationWorkspaces(orgId),
    canManageDeleted ? listDeletedOrganizationWorkspaces(orgId) : Promise.resolve([]),
    listOrganizationTeams(orgId),
  ]);

  const projectCountByWorkspaceId = await countProjectsByWorkspaceIds(
    workspaces.map((workspace) => workspace.id),
  );

  return (
    <div className="space-y-8">
      <WorkspacesBreadcrumbs orgId={orgId} orgName={organization.name} />

      <PageHeader
        title="Workspaces"
        description={
          canEdit
            ? "Organize projects and intelligence workflows within your organization. Workspace cards are containers — projects and data rooms open from here in the next release."
            : "Browse and create workspaces in this organization. Opening a workspace (projects, data room, agents) arrives in the next release; contact an admin to edit workspace settings."
        }
      >
        <OrgRolesInfoButton />
      </PageHeader>

      <WorkspacesTabs
        orgId={orgId}
        workspaces={workspaces}
        deletedWorkspaces={deletedWorkspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
          teamId: workspace.teamId,
          team: workspace.team,
          deletedAt: workspace.deletedAt!,
        }))}
        teams={teams.map((team) => ({ id: team.id, name: team.name }))}
        projectCountByWorkspaceId={projectCountByWorkspaceId}
        canCreate={canCreate}
        canEdit={canEdit}
        canManageDeleted={canManageDeleted}
      />
    </div>
  );
}
