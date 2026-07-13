import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as runConsensus } from "@/app/api/projects/[id]/agents/consensus/run/route";
import { POST as runExecutive } from "@/app/api/projects/[id]/agents/executive/run/route";
import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createProject } from "@/features/projects/lib/projects";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { retrieveForAgent } from "@/lib/ai/agents/retrieval";
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

const ownerEmail = `exec-owner-${Date.now()}@example.com`;
const outsiderEmail = `exec-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

const sampleChunk = {
  chunkId: "chunk-exec-1",
  documentId: "doc-exec-1",
  documentName: "Board memo.pdf",
  documentType: "PDF" as const,
  classification: "FINANCIAL" as const,
  folderId: null,
  content: "Revenue grew 18% and customer concentration remains moderate.",
  snippet: "Revenue grew 18%",
  score: 0.91,
  pageNumber: 1,
  sectionTitle: "Overview",
  mode: "hybrid" as const,
};

async function seedSpecialistRuns(count: number) {
  const types = ["FINANCIAL", "LEGAL", "COMPLIANCE", "RISK", "FRAUD"] as const;
  for (let index = 0; index < count; index += 1) {
    const agentType = types[index]!;
    await prisma.agentRun.create({
      data: {
        projectId,
        agentType,
        status: "COMPLETED",
        score: 70 + index,
        confidence: "HIGH",
        output: {
          recommendation: `${agentType} recommendation`,
          confidence: "HIGH",
        },
        citations: [
          {
            documentId: "doc-exec-1",
            chunkId: "chunk-exec-1",
            documentName: "Board memo.pdf",
            excerpt: "Revenue grew 18%",
          },
        ],
        completedAt: new Date(),
        triggeredById: ownerId,
      },
    });
  }
}

describe("executive + consensus integration", () => {
  beforeAll(async () => {
    const owner = await createUser({
      name: "Exec Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });
    ownerId = owner.id;
    await createUser({
      name: "Exec Outsider",
      email: outsiderEmail,
      password: "IntegrationTest123",
    });
    const organization = await createOrganization(owner.id, { name: "Exec Integration Org" });
    organizationId = organization.id;
    const workspace = await createWorkspace(organizationId, { name: "Exec Workspace" });
    if (!("workspace" in workspace)) throw new Error(workspace.message);
    const project = await createProject(workspace.workspace.id, {
      name: "Exec Project",
      type: "MA",
    });
    if (!("project" in project)) throw new Error(project.message);
    projectId = project.project.id;
  });

  beforeEach(async () => {
    await prisma.consensusRun.deleteMany({ where: { projectId } });
    await prisma.finding.deleteMany({ where: { projectId } });
    await prisma.agentRun.deleteMany({ where: { projectId } });
    setSession({
      user: { id: ownerId, email: ownerEmail, name: "Exec Owner" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    vi.mocked(retrieveForAgent).mockResolvedValue({
      results: [sampleChunk],
      meta: { tookMs: 5, mode: "hybrid", ollamaUsed: true, uniqueDocuments: 1 },
    });
    mockOllama.healthCheck.mockResolvedValue({ ok: true, models: ["llama3"] });
    mockOllama.healthCheck.mockClear();
    mockOllama.chat.mockClear();
  });

  afterAll(async () => {
    await prisma.consensusRun.deleteMany({ where: { projectId } });
    await prisma.finding.deleteMany({ where: { projectId } });
    await prisma.agentRun.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
    await prisma.$disconnect();
  });

  it("persists consensus from five specialist runs with mock ollama", async () => {
    await seedSpecialistRuns(5);
    mockOllama.chat.mockResolvedValue(
      JSON.stringify({
        agentOpinions: [
          { agent: "FINANCIAL", score: 1, recommendation: "drift", confidence: "LOW" },
          { agent: "LEGAL", score: 1, recommendation: "drift", confidence: "LOW" },
          { agent: "COMPLIANCE", score: 1, recommendation: "drift", confidence: "LOW" },
          { agent: "RISK", score: 1, recommendation: "drift", confidence: "LOW" },
          { agent: "FRAUD", score: 1, recommendation: "drift", confidence: "LOW" },
        ],
        agreements: [{ topic: "Growth", agents: ["FINANCIAL", "RISK"], summary: "Aligned on growth" }],
        conflicts: [
          {
            topic: "Legal risk",
            positions: [
              { agent: "LEGAL", position: "Elevated" },
              { agent: "FINANCIAL", position: "Acceptable" },
            ],
            severity: "MEDIUM",
          },
        ],
        resolutionRationale: "Growth outweighs manageable legal friction.",
        finalRecommendation: "Further Diligence",
        decisionConfidence: "MEDIUM",
        citations: [
          {
            documentId: "doc-exec-1",
            chunkId: "chunk-exec-1",
            excerpt: "Revenue grew 18%",
          },
        ],
      }),
    );

    const response = await runConsensus(
      new Request(`http://localhost/api/projects/${projectId}/agents/consensus/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const payload = (await response.json()) as {
      success: boolean;
      data?: {
        finalRecommendation: string;
        agentOpinions: Array<{ agent: string; recommendation: string; score: number | null }>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data?.finalRecommendation).toBe("Further Diligence");
    expect(payload.data?.agentOpinions[0]?.recommendation).toBe("FINANCIAL recommendation");
    expect(await prisma.consensusRun.count({ where: { projectId } })).toBe(1);
  });

  it("rejects consensus when fewer than 3 specialists completed", async () => {
    await seedSpecialistRuns(2);
    const response = await runConsensus(
      new Request(`http://localhost/api/projects/${projectId}/agents/consensus/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const payload = (await response.json()) as {
      success: boolean;
      error?: { code: string; message: string };
    };

    expect(response.status).toBe(400);
    expect(payload.error?.code).toBe("CONSENSUS_PREREQUISITE");
    expect(payload.error?.message).toMatch(/Compliance|Risk|Fraud/i);
    expect(mockOllama.chat).not.toHaveBeenCalled();
  });

  it("completes consensus as INSUFFICIENT when all specialists are insufficient", async () => {
    for (const agentType of ["FINANCIAL", "LEGAL", "COMPLIANCE"] as const) {
      await prisma.agentRun.create({
        data: {
          projectId,
          agentType,
          status: "COMPLETED",
          score: null,
          confidence: "INSUFFICIENT",
          output: {
            recommendation: "Insufficient evidence",
            confidence: "INSUFFICIENT",
          },
          citations: [],
          completedAt: new Date(),
        },
      });
    }

    const response = await runConsensus(
      new Request(`http://localhost/api/projects/${projectId}/agents/consensus/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const payload = (await response.json()) as {
      success: boolean;
      data?: { decisionConfidence: string };
    };

    expect(response.status).toBe(200);
    expect(payload.data?.decisionConfidence).toBe("INSUFFICIENT");
    expect(mockOllama.chat).not.toHaveBeenCalled();
  });

  it("persists executive markdown run and priority-action findings", async () => {
    await seedSpecialistRuns(3);
    mockOllama.chat.mockResolvedValue(`## Executive Summary
Acquire with diligence conditions. [doc:doc-exec-1:chunk:chunk-exec-1]

## Recommendation
Further Diligence

## Priority Actions
- Confirm ARR retention
- Validate litigation reserves

CONFIDENCE: HIGH`);

    const response = await runExecutive(
      new Request(`http://localhost/api/projects/${projectId}/agents/executive/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const payload = (await response.json()) as {
      success: boolean;
      data?: { status: string; agentType: string; findings: unknown[] };
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data?.agentType).toBe("EXECUTIVE");
    expect(payload.data?.status).toBe("completed");

    const run = await prisma.agentRun.findFirst({
      where: { projectId, agentType: "EXECUTIVE" },
    });
    const findings = await prisma.finding.findMany({
      where: { projectId, agentType: "EXECUTIVE" },
    });

    expect(run?.status).toBe("COMPLETED");
    expect(findings.length).toBeGreaterThanOrEqual(2);
    expect(findings.every((finding) => finding.category === "Executive")).toBe(true);
  });

  it("returns insufficient executive without calling ollama when retrieval is empty", async () => {
    vi.mocked(retrieveForAgent).mockResolvedValue({
      results: [],
      meta: { tookMs: 1, mode: "keyword", ollamaUsed: false, uniqueDocuments: 0 },
    });

    const response = await runExecutive(
      new Request(`http://localhost/api/projects/${projectId}/agents/executive/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const payload = (await response.json()) as {
      success: boolean;
      data?: { confidence: string };
    };

    expect(response.status).toBe(200);
    expect(payload.data?.confidence).toBe("INSUFFICIENT");
    expect(mockOllama.chat).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated consensus and executive requests", async () => {
    setSession(null);

    const consensusResponse = await runConsensus(
      new Request(`http://localhost/api/projects/${projectId}/agents/consensus/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const executiveResponse = await runExecutive(
      new Request(`http://localhost/api/projects/${projectId}/agents/executive/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(consensusResponse.status).toBe(401);
    expect(executiveResponse.status).toBe(401);
  });
});
