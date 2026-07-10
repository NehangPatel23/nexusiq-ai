import type { OrgRole } from "@prisma/client";

import { hasMinRole } from "@/features/organizations/lib/roles";

/** Any org member can list and view workspaces. */
export const WORKSPACE_LIST_MIN_ROLE = "VIEWER" satisfies OrgRole;

/** Member+ can create workspaces (any org membership). */
export const WORKSPACE_CREATE_MIN_ROLE = "VIEWER" satisfies OrgRole;

/** Admin+ can update workspace metadata. */
export const WORKSPACE_EDIT_MIN_ROLE = "ADMIN" satisfies OrgRole;

/** Admin+ can soft-delete, restore, and permanently delete workspaces. */
export const WORKSPACE_MANAGE_MIN_ROLE = "ADMIN" satisfies OrgRole;

export type WorkspaceOrgPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function canListWorkspaces(role: OrgRole): boolean {
  return hasMinRole(role, WORKSPACE_LIST_MIN_ROLE);
}

export function canCreateWorkspace(role: OrgRole): boolean {
  return hasMinRole(role, WORKSPACE_CREATE_MIN_ROLE);
}

export function canEditWorkspace(role: OrgRole): boolean {
  return hasMinRole(role, WORKSPACE_EDIT_MIN_ROLE);
}

export function canManageWorkspaces(role: OrgRole): boolean {
  return hasMinRole(role, WORKSPACE_MANAGE_MIN_ROLE);
}

export function resolveWorkspaceOrgPermissions(
  role: OrgRole | undefined,
): WorkspaceOrgPermissions {
  if (!role) {
    return { canCreate: false, canEdit: false, canDelete: false };
  }

  return {
    canCreate: canCreateWorkspace(role),
    canEdit: canEditWorkspace(role),
    canDelete: canManageWorkspaces(role),
  };
}
