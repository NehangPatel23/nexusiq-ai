import type { OrgRole } from "@prisma/client";

const ROLE_RANK: Record<OrgRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  ANALYST: 3,
  REVIEWER: 2,
  VIEWER: 1,
};

export const ORG_ROLES: OrgRole[] = ["OWNER", "ADMIN", "ANALYST", "REVIEWER", "VIEWER"];

export const INVITABLE_ROLES: OrgRole[] = ["ADMIN", "ANALYST", "REVIEWER", "VIEWER"];

export function getRoleRank(role: OrgRole): number {
  return ROLE_RANK[role];
}

export function hasMinRole(userRole: OrgRole, minRole: OrgRole): boolean {
  return getRoleRank(userRole) >= getRoleRank(minRole);
}

export function formatOrgRole(role: OrgRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

/** Shared role badge colors for org list, members, etc. */
export function getOrgRoleBadgeClass(role: OrgRole): string {
  switch (role) {
    case "OWNER":
      return "border-primary/35 bg-primary/10 text-primary";
    case "ADMIN":
      return "border-accent/35 bg-accent/10 text-accent";
    case "ANALYST":
      return "border-sky-500/30 bg-sky-500/10 text-tint-sky";
    case "REVIEWER":
      return "border-violet-500/25 bg-violet-500/10 text-violet-900 dark:text-violet-300";
    case "VIEWER":
      return "border-border/70 bg-muted/30 text-muted-foreground";
    default:
      return "border-border/70 bg-muted/30 text-muted-foreground";
  }
}
