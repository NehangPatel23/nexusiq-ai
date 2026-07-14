import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH as patchMissing } from "@/app/api/missing/[id]/route";
import { GET as listMissing } from "@/app/api/projects/[id]/missing/route";
import { POST as exportMissing } from "@/app/api/projects/[id]/missing/export-requests/route";
import { POST as scanMissing } from "@/app/api/projects/[id]/missing/scan/route";
import { GET as risksSummary } from "@/app/api/projects/[id]/risks/summary/route";
import { PATCH as patchFinding } from "@/app/api/findings/[id]/route";
import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createProject } from "@/features/projects/lib/projects";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const { mockOllama } = vi.hoisted(() => ({
  mockOllama: {
    healthCheck: vi.fn(),
    chat: vi.fn(),
  },
}));

vi.mock("@/lib/ai/ollama-client", () => ({
  getOllamaClient: () => mockOllama,
  isOllamaConfigured: () => true,
  resetOllamaClient: vi.fn(),
}));

const ownerEmail = `missing-owner-${Date.now()}@example.com`;
const outsiderEmail = `missing-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";
let riskProjectId = "";
let findingId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

beforeAll(async () => {
  const owner = await createUser({
    email: ownerEmail,
    password: "IntegrationTest123",
    name: "Missing Owner",
  });
  ownerId = owner.id;
  await createUser({
    email: outsiderEmail,
    password: "IntegrationTest123",
    name: "Missing Outsider",
  });

  const org = await createOrganization(ownerId, { name: "Missing Org" });
  organizationId = org.id;
  const workspace = await createWorkspace(organizationId, { name: "Missing WS" });
  if (!("workspace" in workspace)) throw new Error(workspace.message);

  const project = await createProject(workspace.workspace.id, {
    name: "Vendor DD Project",
    type: "VENDOR_DD",
  });
  if (!("project" in project)) throw new Error(project.message);
  projectId = project.project.id;

  // Only insurance-ish doc — SOC2 etc. should appear as gaps
  await prisma.document.create({
    data: {
      projectId,
      name: "insurance-certificate.pdf",
      originalName: "insurance-certificate.pdf",
      mimeType: "application/pdf",
      type: "OTHER",
      classification: "COMPLIANCE",
      filePath: "insurance.pdf",
      fileSize: 50,
      status: "READY",
      tags: ["insurance"],
    },
  });

  const riskProject = await createProject(workspace.workspace.id, {
    name: "Risk Synthesis Project",
    type: "MA",
  });
  if (!("project" in riskProject)) throw new Error(riskProject.message);
  riskProjectId = riskProject.project.id;

  const run = await prisma.agentRun.create({
    data: {
      projectId: riskProjectId,
      agentType: "RISK",
      status: "COMPLETED",
      score: 62,
      confidence: "MEDIUM",
      output: {
        enterpriseRiskScore: 62,
        categoryScores: { financial: 70, legal: 40 },
        findings: [],
      },
      completedAt: new Date(),
    },
  });

  const finding = await prisma.finding.create({
    data: {
      projectId: riskProjectId,
      agentType: "RISK",
      agentRunId: run.id,
      category: "financial",
      title: "Revenue concentration",
      description: "Top customer >40% of revenue",
      severity: "HIGH",
      status: "OPEN",
    },
  });
  findingId = finding.id;
});

beforeEach(() => {
  mockOllama.healthCheck.mockReset();
  mockOllama.chat.mockReset();
  mockOllama.healthCheck.mockResolvedValue({ ok: false, error: "down" });
  setSession({
    user: { id: ownerId, email: ownerEmail, name: "Missing Owner" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  });
});

afterAll(async () => {
  await prisma.missingItem.deleteMany({ where: { projectId } });
  await prisma.finding.deleteMany({ where: { projectId: riskProjectId } });
  await prisma.agentRun.deleteMany({ where: { projectId: riskProjectId } });
  await prisma.document.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: { in: [projectId, riskProjectId] } } });
  await prisma.workspace.deleteMany({ where: { organizationId } });
  await prisma.organizationMember.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
  await prisma.$disconnect();
});

describe("missing + risks API integration", () => {
  it("rejects unauthenticated missing scan", async () => {
    setSession(null);
    const response = await scanMissing(
      new Request(`http://localhost/api/projects/${projectId}/missing/scan`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects outsider missing list", async () => {
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: outsiderEmail } });
    setSession({
      user: { id: outsider.id, email: outsiderEmail, name: "Outsider" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const response = await listMissing(
      new Request(`http://localhost/api/projects/${projectId}/missing`),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(403);
  });

  it("scans missing info without Ollama and inserts gaps", async () => {
    await prisma.missingItem.deleteMany({ where: { projectId } });
    const response = await scanMissing(
      new Request(`http://localhost/api/projects/${projectId}/missing/scan`, {
        method: "POST",
        body: JSON.stringify({ force: true, polishFollowUps: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.created).toBeGreaterThan(0);
    expect(body.data.checklist.some((c: { found: boolean }) => c.found)).toBe(true);
    expect(body.data.items.some((i: { title: string }) => /soc/i.test(i.title))).toBe(true);
    // Ollama polish attempted but health failed — templates kept
    expect(mockOllama.chat).not.toHaveBeenCalled();

    const itemId = body.data.items[0].id as string;
    const patch = await patchMissing(
      new Request(`http://localhost/api/missing/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REQUESTED" }),
      }),
      { params: Promise.resolve({ id: itemId }) },
    );
    expect(patch.status).toBe(200);
    const patchBody = await patch.json();
    expect(patchBody.data.item.status).toBe("REQUESTED");

    const exportRes = await exportMissing(
      new Request(`http://localhost/api/projects/${projectId}/missing/export-requests`, {
        method: "POST",
        body: JSON.stringify({ format: "markdown" }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers.get("content-type")).toContain("text/markdown");
    const text = await exportRes.text();
    expect(text).toContain("Follow-up");
  });

  it("returns risks summary from seeded findings without Ollama", async () => {
    const response = await risksSummary(
      new Request(`http://localhost/api/projects/${riskProjectId}/risks/summary`),
      { params: Promise.resolve({ id: riskProjectId }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.summary.enterpriseRiskScore).toBe(62);
    expect(body.data.summary.scoreSource).toBe("risk_agent");
    expect(body.data.summary.openFindingCount).toBeGreaterThanOrEqual(1);
    expect(body.data.summary.hasAgentRuns).toBe(true);

    const findingPatch = await patchFinding(
      new Request(`http://localhost/api/findings/${findingId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACKNOWLEDGED" }),
      }),
      { params: Promise.resolve({ id: findingId }) },
    );
    expect(findingPatch.status).toBe(200);

    const severityPatch = await patchFinding(
      new Request(`http://localhost/api/findings/${findingId}`, {
        method: "PATCH",
        body: JSON.stringify({ severity: "CRITICAL" }),
      }),
      { params: Promise.resolve({ id: findingId }) },
    );
    expect(severityPatch.status).toBe(200);
    const severityBody = await severityPatch.json();
    expect(severityBody.data.finding.severity).toBe("CRITICAL");
  });
});
