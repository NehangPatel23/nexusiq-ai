import { describe, expect, it } from "vitest";

import { slugifyName } from "@/features/organizations/lib/slug";
import {
  buildOrgRoleMap,
  canCreateProject,
  canEditProject,
  canManageAnyListedProject,
  canManageProjects,
  resolveProjectOrgPermissions,
} from "../lib/roles";
import { PROJECT_TYPES, PROJECT_TYPE_LABELS, getProjectTypeLabel } from "../lib/project-types";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schemas";

describe("project schemas", () => {
  it("validates create project input", () => {
    const result = createProjectSchema.safeParse({
      name: "Acme Acquisition",
      type: "MA",
      description: "Primary diligence",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short project names", () => {
    const result = createProjectSchema.safeParse({
      name: "A",
      type: "MA",
    });
    expect(result.success).toBe(false);
  });

  it("validates all project types", () => {
    for (const type of PROJECT_TYPES) {
      const result = createProjectSchema.safeParse({
        name: "Test Project",
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid project type", () => {
    const result = createProjectSchema.safeParse({
      name: "Test Project",
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("validates tags and default agent on create", () => {
    const result = createProjectSchema.safeParse({
      name: "Tagged Project",
      type: "MA",
      tags: ["priority", "q4"],
      defaultAgent: "financial",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid default agent", () => {
    const result = createProjectSchema.safeParse({
      name: "Tagged Project",
      type: "MA",
      defaultAgent: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("validates update project input", () => {
    const result = updateProjectSchema.safeParse({
      name: "Updated Project",
      type: "VENDOR_DD",
      targetCompany: null,
      dealStatus: "In diligence",
    });
    expect(result.success).toBe(true);
  });

  it("normalizes slug input", () => {
    const result = createProjectSchema.safeParse({
      name: "Acme Acquisition",
      type: "MA",
      slug: "  Acme Acquisition  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("acme-acquisition");
    }
  });
});

describe("project type helpers", () => {
  it("maps project types to display labels", () => {
    expect(getProjectTypeLabel("MA")).toBe("M&A");
    expect(PROJECT_TYPE_LABELS.VENDOR_DD).toBe("Vendor DD");
    expect(PROJECT_TYPE_LABELS.INTERNAL).toBe("Internal");
  });
});

describe("project slug helpers", () => {
  it("converts names to URL-safe slugs", () => {
    expect(slugifyName("Acme Corp M&A")).toBe("acme-corp-ma");
    expect(slugifyName("  Vendor DD 2024  ")).toBe("vendor-dd-2024");
  });

  it("handles empty strings", () => {
    expect(slugifyName("!!!")).toBe("");
  });
});

describe("project role checks", () => {
  it("allows any org member to create and edit projects", () => {
    expect(canCreateProject("VIEWER")).toBe(true);
    expect(canCreateProject("ANALYST")).toBe(true);
    expect(canEditProject("VIEWER")).toBe(true);
    expect(canEditProject("REVIEWER")).toBe(true);
  });

  it("requires admin or higher to manage deleted projects", () => {
    expect(canManageProjects("ADMIN")).toBe(true);
    expect(canManageProjects("OWNER")).toBe(true);
    expect(canManageProjects("VIEWER")).toBe(false);
    expect(canManageProjects("ANALYST")).toBe(false);
    expect(canManageProjects("REVIEWER")).toBe(false);
  });

  it("resolves per-organization project permissions from role", () => {
    expect(resolveProjectOrgPermissions("REVIEWER")).toEqual({
      canCreate: true,
      canEdit: true,
      canDelete: false,
    });
    expect(resolveProjectOrgPermissions("ADMIN")).toEqual({
      canCreate: true,
      canEdit: true,
      canDelete: true,
    });
    expect(resolveProjectOrgPermissions(undefined)).toEqual({
      canCreate: false,
      canEdit: false,
      canDelete: false,
    });
  });

  it("builds an org role lookup map for project permission checks", () => {
    const map = buildOrgRoleMap([
      { id: "org-a", role: "OWNER" },
      { id: "org-b", role: "REVIEWER" },
    ]);

    expect(map).toEqual({
      "org-a": "OWNER",
      "org-b": "REVIEWER",
    });
    expect(resolveProjectOrgPermissions(map["org-b"]).canDelete).toBe(false);
    expect(resolveProjectOrgPermissions(map["org-a"]).canDelete).toBe(true);
  });

  it("checks delete access per listed project organization", () => {
    const orgRolesByOrgId = buildOrgRoleMap([
      { id: "org-a", role: "OWNER" },
      { id: "org-b", role: "REVIEWER" },
    ]);

    expect(
      canManageAnyListedProject(orgRolesByOrgId, [
        { workspace: { organization: { id: "org-b" } } },
      ]),
    ).toBe(false);

    expect(
      canManageAnyListedProject(orgRolesByOrgId, [
        { workspace: { organization: { id: "org-a" } } },
        { workspace: { organization: { id: "org-b" } } },
      ]),
    ).toBe(true);
  });
});
