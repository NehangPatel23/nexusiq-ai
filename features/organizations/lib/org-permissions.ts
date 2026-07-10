import type { OrgRole } from "@prisma/client";

import { hasMinRole } from "./roles";

export function buildOrgRoleMap(
  organizations: ReadonlyArray<{ id: string; role: OrgRole }>,
): Record<string, OrgRole> {
  return Object.fromEntries(organizations.map((org) => [org.id, org.role]));
}

export type OrganizationPermissions = {
  canManageSettings: boolean;
  canManageMembers: boolean;
  canManageTeams: boolean;
  canDeleteOrganization: boolean;
};

export function resolveOrganizationPermissions(
  role: OrgRole | undefined,
): OrganizationPermissions {
  if (!role) {
    return {
      canManageSettings: false,
      canManageMembers: false,
      canManageTeams: false,
      canDeleteOrganization: false,
    };
  }

  const canManageSettings = hasMinRole(role, "ADMIN");

  return {
    canManageSettings,
    canManageMembers: canManageSettings,
    canManageTeams: canManageSettings,
    canDeleteOrganization: role === "OWNER",
  };
}
