import type { OrgRole, OrganizationMember } from "@prisma/client";

import { auth } from "@/lib/auth";

import { getOrganizationMembership } from "./organizations";
import { hasMinRole } from "./roles";

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("UNAUTHORIZED", "Authentication required");
  }
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
  };
}

export { getOrganizationMembership };

export async function requireOrgRole(organizationId: string, minRole: OrgRole) {
  const session = await requireSession();
  const membership = await getOrganizationMembership(organizationId, session.userId);

  if (!membership) {
    throw new AuthError("FORBIDDEN", "You do not have access to this organization");
  }

  if (!hasMinRole(membership.role, minRole)) {
    throw new AuthError("FORBIDDEN", "Insufficient permissions for this action");
  }

  return {
    ...session,
    membership,
  };
}
