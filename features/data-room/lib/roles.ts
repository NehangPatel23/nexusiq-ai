import type { OrgRole } from "@prisma/client";

import { hasMinRole } from "@/features/organizations/lib/roles";

/** Any org member can view the data room. */
export const DATA_ROOM_VIEW_MIN_ROLE = "VIEWER" satisfies OrgRole;

/** Member+ can upload and create folders (matches project edit). */
export const DATA_ROOM_UPLOAD_MIN_ROLE = "VIEWER" satisfies OrgRole;

/** Member+ can soft-delete documents and folders (matches upload). */
export const DATA_ROOM_DELETE_MIN_ROLE = "VIEWER" satisfies OrgRole;

/** Admin+ can restore, permanently delete, manage trash, shares, and audit export. */
export const DATA_ROOM_ADMIN_MIN_ROLE = "ADMIN" satisfies OrgRole;

export function canViewDataRoom(role: OrgRole): boolean {
  return hasMinRole(role, DATA_ROOM_VIEW_MIN_ROLE);
}

export function canUploadDocuments(role: OrgRole): boolean {
  return hasMinRole(role, DATA_ROOM_UPLOAD_MIN_ROLE);
}

export function canDeleteDocuments(role: OrgRole): boolean {
  return hasMinRole(role, DATA_ROOM_DELETE_MIN_ROLE);
}

export function canManageDeletedDocuments(role: OrgRole): boolean {
  return hasMinRole(role, DATA_ROOM_ADMIN_MIN_ROLE);
}
