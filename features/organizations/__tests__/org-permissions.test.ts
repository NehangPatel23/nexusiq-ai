import { describe, expect, it } from "vitest";

import {
  buildOrgRoleMap,
  resolveOrganizationPermissions,
} from "../lib/org-permissions";

describe("organization permissions", () => {
  it("resolves settings and member management for admin roles only", () => {
    expect(resolveOrganizationPermissions("REVIEWER")).toEqual({
      canManageSettings: false,
      canManageMembers: false,
      canManageTeams: false,
      canDeleteOrganization: false,
    });
    expect(resolveOrganizationPermissions("ADMIN")).toEqual({
      canManageSettings: true,
      canManageMembers: true,
      canManageTeams: true,
      canDeleteOrganization: false,
    });
    expect(resolveOrganizationPermissions("OWNER")).toEqual({
      canManageSettings: true,
      canManageMembers: true,
      canManageTeams: true,
      canDeleteOrganization: true,
    });
  });

  it("builds a role lookup map for per-organization UI gating", () => {
    expect(
      buildOrgRoleMap([
        { id: "org-a", role: "OWNER" },
        { id: "org-b", role: "REVIEWER" },
      ]),
    ).toEqual({
      "org-a": "OWNER",
      "org-b": "REVIEWER",
    });
  });
});
