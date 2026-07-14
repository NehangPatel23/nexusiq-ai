import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import { logAudit } from "@/features/history/lib/audit";
import { listAuditLogs } from "@/features/history/lib/audit-queries";
import { compareProjects } from "@/features/history/lib/compare";
import { DELETION_GRACE_MS } from "@/features/history/lib/constants";
import { purgeExpiredEntities, restoreOrganization, tombstoneOrganization } from "@/features/history/lib/purge";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { createProject } from "@/features/projects/lib/projects";
import {
  AccountDeletionError,
  assertCanDeleteAccount,
  recoverUser,
  tombstoneUser,
} from "@/features/settings/lib/account-deletion";
import { OllamaClient, resetOllamaClient } from "@/lib/ai/ollama-client";
import { prisma } from "@/lib/db";
import { GET as auditGet } from "@/app/api/organizations/[orgId]/audit/route";
import { GET as compareGet } from "@/app/api/organizations/[orgId]/compare/route";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

const password = "IntegrationTest123";
let ownerId = "";
let organizationId = "";
let projectAId = "";
let projectBId = "";

function setSession(userId: string, email: string) {
  vi.mocked(getSession).mockResolvedValue({
    user: { id: userId, email, name: "Owner" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as unknown as Awaited<ReturnType<typeof getSession>>);
}

beforeAll(async () => {
  const stamp = Date.now();
  const owner = await createUser({
    name: "History Owner",
    email: `history-owner-${stamp}@test.com`,
    password,
  });
  ownerId = owner.id;
  const org = await createOrganization(ownerId, { name: `History Org ${stamp}` });
  organizationId = org.id;

  const ws = await createWorkspace(organizationId, { name: `WS ${stamp}` });
  if (!("workspace" in ws)) throw new Error(ws.message);
  const a = await createProject(ws.workspace.id, {
    name: `Project A ${stamp}`,
    type: "MA",
  });
  if (!("project" in a)) throw new Error(a.message);
  const b = await createProject(ws.workspace.id, {
    name: `Project B ${stamp}`,
    type: "MA",
  });
  if (!("project" in b)) throw new Error(b.message);
  projectAId = a.project.id;
  projectBId = b.project.id;

  await prisma.agentRun.createMany({
    data: [
      {
        projectId: projectAId,
        agentType: "FINANCIAL",
        status: "COMPLETED",
        score: 70,
        confidence: "MEDIUM",
        completedAt: new Date(),
      },
      {
        projectId: projectBId,
        agentType: "FINANCIAL",
        status: "COMPLETED",
        score: 55,
        confidence: "MEDIUM",
        completedAt: new Date(),
      },
    ],
  });
});

beforeEach(() => {
  setSession(ownerId, `history-owner@test.com`);
});

afterAll(async () => {
  if (organizationId) {
    await prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
  }
  if (ownerId) {
    await prisma.user.delete({ where: { id: ownerId } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

describe("History + Settings integration", () => {
  it("creates and lists audit logs with action filters", async () => {
    await logAudit({
      organizationId,
      userId: ownerId,
      action: "SETTINGS_UPDATE",
      entityType: "User",
      entityId: ownerId,
      metadata: { detail: "test" },
    });

    const listed = await listAuditLogs(organizationId, { action: "SETTINGS_UPDATE" });
    expect(listed.total).toBeGreaterThanOrEqual(1);
    expect(listed.items[0]?.action).toBe("SETTINGS_UPDATE");

    const res = await auditGet(
      new Request(`http://localhost/api/organizations/${organizationId}/audit?action=SETTINGS_UPDATE`),
      { params: Promise.resolve({ orgId: organizationId }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { items: unknown[] } };
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it("compares projects side-by-side", async () => {
    const result = await compareProjects(projectAId, projectBId);
    expect(result.projectA.agentScores.FINANCIAL).toBe(70);
    expect(result.projectB.agentScores.FINANCIAL).toBe(55);
    expect(result.scoreDiffs.find((d) => d.agentType === "FINANCIAL")?.diff).toBe(15);

    const res = await compareGet(
      new Request(
        `http://localhost/api/organizations/${organizationId}/compare?projectA=${projectAId}&projectB=${projectBId}`,
      ),
      { params: Promise.resolve({ orgId: organizationId }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("blocks sole-owner account deletion", async () => {
    await expect(assertCanDeleteAccount(ownerId)).rejects.toBeInstanceOf(AccountDeletionError);
  });

  it("tombstones org, restores within grace, and purges after mocked expiry", async () => {
    const stamp = Date.now();
    const tempOwner = await createUser({
      name: "Temp Owner",
      email: `history-temp-${stamp}@test.com`,
      password,
    });
    const tempOrg = await createOrganization(tempOwner.id, { name: `Temp Org ${stamp}` });

    await tombstoneOrganization(tempOrg.id, tempOwner.id);
    const tombstoned = await prisma.organization.findUnique({ where: { id: tempOrg.id } });
    expect(tombstoned?.deletedAt).not.toBeNull();
    expect(tombstoned?.purgeAfter).not.toBeNull();
    expect(await prisma.organization.findFirst({ where: { id: tempOrg.id, deletedAt: null } })).toBeNull();

    await restoreOrganization(tempOrg.id, tempOwner.id);
    const restored = await prisma.organization.findUnique({ where: { id: tempOrg.id } });
    expect(restored?.deletedAt).toBeNull();
    expect(restored?.purgeAfter).toBeNull();

    await tombstoneOrganization(tempOrg.id, tempOwner.id);
    const expired = new Date(Date.now() + DELETION_GRACE_MS + 60_000);
    const purged = await purgeExpiredEntities(expired);
    expect(purged.orgsPurged).toBeGreaterThanOrEqual(1);
    expect(await prisma.organization.findUnique({ where: { id: tempOrg.id } })).toBeNull();

    // Cleanup temp owner if still present
    await prisma.user.delete({ where: { id: tempOwner.id } }).catch(() => undefined);
  });

  it("deletes and recovers a user account within grace when not sole owner", async () => {
    const stamp = Date.now();
    const user = await createUser({
      name: "Deletable",
      email: `history-user-${stamp}@test.com`,
      password,
    });
    // Member of existing org but not sole owner
    await prisma.organizationMember.create({
      data: { organizationId, userId: user.id, role: "ANALYST" },
    });

    await tombstoneUser(user.id, password);
    const deleted = await prisma.user.findUnique({ where: { id: user.id } });
    expect(deleted?.deletedAt).not.toBeNull();

    await recoverUser(user.id);
    const recovered = await prisma.user.findUnique({ where: { id: user.id } });
    expect(recovered?.deletedAt).toBeNull();
    expect(recovered?.purgeAfter).toBeNull();

    await tombstoneUser(user.id, password);
    const expired = new Date(Date.now() + DELETION_GRACE_MS + 60_000);
    await purgeExpiredEntities(expired);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });

  it("tests Ollama connection with mocked fetch (connected + unreachable)", async () => {
    resetOllamaClient();
    const okClient = new OllamaClient({
      config: { baseUrl: "http://ollama.test", chatModel: "llama3", embedModel: "nomic-embed-text" },
      fetchImpl: (async () =>
        new Response(JSON.stringify({ models: [{ name: "llama3" }] }), { status: 200 })) as typeof fetch,
    });
    await expect(okClient.healthCheck()).resolves.toEqual({ ok: true, models: ["llama3"] });

    const badClient = new OllamaClient({
      config: { baseUrl: "http://ollama.test", chatModel: "llama3", embedModel: "nomic-embed-text" },
      fetchImpl: (async () => {
        throw new Error("network down");
      }) as typeof fetch,
    });
    const bad = await badClient.healthCheck();
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("network down");
  });
});
