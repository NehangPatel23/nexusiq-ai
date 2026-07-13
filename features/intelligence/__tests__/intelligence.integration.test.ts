import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as runFinancial } from "@/app/api/projects/[id]/agents/financial/run/route";
import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { countOpenFindingsBySeverityForProject } from "@/features/intelligence/lib/findings-stats";
import { createProject } from "@/features/projects/lib/projects";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { retrieveForAgent } from "@/lib/ai/agents/retrieval";
import { OllamaUnavailableError, runAgent } from "@/lib/ai/agents/run-agent";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/ai/agents/retrieval", () => ({ retrieveForAgent: vi.fn() }));

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

const ownerEmail = `intel-owner-${Date.now()}@example.com`;
const outsiderEmail = `intel-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

const sampleChunk = {
  chunkId: "chunk-1",
  documentId: "doc-1",
  documentName: "Financials.pdf",
  documentType: "PDF" as const,
  classification: "FINANCIAL" as const,
  folderId: null,
  content: "Revenue grew 12% year over year.",
  snippet: "Revenue grew 12%",
  score: 0.9,
  pageNumber: 1,
  sectionTitle: "Summary",
  mode: "hybrid" as const,
};

describe("intelligence agent integration", () => {
  beforeAll(async () => {
    const owner = await createUser({
      name: "Intel Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });
    ownerId = owner.id;
    await createUser({
      name: "Intel Outsider",
      email: outsiderEmail,
      password: "IntegrationTest123",
    });
    const organization = await createOrganization(owner.id, { name: "Intel Integration Org" });
    organizationId = organization.id;
    const workspace = await createWorkspace(organizationId, { name: "Intel Workspace" });
    if (!("workspace" in workspace)) throw new Error(workspace.message);
    const project = await createProject(workspace.workspace.id, {
      name: "Intel Project",
      type: "MA",
    });
    if (!("project" in project)) throw new Error(project.message);
    projectId = project.project.id;
  });

  beforeEach(async () => {
    await prisma.finding.deleteMany({ where: { projectId } });
    await prisma.agentRun.deleteMany({ where: { projectId } });
    setSession({
      user: { id: ownerId, email: ownerEmail, name: "Intel Owner" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    vi.mocked(retrieveForAgent).mockResolvedValue({
      results: [sampleChunk],
      meta: { tookMs: 5, mode: "hybrid", ollamaUsed: true, uniqueDocuments: 1 },
    });
    mockOllama.healthCheck.mockResolvedValue({ ok: true, models: ["llama3"] });
    mockOllama.healthCheck.mockClear();
    mockOllama.chat.mockClear();
    mockOllama.chat.mockResolvedValue(
      JSON.stringify({
        financialHealthScore: 78,
        revenueAnalysis: "Revenue increased 12%.",
        recommendation: "Continue monitoring margins.",
        confidence: "HIGH",
        anomalies: [
          {
            title: "Margin pressure",
            description: "Operating margin compressed.",
            severity: "MEDIUM",
            sourceChunkId: "chunk-1",
            documentId: "doc-1",
          },
        ],
      }),
    );
  });

  afterAll(async () => {
    await prisma.finding.deleteMany({ where: { projectId } });
    await prisma.agentRun.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
    await prisma.$disconnect();
  });

  it("persists agent run and findings from mocked ollama output", async () => {
    const result = await runAgent(projectId, "FINANCIAL", {
      retrieve: retrieveForAgent,
      ollama: mockOllama,
    });

    expect(result.score).toBe(78);
    expect(result.findings).toHaveLength(1);
    expect(mockOllama.chat).toHaveBeenCalledOnce();
  });

  it("completes with insufficient evidence without calling ollama", async () => {
    vi.mocked(retrieveForAgent).mockResolvedValue({
      results: [],
      meta: { tookMs: 1, mode: "keyword", ollamaUsed: false, uniqueDocuments: 0 },
    });

    const result = await runAgent(projectId, "FINANCIAL", {
      retrieve: retrieveForAgent,
      ollama: mockOllama,
    });

    expect(result.confidence).toBe("INSUFFICIENT");
    expect(result.score).toBeNull();
    expect(result.findings).toHaveLength(0);
    expect(mockOllama.chat).not.toHaveBeenCalled();
    expect(mockOllama.healthCheck).not.toHaveBeenCalled();
  });

  it("returns 503 when ollama is unavailable", async () => {
    mockOllama.healthCheck.mockResolvedValue({ ok: false, error: "down" });

    await expect(
      runAgent(projectId, "FINANCIAL", {
        retrieve: retrieveForAgent,
        ollama: mockOllama,
      }),
    ).rejects.toBeInstanceOf(OllamaUnavailableError);
  });

  it("runs financial agent API and persists rows", async () => {
    const response = await runFinancial(
      new Request(`http://localhost/api/projects/${projectId}/agents/financial/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    const payload = (await response.json()) as { success: boolean; data?: { status: string } };
    const runs = await prisma.agentRun.findMany({ where: { projectId, agentType: "FINANCIAL" } });
    const findings = await prisma.finding.findMany({ where: { projectId, agentType: "FINANCIAL" } });

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("COMPLETED");
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects unauthenticated financial run requests", async () => {
    setSession(null);
    const response = await runFinancial(
      new Request(`http://localhost/api/projects/${projectId}/agents/financial/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns a recent completed run without calling ollama again", async () => {
    const first = await runFinancial(
      new Request(`http://localhost/api/projects/${projectId}/agents/financial/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(first.status).toBe(200);
    expect(mockOllama.chat).toHaveBeenCalledOnce();

    mockOllama.chat.mockClear();

    const second = await runFinancial(
      new Request(`http://localhost/api/projects/${projectId}/agents/financial/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const payload = (await second.json()) as {
      success: boolean;
      data?: { cached?: boolean; score?: number };
    };

    expect(second.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data?.cached).toBe(true);
    expect(payload.data?.score).toBe(78);
    expect(mockOllama.chat).not.toHaveBeenCalled();
    expect(await prisma.agentRun.count({ where: { projectId, agentType: "FINANCIAL" } })).toBe(1);
  });

  it("supersedes older findings when the same agent is re-run", async () => {
    const runOnce = () =>
      runFinancial(
        new Request(`http://localhost/api/projects/${projectId}/agents/financial/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }),
        { params: Promise.resolve({ id: projectId }) },
      );

    await runOnce();
    await runOnce();
    await runOnce();

    const [openRows, supersededRows] = await Promise.all([
      prisma.finding.count({ where: { projectId, status: "OPEN" } }),
      prisma.finding.count({ where: { projectId, status: "SUPERSEDED" } }),
    ]);

    expect(openRows).toBe(1);
    expect(supersededRows).toBe(2);

    // The dashboard stats must reflect current state: the latest run only.
    const counts = await countOpenFindingsBySeverityForProject(projectId);
    expect(counts).toEqual({ critical: 0, high: 0, medium: 1, low: 0 });
  });

  it("creates notifications and audit events when a run completes", async () => {
    mockOllama.chat.mockResolvedValueOnce(
      JSON.stringify({
        financialHealthScore: 55,
        revenueAnalysis: "Revenue declined.",
        recommendation: "Investigate customer churn.",
        confidence: "MEDIUM",
        anomalies: [
          {
            title: "Revenue decline",
            description: "Top-line revenue fell quarter over quarter.",
            severity: "HIGH",
            sourceChunkId: "chunk-1",
            documentId: "doc-1",
          },
        ],
      }),
    );

    await prisma.notification.deleteMany({ where: { userId: ownerId } });
    await prisma.dataRoomAuditEvent.deleteMany({ where: { projectId } });

    const response = await runFinancial(
      new Request(`http://localhost/api/projects/${projectId}/agents/financial/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(200);

    const notifications = await prisma.notification.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: "asc" },
    });
    const auditEvents = await prisma.dataRoomAuditEvent.findMany({
      where: { projectId, action: "AGENT_RUN_COMPLETED" },
    });

    expect(notifications.some((notification) => notification.type === "SYSTEM")).toBe(true);
    expect(notifications.some((notification) => notification.type === "RISK_FOUND")).toBe(true);
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.resourceType).toBe("PROJECT");
  });
});
