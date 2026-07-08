import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DeleteOrganizationButton } from "@/features/organizations/components/delete-organization-button";
import { MembersSection } from "@/features/organizations/components/members-section";
import { OrgSettingsForm } from "@/features/organizations/components/org-settings-form";
import { TeamsSection } from "@/features/organizations/components/teams-section";
import { getOrganizationMembership } from "@/features/organizations/lib/authorization";
import {
  getOrganizationById,
  listOrganizationMembers,
  listOrganizationTeams,
  listPendingInvites,
} from "@/features/organizations/lib/organizations";
import { hasMinRole } from "@/features/organizations/lib/roles";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth";

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
  const session = await auth();
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

  const canEdit = hasMinRole(membership.role, "ADMIN");
  const canManageMembers = canEdit;
  const isOwner = membership.role === "OWNER";

  const [members, pendingInvites, teams] = await Promise.all([
    listOrganizationMembers(orgId),
    listPendingInvites(orgId),
    listOrganizationTeams(orgId),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title={organization.name}
        description="Manage organization settings, members, and teams."
      />

      <section aria-labelledby="org-details-heading" className="space-y-4">
        <h2 id="org-details-heading" className="text-lg font-semibold">
          Organization details
        </h2>
        <div className="rounded-xl border border-border/60 bg-card/30 p-6">
          <OrgSettingsForm
            orgId={orgId}
            name={organization.name}
            description={organization.description}
            canEdit={canEdit}
          />
        </div>
      </section>

      <section aria-labelledby="members-heading" className="space-y-4">
        <h2 id="members-heading" className="text-lg font-semibold">
          Members
        </h2>
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
        <TeamsSection orgId={orgId} teams={teams} canManage={canEdit} />
      </section>

      {isOwner && (
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
