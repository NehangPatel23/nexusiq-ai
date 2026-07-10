import type { OrgRole } from "@prisma/client";

import { buildOrgRoleMap } from "@/features/organizations/lib/org-permissions";
import { hasMinRole } from "@/features/organizations/lib/roles";

/** Any org member can list and view projects. */
export const PROJECT_LIST_MIN_ROLE = "VIEWER" satisfies OrgRole;

/** Member+ can create projects (any org membership). */
export const PROJECT_CREATE_MIN_ROLE = "VIEWER" satisfies OrgRole;

/** Member+ can update project metadata. */
export const PROJECT_EDIT_MIN_ROLE = "VIEWER" satisfies OrgRole;

/** Admin+ can soft-delete, restore, and permanently delete projects. */
export const PROJECT_MANAGE_MIN_ROLE = "ADMIN" satisfies OrgRole;

export function canListProjects(role: OrgRole): boolean {
  return hasMinRole(role, PROJECT_LIST_MIN_ROLE);
}

export function canCreateProject(role: OrgRole): boolean {
  return hasMinRole(role, PROJECT_CREATE_MIN_ROLE);
}

export function canEditProject(role: OrgRole): boolean {
  return hasMinRole(role, PROJECT_EDIT_MIN_ROLE);
}

export function canManageProjects(role: OrgRole): boolean {
  return hasMinRole(role, PROJECT_MANAGE_MIN_ROLE);
}

export type ProjectOrgPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function resolveProjectOrgPermissions(role: OrgRole | undefined): ProjectOrgPermissions {
  if (!role) {
    return { canCreate: false, canEdit: false, canDelete: false };
  }

  return {
    canCreate: canCreateProject(role),
    canEdit: canEditProject(role),
    canDelete: canManageProjects(role),
  };
}

export function canManageAnyListedProject(
  orgRolesByOrgId: Record<string, OrgRole>,
  projects: ReadonlyArray<{ workspace: { organization: { id: string } } }>,
): boolean {
  return projects.some(
    (project) =>
      resolveProjectOrgPermissions(orgRolesByOrgId[project.workspace.organization.id]).canDelete,
  );
}

export { buildOrgRoleMap };
