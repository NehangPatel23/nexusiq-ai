import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { hasMinRole } from "@/features/organizations/lib/roles";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import {
  canEditProject,
  canManageProjects,
} from "../lib/roles";
import {
  countProjectsByWorkspaceIds,
  createProject,
  duplicateProject,
  getProjectById,
  hardDeleteProject,
  listDeletedWorkspaceProjects,
  listWorkspaceProjects,
  restoreProject,
  softDeleteProject,
  toggleProjectPin,
  updateProject,
} from "../lib/projects";
import { generateUniqueProjectSlug, isProjectSlugAvailable } from "../lib/slug";
import { prisma } from "@/lib/db";

const ownerEmail = `proj-owner-${Date.now()}@example.com`;
const viewerEmail = `proj-viewer-${Date.now()}@example.com`;
const outsiderEmail = `proj-outsider-${Date.now()}@example.com`;

let organizationId = "";
let workspaceId = "";

describe("projects integration", () => {
  beforeAll(async () => {
    const owner = await createUser({
      name: "Project Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });

    const viewer = await createUser({
      name: "Project Viewer",
      email: viewerEmail,
      password: "IntegrationTest123",
    });

    await createUser({
      name: "Project Outsider",
      email: outsiderEmail,
      password: "IntegrationTest123",
    });

    const organization = await createOrganization(owner.id, {
      name: "Project Integration Org",
      description: "Test organization",
    });
    organizationId = organization.id;

    await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: viewer.id,
        role: "VIEWER",
      },
    });

    const workspace = await createWorkspace(organizationId, {
      name: "Integration Workspace",
    });
    expect("workspace" in workspace).toBe(true);
    if ("workspace" in workspace) {
      workspaceId = workspace.workspace.id;
    }
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { workspaceId } });
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, viewerEmail, outsiderEmail] } },
    });
    await prisma.$disconnect();
  });

  it("creates project with auto-generated slug", async () => {
    const result = await createProject(workspaceId, {
      name: "Acme Acquisition",
      type: "MA",
      description: "Primary diligence",
    });

    expect("project" in result).toBe(true);
    if ("project" in result) {
      expect(result.project.slug).toMatch(/acme-acquisition/);
      expect(result.project.type).toBe("MA");
    }
  });

  it("enforces unique slug per workspace", async () => {
    const slug = await generateUniqueProjectSlug(workspaceId, "Unique Project");
    const first = await createProject(workspaceId, {
      name: "Unique Project",
      type: "AUDIT",
      slug,
    });
    expect("project" in first).toBe(true);

    const duplicate = await createProject(workspaceId, {
      name: "Unique Project Two",
      type: "AUDIT",
      slug,
    });
    expect("error" in duplicate).toBe(true);
    if ("error" in duplicate) {
      expect(duplicate.error).toBe("CONFLICT");
    }
  });

  it("lists projects excluding soft-deleted records", async () => {
    const created = await createProject(workspaceId, {
      name: "List Project",
      type: "INTERNAL",
    });
    expect("project" in created).toBe(true);

    const projects = await listWorkspaceProjects(workspaceId);
    expect(projects.some((project) => project.name === "List Project")).toBe(true);

    if ("project" in created) {
      await softDeleteProject(created.project.id);
      const afterDelete = await listWorkspaceProjects(workspaceId);
      expect(afterDelete.some((project) => project.id === created.project.id)).toBe(false);
      expect(await getProjectById(created.project.id)).toBeNull();
    }
  });

  it("updates project metadata", async () => {
    const created = await createProject(workspaceId, {
      name: "Update Project",
      type: "INVESTMENT",
    });
    expect("project" in created).toBe(true);
    if (!("project" in created)) {
      return;
    }

    const updated = await updateProject(created.project.id, {
      name: "Updated Project",
      targetCompany: "Acme Corp",
      dealStatus: "In diligence",
    });

    expect("project" in updated).toBe(true);
    if ("project" in updated) {
      expect(updated.project.name).toBe("Updated Project");
      expect(updated.project.targetCompany).toBe("Acme Corp");
    }
  });

  it("requires admin role to manage deleted projects", () => {
    expect(canEditProject("VIEWER")).toBe(true);
    expect(canManageProjects("VIEWER")).toBe(false);
    expect(canManageProjects("ADMIN")).toBe(true);
    expect(hasMinRole("ANALYST", "ADMIN")).toBe(false);
  });

  it("denies non-members from organization access", async () => {
    const outsider = await prisma.user.findUnique({ where: { email: outsiderEmail } });
    expect(outsider).toBeTruthy();

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: outsider!.id,
        },
      },
    });
    expect(membership).toBeNull();
  });

  it("blocks slug reuse while a project is soft-deleted", async () => {
    const created = await createProject(workspaceId, {
      name: "Soft Delete Slug Test",
      type: "MA",
      slug: "soft-delete-slug-test",
    });
    expect("project" in created).toBe(true);
    if (!("project" in created)) {
      return;
    }

    await softDeleteProject(created.project.id);
    expect(await isProjectSlugAvailable(workspaceId, "soft-delete-slug-test")).toBe(false);

    const duplicate = await createProject(workspaceId, {
      name: "Soft Delete Slug Test Two",
      type: "MA",
      slug: "soft-delete-slug-test",
    });
    expect("error" in duplicate).toBe(true);
    if ("error" in duplicate) {
      expect(duplicate.error).toBe("CONFLICT");
    }
  });

  it("lists deleted projects for admin recovery", async () => {
    const created = await createProject(workspaceId, {
      name: "Deleted List Project",
      type: "VENDOR_DD",
    });
    expect("project" in created).toBe(true);
    if (!("project" in created)) {
      return;
    }

    await softDeleteProject(created.project.id);
    const deleted = await listDeletedWorkspaceProjects(workspaceId);
    expect(deleted.some((project) => project.id === created.project.id)).toBe(true);
  });

  it("restores a soft-deleted project", async () => {
    const created = await createProject(workspaceId, {
      name: "Restore Project",
      type: "AUDIT",
    });
    expect("project" in created).toBe(true);
    if (!("project" in created)) {
      return;
    }

    await softDeleteProject(created.project.id);
    expect(await getProjectById(created.project.id)).toBeNull();

    const restored = await restoreProject(created.project.id);
    expect("project" in restored).toBe(true);
    if ("project" in restored) {
      expect(restored.project.deletedAt).toBeNull();
    }

    const active = await listWorkspaceProjects(workspaceId);
    expect(active.some((project) => project.id === created.project.id)).toBe(true);
  });

  it("toggles project pin status", async () => {
    const created = await createProject(workspaceId, {
      name: "Pin Project",
      type: "INTERNAL",
    });
    expect("project" in created).toBe(true);
    if (!("project" in created)) {
      return;
    }

    expect(created.project.pinned).toBe(false);
    const pinned = await toggleProjectPin(created.project.id);
    expect("project" in pinned).toBe(true);
    if ("project" in pinned) {
      expect(pinned.project.pinned).toBe(true);
    }
  });

  it("duplicates a project with a new slug", async () => {
    const created = await createProject(workspaceId, {
      name: "Duplicate Me",
      type: "MA",
    });
    expect("project" in created).toBe(true);
    if (!("project" in created)) {
      return;
    }

    const duplicate = await duplicateProject(created.project.id);
    expect("project" in duplicate).toBe(true);
    if ("project" in duplicate) {
      expect(duplicate.project.name).toContain("copy");
      expect(duplicate.project.slug).not.toBe(created.project.slug);
    }
  });

  it("counts projects per workspace", async () => {
    const secondWorkspace = await createWorkspace(organizationId, {
      name: "Count Workspace",
    });

    const projectOne = await createProject(workspaceId, {
      name: "Count Project One",
      type: "MA",
    });
    const projectTwo = await createProject(workspaceId, {
      name: "Count Project Two",
      type: "AUDIT",
    });
    expect("project" in projectOne).toBe(true);
    expect("project" in projectTwo).toBe(true);

    const counts = await countProjectsByWorkspaceIds([workspaceId, secondWorkspace.workspace.id]);
    expect(counts[workspaceId]).toBeGreaterThanOrEqual(2);
    expect(counts[secondWorkspace.workspace.id] ?? 0).toBe(0);
  });

  it("stores default agent in project metadata", async () => {
    const created = await createProject(workspaceId, {
      name: "Agent Default Project",
      type: "MA",
      defaultAgent: "financial",
      tags: ["priority", "q4"],
    });
    expect("project" in created).toBe(true);
    if (!("project" in created)) {
      return;
    }

    expect(created.project.tags).toEqual(["priority", "q4"]);
    expect(created.project.metadata).toEqual({ defaultAgent: "financial" });

    const updated = await updateProject(created.project.id, {
      defaultAgent: "legal",
    });
    expect("project" in updated).toBe(true);
    if ("project" in updated) {
      expect(updated.project.metadata).toEqual({ defaultAgent: "legal" });
    }
  });

  it("permanently deletes a soft-deleted project from the database", async () => {
    const created = await createProject(workspaceId, {
      name: "Hard Delete Project",
      type: "INTERNAL",
    });
    expect("project" in created).toBe(true);
    if (!("project" in created)) {
      return;
    }

    await softDeleteProject(created.project.id);
    const hardDeleted = await hardDeleteProject(created.project.id);
    expect(hardDeleted?.id).toBe(created.project.id);

    expect(
      await prisma.project.findUnique({ where: { id: created.project.id } }),
    ).toBeNull();

    const deleted = await listDeletedWorkspaceProjects(workspaceId);
    expect(deleted.some((project) => project.id === created.project.id)).toBe(false);
  });
});
