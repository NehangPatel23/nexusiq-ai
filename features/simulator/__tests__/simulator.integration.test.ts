import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as listSimulations, POST as createSimulation } from "@/app/api/projects/[id]/simulations/route";
import { GET as getSimulation } from "@/app/api/simulations/[id]/route";
import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createProject } from "@/features/projects/lib/projects";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const { mockOllama, mockRetrieve } = vi.hoisted(() => ({
  mockOllama: {
    healthCheck: vi.fn(),
    chat: vi.fn(),
  },
  mockRetrieve: vi.fn(),
}));

vi.mock("@/lib/ai/ollama-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/ollama-client")>();
  return {
    ...actual,
    getOllamaClient: () => mockOllama,
    isOllamaConfigured: () => true,
    resetOllamaClient: vi.fn(),
  };
});

vi.mock("@/lib/ai/retrieval", () => ({
  retrieveForRag: (...args: unknown[]) => mockRetrieve(...args),
}));

const ownerEmail = `sim-owner-${Date.now()}@example.com`;
const outsiderEmail = `sim-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

async function seedBaselineAgents() {
  await prisma.agentRun.create({
    data: {
      projectId,
      agentType: "FINANCIAL",
      status: "COMPLETED",
      score: 72,
      confidence: "HIGH",
      output: { recommendation: "Proceed with caution", financialHealthScore: 72 },
      completedAt: new Date(),
    },
  });
  await prisma.agentRun.create({
    data: {
      projectId,
      agentType: "RISK",
      status: "COMPLETED",
      score: 38,
      confidence: "MEDIUM",
      output: { recommendation: "Monitor litigation", enterpriseRiskScore: 38 },
      completedAt: new Date(),
    },
  });
}

beforeAll(async () => {
  const owner = await createUser({
    email: ownerEmail,
    password: "IntegrationTest123",
    name: "Sim Owner",
  });
  ownerId = owner.id;
  await createUser({
    email: outsiderEmail,
    password: "IntegrationTest123",
    name: "Sim Outsider",
  });

  const org = await createOrganization(ownerId, { name: "Sim Org" });
  organizationId = org.id;
  const workspace = await createWorkspace(organizationId, { name: "Sim WS" });
  if (!("workspace" in workspace)) throw new Error(workspace.message);
  const project = await createProject(workspace.workspace.id, {
    name: "Sim Project",
    type: "MA",
  });
  if (!("project" in project)) throw new Error(project.message);
  projectId = project.project.id;
});

beforeEach(async () => {
  mockOllama.healthCheck.mockReset();
  mockOllama.chat.mockReset();
  mockRetrieve.mockReset();
  await prisma.simulationRun.deleteMany({ where: { projectId } });
  await prisma.agentRun.deleteMany({ where: { projectId } });
  setSession({
    user: { id: ownerId, email: ownerEmail, name: "Sim Owner" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  });
});

afterAll(async () => {
  await prisma.simulationRun.deleteMany({ where: { projectId } });
  await prisma.agentRun.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
  await prisma.workspace.deleteMany({ where: { organizationId } });
  await prisma.organizationMember.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
  await prisma.$disconnect();
});

describe("simulations API integration", () => {
  it("rejects unauthenticated create", async () => {
    setSession(null);
    const response = await createSimulation(
      new Request(`http://localhost/api/projects/${projectId}/simulations`, {
        method: "POST",
        body: JSON.stringify({ scenarioName: "revenue_decline", parameters: {} }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects outsider list", async () => {
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: outsiderEmail } });
    setSession({
      user: { id: outsider.id, email: outsiderEmail, name: "Outsider" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const response = await listSimulations(
      new Request(`http://localhost/api/projects/${projectId}/simulations`),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 400 SIMULATION_PREREQUISITE without FINANCIAL/RISK runs", async () => {
    mockOllama.healthCheck.mockResolvedValue({ ok: true, models: ["llama3"] });
    const response = await createSimulation(
      new Request(`http://localhost/api/projects/${projectId}/simulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioName: "revenue_decline", parameters: {} }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("SIMULATION_PREREQUISITE");
    expect(mockOllama.chat).not.toHaveBeenCalled();
  });

  it("returns 503 when Ollama is down", async () => {
    await seedBaselineAgents();
    mockOllama.healthCheck.mockResolvedValue({ ok: false, error: "down" });

    const response = await createSimulation(
      new Request(`http://localhost/api/projects/${projectId}/simulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioName: "revenue_decline", parameters: {} }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("OLLAMA_UNAVAILABLE");
    expect(mockOllama.chat).not.toHaveBeenCalled();
  });

  it("persists SimulationRun with delta when Ollama succeeds", async () => {
    await seedBaselineAgents();
    mockOllama.healthCheck.mockResolvedValue({ ok: true, models: ["llama3"] });
    mockRetrieve.mockResolvedValue({ results: [] });
    mockOllama.chat.mockResolvedValue(
      JSON.stringify({
        scenarioSummary: "Revenue declines 20%",
        adjustedFinancialScore: 58,
        adjustedRiskScore: 51,
        keyImpacts: [
          { area: "Cash flow", description: "Working capital tightens", severity: "HIGH" },
        ],
        updatedRecommendation: "Renegotiate payment terms",
        deltaFromBaseline: "Financial score drops; risk rises",
        confidence: "LOW",
      }),
    );

    const response = await createSimulation(
      new Request(`http://localhost/api/projects/${projectId}/simulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioName: "revenue_decline",
          parameters: { revenueChangePct: -20 },
        }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.simulatedScores.financial).toBe(58);
    expect(body.data.delta.financialDelta).toBe(-14);
    expect(body.data.baselineRunIds).toHaveLength(2);

    const stored = await prisma.simulationRun.findUnique({ where: { id: body.data.id } });
    expect(stored).not.toBeNull();

    const detail = await getSimulation(
      new Request(`http://localhost/api/simulations/${body.data.id}`),
      { params: Promise.resolve({ id: body.data.id }) },
    );
    expect(detail.status).toBe(200);
  });
});
