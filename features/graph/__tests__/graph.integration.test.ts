import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as extractGraph } from "@/app/api/projects/[id]/graph/extract/route";
import { GET as getNode } from "@/app/api/projects/[id]/graph/nodes/[entityId]/route";
import { GET as getGraph } from "@/app/api/projects/[id]/graph/route";
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

vi.mock("@/lib/ai/ollama-client", () => ({
  getOllamaClient: () => mockOllama,
  isOllamaConfigured: () => true,
  resetOllamaClient: vi.fn(),
}));

vi.mock("@/lib/ai/retrieval", () => ({
  retrieveForRag: (...args: unknown[]) => mockRetrieve(...args),
}));

const ownerEmail = `graph-owner-${Date.now()}@example.com`;
const outsiderEmail = `graph-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";
let chunkId = "";
let documentId = "";
let nerEntityId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

beforeAll(async () => {
  const owner = await createUser({
    email: ownerEmail,
    password: "IntegrationTest123",
    name: "Graph Owner",
  });
  ownerId = owner.id;
  await createUser({
    email: outsiderEmail,
    password: "IntegrationTest123",
    name: "Graph Outsider",
  });

  const org = await createOrganization(ownerId, { name: "Graph Org" });
  organizationId = org.id;
  const workspace = await createWorkspace(organizationId, { name: "Graph WS" });
  if (!("workspace" in workspace)) throw new Error(workspace.message);
  const project = await createProject(workspace.workspace.id, {
    name: "Graph Project",
    type: "MA",
  });
  if (!("project" in project)) throw new Error(project.message);
  projectId = project.project.id;

  const document = await prisma.document.create({
    data: {
      projectId,
      name: "org-chart.pdf",
      originalName: "org-chart.pdf",
      mimeType: "application/pdf",
      type: "OTHER",
      filePath: "org-chart.pdf",
      fileSize: 100,
      status: "READY",
    },
  });
  documentId = document.id;
  const chunk = await prisma.documentChunk.create({
    data: {
      documentId,
      chunkIndex: 0,
      content: "Acme Corp employs Jane Doe as CEO.",
      tokenCount: 12,
    },
  });
  chunkId = chunk.id;

  const acme = await prisma.entity.create({
    data: { projectId, name: "Acme Corp", type: "ORGANIZATION" },
  });
  nerEntityId = acme.id;
  const jane = await prisma.entity.create({
    data: { projectId, name: "Jane Doe", type: "PERSON" },
  });
  await prisma.entityRelation.create({
    data: {
      projectId,
      sourceEntityId: acme.id,
      targetEntityId: jane.id,
      relationType: "employs",
      confidence: 0.8,
      sourceChunkId: chunkId,
    },
  });
});

beforeEach(() => {
  mockOllama.healthCheck.mockReset();
  mockOllama.chat.mockReset();
  mockRetrieve.mockReset();
  setSession({
    user: { id: ownerId, email: ownerEmail, name: "Graph Owner" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  });
});

afterAll(async () => {
  await prisma.entityRelation.deleteMany({ where: { projectId } });
  await prisma.entity.deleteMany({ where: { projectId } });
  await prisma.documentChunk.deleteMany({ where: { documentId } });
  await prisma.document.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
  await prisma.workspace.deleteMany({ where: { organizationId } });
  await prisma.organizationMember.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
  await prisma.$disconnect();
});

describe("graph API integration", () => {
  it("GET graph returns existing NER entities without Ollama", async () => {
    const response = await getGraph(new Request(`http://localhost/api/projects/${projectId}/graph`), {
      params: Promise.resolve({ id: projectId }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.nodes.length).toBeGreaterThanOrEqual(2);
    expect(body.data.edges.length).toBeGreaterThanOrEqual(1);
    expect(mockOllama.healthCheck).not.toHaveBeenCalled();
  });

  it("returns entity detail", async () => {
    const response = await getNode(
      new Request(`http://localhost/api/projects/${projectId}/graph/nodes/${nerEntityId}`),
      { params: Promise.resolve({ id: projectId, entityId: nerEntityId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.entity.id).toBe(nerEntityId);
    expect(body.data.entity.relations.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects outsider", async () => {
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: outsiderEmail } });
    setSession({
      user: { id: outsider.id, email: outsiderEmail, name: "Outsider" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const response = await getGraph(new Request(`http://localhost/api/projects/${projectId}/graph`), {
      params: Promise.resolve({ id: projectId }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 503 when Ollama is down on extract", async () => {
    mockRetrieve.mockResolvedValue({
      results: [
        {
          chunkId,
          documentId,
          documentName: "org-chart.pdf",
          content: "Acme Corp employs Jane Doe as CEO.",
        },
      ],
      meta: { tookMs: 1, mode: "hybrid", ollamaUsed: false, uniqueDocuments: 1 },
    });
    mockOllama.healthCheck.mockResolvedValue({ ok: false, error: "down" });

    const response = await extractGraph(
      new Request(`http://localhost/api/projects/${projectId}/graph/extract`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.error.code).toBe("OLLAMA_UNAVAILABLE");
  });

  it("upserts entities and relations from mocked Ollama", async () => {
    mockRetrieve.mockResolvedValue({
      results: [
        {
          chunkId,
          documentId,
          documentName: "org-chart.pdf",
          content: "Acme Corp employs Jane Doe as CEO. Beta Ventures invested in Acme Corp.",
        },
      ],
      meta: { tookMs: 1, mode: "hybrid", ollamaUsed: true, uniqueDocuments: 1 },
    });
    mockOllama.healthCheck.mockResolvedValue({ ok: true, models: ["llama3"] });
    mockOllama.chat.mockResolvedValue(
      JSON.stringify({
        entities: [
          { name: "Acme Corp", type: "organization" },
          { name: "Beta Ventures", type: "organization" },
          { name: "Jane Doe", type: "person" },
        ],
        relations: [
          {
            source: "Beta Ventures",
            target: "Acme Corp",
            type: "invested_in",
            confidence: 0.91,
            sourceChunkId: chunkId,
          },
        ],
      }),
    );

    const response = await extractGraph(
      new Request(`http://localhost/api/projects/${projectId}/graph/extract`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.relationsCreated).toBeGreaterThanOrEqual(1);

    const beta = await prisma.entity.findFirst({
      where: { projectId, name: { equals: "Beta Ventures", mode: "insensitive" } },
    });
    expect(beta).toBeTruthy();
  });
});
