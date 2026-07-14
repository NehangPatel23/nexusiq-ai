import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import { createOrganizationInvite, findValidInvite } from "../lib/invites";
import {
  createOrganization,
  getOrganizationById,
  getOrganizationMembership,
  listUserOrganizations,
  deleteOrganization,
  updateOrganization,
} from "../lib/organizations";
import { hasMinRole } from "../lib/roles";
import { prisma } from "@/lib/db";

const ownerEmail = `org-owner-${Date.now()}@example.com`;
const viewerEmail = `org-viewer-${Date.now()}@example.com`;
const inviteEmail = `org-invite-${Date.now()}@example.com`;

let ownerId = "";
let viewerId = "";
let organizationId = "";

describe("organizations integration", () => {
  beforeAll(async () => {
    const owner = await createUser({
      name: "Org Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });
    ownerId = owner.id;

    const viewer = await createUser({
      name: "Org Viewer",
      email: viewerEmail,
      password: "IntegrationTest123",
    });
    viewerId = viewer.id;

    const organization = await createOrganization(ownerId, {
      name: "Integration Org",
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
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { user: { email: { in: [ownerEmail, viewerEmail, inviteEmail] } } },
    });
    await prisma.invite.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.team.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, viewerEmail, inviteEmail] } },
    });
    await prisma.$disconnect();
  });

  it("creates organization with owner membership", async () => {
    const orgs = await listUserOrganizations(ownerId);
    expect(orgs).toHaveLength(1);
    expect(orgs[0]?.role).toBe("OWNER");
    expect(orgs[0]?.slug).toMatch(/integration-org/);
  });

  it("updates organization details", async () => {
    const updated = await updateOrganization(organizationId, {
      name: "Updated Integration Org",
      description: "Updated description",
    });
    expect(updated.name).toBe("Updated Integration Org");
  });

  it("creates invite with 7-day expiry", async () => {
    const organization = await getOrganizationById(organizationId);
    const result = await createOrganizationInvite(
      organizationId,
      organization!.name,
      inviteEmail,
      "ANALYST",
      "Org Owner",
    );

    if ("error" in result) {
      throw new Error("Expected invite to be created");
    }

    const invite = await findValidInvite(result.invite.token);
    expect(invite?.email).toBe(inviteEmail);

    const daysUntilExpiry =
      (invite!.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysUntilExpiry).toBeGreaterThan(6.9);
    expect(daysUntilExpiry).toBeLessThan(7.1);
  });

  it("permanently deletes organization and related data", async () => {
    const tempOrg = await createOrganization(ownerId, { name: "Temp Delete Org" });
    await deleteOrganization(tempOrg.id);

    expect(await getOrganizationById(tempOrg.id)).toBeNull();
    const tombstoned = await prisma.organization.findUnique({ where: { id: tempOrg.id } });
    expect(tombstoned).not.toBeNull();
    expect(tombstoned?.deletedAt).not.toBeNull();
    expect(tombstoned?.purgeAfter).not.toBeNull();
    // Memberships remain during grace period
    expect(
      await prisma.organizationMember.count({ where: { organizationId: tempOrg.id } }),
    ).toBeGreaterThan(0);

    // Hard purge for cleanup
    await prisma.organization.delete({ where: { id: tempOrg.id } });
  });

  it("enforces role hierarchy for viewer members", async () => {
    const membership = await getOrganizationMembership(organizationId, viewerId);
    expect(membership?.role).toBe("VIEWER");
    expect(hasMinRole(membership!.role, "ADMIN")).toBe(false);
    expect(hasMinRole(membership!.role, "VIEWER")).toBe(true);
  });

  it("returns null membership for non-members", async () => {
    const outsider = await createUser({
      name: "Outsider",
      email: `org-outsider-${Date.now()}@example.com`,
      password: "IntegrationTest123",
    });

    const membership = await getOrganizationMembership(organizationId, outsider.id);
    expect(membership).toBeNull();

    await prisma.user.delete({ where: { id: outsider.id } });
  });

  it("syncs notifications when user registers after invite", async () => {
    const lateEmail = `org-late-${Date.now()}@example.com`;
    const organization = await getOrganizationById(organizationId);

    const result = await createOrganizationInvite(
      organizationId,
      organization!.name,
      lateEmail,
      "VIEWER",
      "Org Owner",
    );

    if ("error" in result) {
      throw new Error("Expected invite to be created");
    }

    const lateUser = await createUser({
      name: "Late User",
      email: lateEmail,
      password: "IntegrationTest123",
    });

    const { syncInviteNotificationsForEmail } = await import("../lib/invites");
    await syncInviteNotificationsForEmail(lateUser.id, lateEmail);

    const notifications = await prisma.notification.findMany({
      where: { userId: lateUser.id },
    });
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]?.link).toContain("/invite/");

    await prisma.notification.deleteMany({ where: { userId: lateUser.id } });
    await prisma.invite.deleteMany({ where: { email: lateEmail } });
    await prisma.user.delete({ where: { id: lateUser.id } });
  });

  it("cancels pending invite", async () => {
    const cancelEmail = `org-cancel-${Date.now()}@example.com`;
    const organization = await getOrganizationById(organizationId);
    const result = await createOrganizationInvite(
      organizationId,
      organization!.name,
      cancelEmail,
      "VIEWER",
      "Org Owner",
    );

    if ("error" in result) {
      throw new Error("Expected invite to be created");
    }

    const { cancelOrganizationInvite } = await import("../lib/invites");
    const cancelled = await cancelOrganizationInvite(organizationId, result.invite.id);
    expect(cancelled?.email).toBe(cancelEmail);

    const remaining = await prisma.invite.findUnique({ where: { id: result.invite.id } });
    expect(remaining).toBeNull();
  });
});
