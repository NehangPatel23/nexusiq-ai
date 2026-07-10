import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteOrganizationButton } from "@/features/organizations/components/delete-organization-button";
import { MembersSection } from "@/features/organizations/components/members-section";
import { OrgRolesInfoButton } from "@/features/organizations/components/org-roles-info-button";
import { OrgSettingsForm } from "@/features/organizations/components/org-settings-form";
import { TeamsSection } from "@/features/organizations/components/teams-section";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import { resolveOrganizationPermissions } from "@/features/organizations/lib/org-permissions";
import {
  getOrganizationById,
  listOrganizationMembers,
  listOrganizationTeams,
  listPendingInvites,
} from "@/features/organizations/lib/organizations";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgId } = await params;
  const organization = await getOrganizationById(orgId);
  return {
    title: organization ? `${organization.name} Settings` : "Organization Settings",
  };
}

export default async function OrganizationSettingsPage({ params }: PageProps) {
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

  const permissions = resolveOrganizationPermissions(membership.role);
  const { canManageSettings, canManageMembers, canDeleteOrganization } = permissions;

  const [members, pendingInvites, teams] = await Promise.all([
    listOrganizationMembers(orgId),
    listPendingInvites(orgId),
    listOrganizationTeams(orgId),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title={organization.name}
        description={
          canManageSettings
            ? "Manage organization settings, members, teams, and workspaces."
            : "View organization settings, members, and teams. Contact an admin to make changes."
        }
      >
        <Button variant="outline" asChild>
          <Link href={`/dashboard/organizations/${orgId}/workspaces`}>Workspaces</Link>
        </Button>
      </PageHeader>

      <section aria-labelledby="org-details-heading" className="space-y-4">
        <h2 id="org-details-heading" className="text-lg font-semibold">
          Organization details
        </h2>
        <div className="rounded-xl border border-border/60 bg-card/30 p-6">
          <OrgSettingsForm
            orgId={orgId}
            name={organization.name}
            description={organization.description}
            canEdit={canManageSettings}
          />
        </div>
      </section>

      <section aria-labelledby="members-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 id="members-heading" className="text-lg font-semibold">
            Members
          </h2>
          <OrgRolesInfoButton />
        </div>
        <MembersSection
          orgId={orgId}
          members={members}
          pendingInvites={pendingInvites}
          canManage={canManageMembers}
          currentUserId={session.user.id}
        />
      </section>

      <section aria-labelledby="teams-heading" className="space-y-4">
        <h2 id="teams-heading" className="text-lg font-semibold">
          Teams
        </h2>
        <TeamsSection orgId={orgId} teams={teams} canManage={canManageSettings} />
      </section>

      {canDeleteOrganization && (
        <section aria-labelledby="danger-heading" className="space-y-4">
          <h2 id="danger-heading" className="text-lg font-semibold text-destructive">
            Danger zone
          </h2>
          <DeleteOrganizationButton orgId={orgId} orgName={organization.name} />
        </section>
      )}
    </div>
  );
}
