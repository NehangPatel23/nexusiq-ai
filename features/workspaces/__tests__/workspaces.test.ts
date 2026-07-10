import { describe, expect, it } from "vitest";

import { slugifyName } from "@/features/organizations/lib/slug";
import {
  canCreateWorkspace,
  canEditWorkspace,
  canManageWorkspaces,
  resolveWorkspaceOrgPermissions,
} from "../lib/roles";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "../schemas";

describe("workspace schemas", () => {
  it("validates create workspace input", () => {
    const result = createWorkspaceSchema.safeParse({
      name: "Due Diligence",
      description: "Main workspace",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short workspace names", () => {
    const result = createWorkspaceSchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });

  it("validates update workspace input", () => {
    const result = updateWorkspaceSchema.safeParse({
      name: "Updated Workspace",
      description: null,
      teamId: null,
    });
    expect(result.success).toBe(true);
  });

  it("normalizes slug input", () => {
    const result = createWorkspaceSchema.safeParse({
      name: "Due Diligence",
      slug: "  Due Diligence  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("due-diligence");
    }
  });
});

describe("workspace slug helpers", () => {
  it("converts names to URL-safe slugs", () => {
    expect(slugifyName("Due Diligence & Co.")).toBe("due-diligence-co");
    expect(slugifyName("  My Workspace  ")).toBe("my-workspace");
  });

  it("handles empty strings", () => {
    expect(slugifyName("!!!")).toBe("");
  });
});

describe("workspace role checks", () => {
  it("allows any org member to create workspaces", () => {
    expect(canCreateWorkspace("VIEWER")).toBe(true);
    expect(canCreateWorkspace("ANALYST")).toBe(true);
    expect(canCreateWorkspace("REVIEWER")).toBe(true);
  });

  it("requires admin or higher to edit workspaces", () => {
    expect(canEditWorkspace("ADMIN")).toBe(true);
    expect(canEditWorkspace("OWNER")).toBe(true);
    expect(canEditWorkspace("VIEWER")).toBe(false);
    expect(canEditWorkspace("ANALYST")).toBe(false);
    expect(canEditWorkspace("REVIEWER")).toBe(false);
  });

  it("requires admin or higher to manage deleted workspaces", () => {
    expect(canManageWorkspaces("ADMIN")).toBe(true);
    expect(canManageWorkspaces("OWNER")).toBe(true);
    expect(canManageWorkspaces("VIEWER")).toBe(false);
    expect(canManageWorkspaces("ANALYST")).toBe(false);
    expect(canManageWorkspaces("REVIEWER")).toBe(false);
  });

  it("resolves workspace permissions from org role", () => {
    expect(resolveWorkspaceOrgPermissions("REVIEWER")).toEqual({
      canCreate: true,
      canEdit: false,
      canDelete: false,
    });
    expect(resolveWorkspaceOrgPermissions("ADMIN")).toEqual({
      canCreate: true,
      canEdit: true,
      canDelete: true,
    });
  });
});
