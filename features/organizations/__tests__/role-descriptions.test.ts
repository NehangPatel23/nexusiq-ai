import { describe, expect, it } from "vitest";

import { ORG_ROLES } from "../lib/roles";
import { getAllOrgRoleDescriptions } from "../lib/role-descriptions";

describe("org role descriptions", () => {
  it("documents every organization role", () => {
    const descriptions = getAllOrgRoleDescriptions();
    expect(descriptions).toHaveLength(ORG_ROLES.length);
    for (const role of ORG_ROLES) {
      const entry = descriptions.find((item) => item.role === role);
      expect(entry?.audience.length).toBeGreaterThan(0);
      expect(entry?.organizationAccess.length).toBeGreaterThan(0);
      expect(entry?.workspaceAccess.length).toBeGreaterThan(0);
    }
  });

  it("restricts workspace edit and delete to admin and owner", () => {
    const admin = getAllOrgRoleDescriptions().find((entry) => entry.role === "ADMIN");
    const viewer = getAllOrgRoleDescriptions().find((entry) => entry.role === "VIEWER");

    expect(admin?.workspaceAccess.some((line) => /edit workspace/i.test(line))).toBe(true);
    expect(viewer?.workspaceAccess.some((line) => /cannot edit/i.test(line))).toBe(true);
  });
});
