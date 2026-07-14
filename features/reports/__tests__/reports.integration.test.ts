import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as listReports, POST as createReport } from "@/app/api/projects/[id]/reports/route";
import { GET as getReport, DELETE as deleteReportRoute } from "@/app/api/reports/[id]/route";
import { GET as exportReport } from "@/app/api/reports/[id]/export/route";
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

const ownerEmail = `reports-owner-${Date.now()}@example.com`;
const outsiderEmail = `reports-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

async function seedIntelligence() {
  await prisma.finding.deleteMany({ where: { projectId } });
  await prisma.consensusRun.deleteMany({ where: { projectId } });
  await prisma.agentRun.deleteMany({ where: { projectId } });

  const execRun = await prisma.agentRun.create({
    data: {
      projectId,
      agentType: "EXECUTIVE",
      status: "COMPLETED",
      score: 74,
      confidence: "HIGH",
      output: {
        markdown: "## Executive Summary\n\nSolid deal with manageable risks.",
        executiveSummary: "Solid deal with manageable risks.",
        recommendation: "Proceed with conditions",
        priorityActions: ["Validate customer concentration", "Review change-of-control clauses"],
        confidence: "HIGH",
      },
      citations: [
        {
          documentId: "doc-1",
          chunkId: "chunk-1",
          documentName: "Memo.pdf",
          excerpt: "ARR grew 22% YoY.",
        },
      ],
      completedAt: new Date(),
      triggeredById: ownerId,
    },
  });

  await prisma.agentRun.create({
    data: {
      projectId,
      agentType: "RISK",
      status: "COMPLETED",
      score: 61,
      confidence: "MEDIUM",
      output: {
        recommendation: "Monitor operational concentration",
        enterpriseRiskScore: 61,
        riskHeatmap: [{ category: "Operational", severity: "HIGH", count: 2 }],
        confidence: "MEDIUM",
      },
      completedAt: new Date(),
      triggeredById: ownerId,
    },
  });

  await prisma.finding.create({
    data: {
      projectId,
      agentType: "RISK",
      agentRunId: execRun.id,
      category: "Operational",
      title: "Key person dependency",
      description: "CEO owns majority of customer relationships.",
      severity: "HIGH",
      documentId: "doc-1",
      sourceChunkId: "chunk-1",
      status: "OPEN",
    },
  });

  await prisma.consensusRun.create({
    data: {
      projectId,
      agentRunIds: [execRun.id],
      finalRecommendation: "Proceed with conditions",
      decisionConfidence: "HIGH",
      agreements: [{ topic: "Growth", summary: "Revenue trajectory supported" }],
      conflicts: [],
      resolutionRationale: "Upside outweighs concentrated risks with caveats.",
      agentOpinions: [],
      citations: [],
      triggeredById: ownerId,
    },
  });
}

describe("reports API integration", () => {
  beforeAll(async () => {
    const owner = await createUser({
      name: "Reports Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });
    ownerId = owner.id;
    await createUser({
      name: "Reports Outsider",
      email: outsiderEmail,
      password: "IntegrationTest123",
    });
    const organization = await createOrganization(owner.id, { name: "Reports Integration Org" });
    organizationId = organization.id;
    const workspace = await createWorkspace(organizationId, { name: "Reports Workspace" });
    if (!("workspace" in workspace)) throw new Error(workspace.message);
    const project = await createProject(workspace.workspace.id, {
      name: "Reports Project",
      type: "MA",
    });
    if (!("project" in project)) throw new Error(project.message);
    projectId = project.project.id;
  });

  beforeEach(async () => {
    await prisma.report.deleteMany({ where: { projectId } });
    setSession({
      user: { id: ownerId, email: ownerEmail, name: "Reports Owner" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    mockOllama.healthCheck.mockReset();
    mockOllama.chat.mockReset();
  });

  afterAll(async () => {
    await prisma.report.deleteMany({ where: { projectId } });
    await prisma.finding.deleteMany({ where: { projectId } });
    await prisma.consensusRun.deleteMany({ where: { projectId } });
    await prisma.agentRun.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    setSession(null);
    const response = await listReports(new Request("http://localhost"), {
      params: Promise.resolve({ id: projectId }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 403 for outsider", async () => {
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: outsiderEmail } });
    setSession({
      user: { id: outsider.id, email: outsiderEmail, name: "Outsider" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const response = await listReports(new Request("http://localhost"), {
      params: Promise.resolve({ id: projectId }),
    });
    expect(response.status).toBe(403);
  });

  it("generates RISK_REGISTER without calling Ollama", async () => {
    await seedIntelligence();

    const response = await createReport(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "RISK_REGISTER" }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.reportType).toBe("RISK_REGISTER");
    expect(json.data.contentPreview).toContain("Key person dependency");
    expect(mockOllama.chat).not.toHaveBeenCalled();
    expect(mockOllama.healthCheck).not.toHaveBeenCalled();
  });

  it("generates EXECUTIVE by reusing executive markdown without Ollama", async () => {
    await seedIntelligence();

    const response = await createReport(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "EXECUTIVE" }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.contentPreview).toContain("Solid deal with manageable risks.");
    expect(mockOllama.chat).not.toHaveBeenCalled();

    const detail = await getReport(new Request("http://localhost"), {
      params: Promise.resolve({ id: json.data.reportId }),
    });
    const detailJson = await detail.json();
    expect(detailJson.data.report.content).toContain("Consensus Recommendation");
  });

  it("returns 503 when force regenerate needs Ollama and it is down", async () => {
    await seedIntelligence();
    mockOllama.healthCheck.mockResolvedValue({ ok: false, error: "down" });

    const response = await createReport(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "BOARD", forceRegenerate: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.error.code).toBe("OLLAMA_UNAVAILABLE");
  });

  it("exports markdown with correct content type", async () => {
    await seedIntelligence();
    const created = await createReport(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "ACTION_PLAN" }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const createdJson = await created.json();
    const reportId = createdJson.data.reportId as string;

    const response = await exportReport(
      new Request(`http://localhost/api/reports/${reportId}/export?format=md`),
      { params: Promise.resolve({ id: reportId }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("markdown");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    const text = await response.text();
    expect(text.length).toBeGreaterThan(20);
  });

  it("deletes report for owner", async () => {
    await seedIntelligence();
    const created = await createReport(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "AUDIT" }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const createdJson = await created.json();
    const reportId = createdJson.data.reportId as string;

    const response = await deleteReportRoute(
      new Request("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ id: reportId }) },
    );
    expect(response.status).toBe(200);
    expect(await prisma.report.findUnique({ where: { id: reportId } })).toBeNull();
  });

  it("renames and duplicates a report", async () => {
    await seedIntelligence();
    const { PATCH: renameRoute, POST: duplicateRoute } = await import(
      "@/app/api/reports/[id]/route"
    );
    const created = await createReport(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: "EXECUTIVE", title: "Original Title" }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const createdJson = await created.json();
    const reportId = createdJson.data.reportId as string;

    const renamed = await renameRoute(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Renamed Title" }),
      }),
      { params: Promise.resolve({ id: reportId }) },
    );
    expect(renamed.status).toBe(200);
    const renamedJson = await renamed.json();
    expect(renamedJson.data.report.title).toBe("Renamed Title");

    const duplicated = await duplicateRoute(
      new Request("http://localhost?action=duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: reportId }) },
    );
    expect(duplicated.status).toBe(201);
    const dupJson = await duplicated.json();
    expect(dupJson.data.report.title).toContain("copy");
    expect(dupJson.data.report.id).not.toBe(reportId);
  });
});
