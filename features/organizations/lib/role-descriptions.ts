import type { OrgRole } from "@prisma/client";

import { ORG_ROLES } from "./roles";

export interface OrgRoleDescription {
  role: OrgRole;
  title: string;
  audience: string;
  organizationAccess: string[];
  workspaceAccess: string[];
}

export const ORG_ROLE_DESCRIPTIONS: OrgRoleDescription[] = [
  {
    role: "OWNER",
    title: "Owner",
    audience: "Organization creator or designated account holder with full accountability.",
    organizationAccess: [
      "Full organization settings and member management",
      "Create and manage teams",
      "Delete the organization (danger zone)",
      "All Admin capabilities below",
    ],
    workspaceAccess: [
      "View, create, edit, and delete workspaces",
      "Restore or permanently delete soft-deleted workspaces",
    ],
  },
  {
    role: "ADMIN",
    title: "Admin",
    audience: "IT leads, org managers, and workspace administrators.",
    organizationAccess: [
      "Edit organization name and description",
      "Invite members and change roles (except Owner)",
      "Create and manage teams",
      "Cannot delete the organization",
    ],
    workspaceAccess: [
      "View and create workspaces",
      "Edit workspace name, slug, description, and team assignment",
      "Soft-delete, restore, and permanently delete workspaces",
    ],
  },
  {
    role: "ANALYST",
    title: "Analyst",
    audience: "Due diligence, finance, and research staff doing hands-on analysis.",
    organizationAccess: [
      "View organization settings, members, and teams",
      "Cannot invite members or change org settings",
    ],
    workspaceAccess: [
      "View the workspace list and create new workspaces",
      "Cannot edit or delete workspace settings (ask an Admin)",
      "Projects and data rooms inside workspaces arrive in a later release",
    ],
  },
  {
    role: "REVIEWER",
    title: "Reviewer",
    audience: "Legal, compliance, and secondary stakeholders who review findings.",
    organizationAccess: [
      "View organization settings, members, and teams",
      "Cannot invite members or change org settings",
    ],
    workspaceAccess: [
      "View the workspace list and create new workspaces",
      "Cannot edit or delete workspace settings (ask an Admin)",
      "Projects and data rooms inside workspaces arrive in a later release",
    ],
  },
  {
    role: "VIEWER",
    title: "Viewer",
    audience: "Executives and read-only stakeholders who need visibility without administration.",
    organizationAccess: [
      "View organization settings, members, and teams",
      "Cannot invite members or change org settings",
    ],
    workspaceAccess: [
      "View the workspace list and create new workspaces",
      "Cannot edit or delete workspace settings (ask an Admin)",
      "Projects and data rooms inside workspaces arrive in a later release",
    ],
  },
];

export function getOrgRoleDescription(role: OrgRole): OrgRoleDescription | undefined {
  return ORG_ROLE_DESCRIPTIONS.find((entry) => entry.role === role);
}

/** Ensures every org role has a description entry (for tests). */
export function getAllOrgRoleDescriptions(): OrgRoleDescription[] {
  return ORG_ROLES.map(
    (role) => getOrgRoleDescription(role) ?? {
      role,
      title: role,
      audience: "",
      organizationAccess: [],
      workspaceAccess: [],
    },
  );
}
