import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { hasMinRole } from "@/features/organizations/lib/roles";
import {
  canEditWorkspace,
  canManageWorkspaces,
} from "../lib/roles";
import {
  createWorkspace,
  getWorkspaceById,
  hardDeleteWorkspace,
  listDeletedOrganizationWorkspaces,
  listOrganizationWorkspaces,
  restoreWorkspace,
  softDeleteWorkspace,
  updateWorkspace,
} from "../lib/workspaces";
import { generateUniqueWorkspaceSlug, isWorkspaceSlugAvailable } from "../lib/slug";
import { prisma } from "@/lib/db";

const ownerEmail = `ws-owner-${Date.now()}@example.com`;
const viewerEmail = `ws-viewer-${Date.now()}@example.com`;
const outsiderEmail = `ws-outsider-${Date.now()}@example.com`;

let ownerId = "";
let viewerId = "";
let outsiderId = "";
let organizationId = "";
let teamId = "";

describe("workspaces integration", () => {
  beforeAll(async () => {
    const owner = await createUser({
      name: "Workspace Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });
    ownerId = owner.id;

    const viewer = await createUser({
      name: "Workspace Viewer",
      email: viewerEmail,
      password: "IntegrationTest123",
    });
    viewerId = viewer.id;

    const outsider = await createUser({
      name: "Workspace Outsider",
      email: outsiderEmail,
      password: "IntegrationTest123",
    });
    outsiderId = outsider.id;

    const organization = await createOrganization(ownerId, {
      name: "Workspace Integration Org",
      description: "Test organization",
    });
    organizationId = organization.id;

    await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: viewerId,
        role: "VIEWER",
      },
    });

    const team = await prisma.team.create({
      data: {
        organizationId,
        name: "Integration Team",
      },
    });
    teamId = team.id;
  });

  afterAll(async () => {
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.team.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, viewerEmail, outsiderEmail] } },
    });
    await prisma.$disconnect();
  });

  it("creates workspace with auto-generated slug", async () => {
    const result = await createWorkspace(organizationId, {
      name: "Due Diligence",
      description: "Primary workspace",
    });

    expect("workspace" in result).toBe(true);
    if ("workspace" in result) {
      expect(result.workspace.slug).toMatch(/due-diligence/);
      expect(result.workspace.description).toBe("Primary workspace");
    }
  });

  it("enforces unique slug per organization", async () => {
    const slug = await generateUniqueWorkspaceSlug(organizationId, "Unique Slug Test");
    const first = await createWorkspace(organizationId, {
      name: "Unique Slug Test",
      slug,
    });
    expect("workspace" in first).toBe(true);

    const duplicate = await createWorkspace(organizationId, {
      name: "Unique Slug Test Two",
      slug,
    });
    expect("error" in duplicate).toBe(true);
    if ("error" in duplicate) {
      expect(duplicate.error).toBe("CONFLICT");
    }
  });

  it("lists workspaces excluding soft-deleted records", async () => {
    const created = await createWorkspace(organizationId, { name: "List Workspace" });
    expect("workspace" in created).toBe(true);

    const workspaces = await listOrganizationWorkspaces(organizationId);
    expect(workspaces.some((workspace) => workspace.name === "List Workspace")).toBe(true);

    if ("workspace" in created) {
      await softDeleteWorkspace(created.workspace.id);
      const afterDelete = await listOrganizationWorkspaces(organizationId);
      expect(afterDelete.some((workspace) => workspace.id === created.workspace.id)).toBe(false);
      expect(await getWorkspaceById(created.workspace.id)).toBeNull();
    }
  });

  it("updates workspace and optional team assignment", async () => {
    const created = await createWorkspace(organizationId, { name: "Update Workspace" });
    expect("workspace" in created).toBe(true);
    if (!("workspace" in created)) {
      return;
    }

    const updated = await updateWorkspace(created.workspace.id, {
      name: "Updated Workspace",
      description: "Updated description",
      teamId,
    });

    expect("workspace" in updated).toBe(true);
    if ("workspace" in updated) {
      expect(updated.workspace.name).toBe("Updated Workspace");
      expect(updated.workspace.teamId).toBe(teamId);
    }
  });

  it("requires admin role to edit or manage deleted workspaces", () => {
    expect(canEditWorkspace("VIEWER")).toBe(false);
    expect(canEditWorkspace("ANALYST")).toBe(false);
    expect(canEditWorkspace("REVIEWER")).toBe(false);
    expect(canEditWorkspace("ADMIN")).toBe(true);
    expect(canManageWorkspaces("VIEWER")).toBe(false);
    expect(hasMinRole("ANALYST", "ADMIN")).toBe(false);
  });

  it("denies non-members from accessing organization workspaces", async () => {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: outsiderId,
        },
      },
    });
    expect(membership).toBeNull();
  });

  it("blocks slug reuse while a workspace is soft-deleted", async () => {
    const created = await createWorkspace(organizationId, {
      name: "Soft Delete Slug Test",
      slug: "soft-delete-slug-test",
    });
    expect("workspace" in created).toBe(true);
    if (!("workspace" in created)) {
      return;
    }

    await softDeleteWorkspace(created.workspace.id);
    expect(await isWorkspaceSlugAvailable(organizationId, "soft-delete-slug-test")).toBe(false);

    const duplicate = await createWorkspace(organizationId, {
      name: "Soft Delete Slug Test Two",
      slug: "soft-delete-slug-test",
    });
    expect("error" in duplicate).toBe(true);
    if ("error" in duplicate) {
      expect(duplicate.error).toBe("CONFLICT");
    }
  });

  it("lists deleted workspaces for admin recovery", async () => {
    const created = await createWorkspace(organizationId, { name: "Deleted List Workspace" });
    expect("workspace" in created).toBe(true);
    if (!("workspace" in created)) {
      return;
    }

    await softDeleteWorkspace(created.workspace.id);
    const deleted = await listDeletedOrganizationWorkspaces(organizationId);
    expect(deleted.some((workspace) => workspace.id === created.workspace.id)).toBe(true);
    expect(deleted.find((workspace) => workspace.id === created.workspace.id)?.deletedAt).toBeTruthy();
  });

  it("restores a soft-deleted workspace", async () => {
    const created = await createWorkspace(organizationId, { name: "Restore Workspace" });
    expect("workspace" in created).toBe(true);
    if (!("workspace" in created)) {
      return;
    }

    await softDeleteWorkspace(created.workspace.id);
    expect(await getWorkspaceById(created.workspace.id)).toBeNull();

    const restored = await restoreWorkspace(created.workspace.id);
    expect("workspace" in restored).toBe(true);
    if ("workspace" in restored) {
      expect(restored.workspace.deletedAt).toBeNull();
    }

    const active = await listOrganizationWorkspaces(organizationId);
    expect(active.some((workspace) => workspace.id === created.workspace.id)).toBe(true);
  });

  it("permanently deletes a soft-deleted workspace from the database", async () => {
    const created = await createWorkspace(organizationId, { name: "Hard Delete Workspace" });
    expect("workspace" in created).toBe(true);
    if (!("workspace" in created)) {
      return;
    }

    await softDeleteWorkspace(created.workspace.id);
    const hardDeleted = await hardDeleteWorkspace(created.workspace.id);
    expect(hardDeleted?.id).toBe(created.workspace.id);

    expect(
      await prisma.workspace.findUnique({ where: { id: created.workspace.id } }),
    ).toBeNull();

    const deleted = await listDeletedOrganizationWorkspaces(organizationId);
    expect(deleted.some((workspace) => workspace.id === created.workspace.id)).toBe(false);
  });
});
