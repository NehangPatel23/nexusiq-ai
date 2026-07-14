import type { OrgRole } from "@prisma/client";

import { AuthError, requireOrgRole, requireSession } from "@/features/organizations/lib/authorization";
import { prisma } from "@/lib/db";

export type OwnerOrg = {
  id: string;
  name: string;
  slug: string;
};

/** Organizations where the user is OWNER (active orgs only). */
export async function listOwnerOrganizations(userId: string): Promise<OwnerOrg[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId,
      role: "OWNER",
      organization: { deletedAt: null },
    },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
  }));
}

export async function userIsOrgOwner(userId: string): Promise<boolean> {
  const count = await prisma.organizationMember.count({
    where: {
      userId,
      role: "OWNER",
      organization: { deletedAt: null },
    },
  });
  return count > 0;
}

/**
 * Gate admin routes: session + OWNER of the selected organization.
 * When organizationId is omitted, returns the first owner org (or throws FORBIDDEN).
 */
export async function requireAdminOwner(organizationId?: string | null) {
  const session = await requireSession();
  const ownerOrgs = await listOwnerOrganizations(session.userId);

  if (ownerOrgs.length === 0) {
    throw new AuthError("FORBIDDEN", "Admin access requires organization owner role");
  }

  const orgId = organizationId?.trim() || ownerOrgs[0]!.id;
  const owns = ownerOrgs.some((o) => o.id === orgId);
  if (!owns) {
    throw new AuthError("FORBIDDEN", "You must be an owner of this organization");
  }

  // Re-check via requireOrgRole for consistent membership shape
  const auth = await requireOrgRole(orgId, "OWNER" satisfies OrgRole);

  return {
    ...auth,
    organizationId: orgId,
    ownerOrganizations: ownerOrgs,
  };
}
