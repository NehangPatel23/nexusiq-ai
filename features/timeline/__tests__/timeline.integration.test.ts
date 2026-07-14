import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as extractTimeline } from "@/app/api/projects/[id]/timeline/extract/route";
import { GET as listTimeline, POST as createTimeline } from "@/app/api/projects/[id]/timeline/route";
import { DELETE as deleteTimeline } from "@/app/api/timeline/[id]/route";
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

const ownerEmail = `timeline-owner-${Date.now()}@example.com`;
const outsiderEmail = `timeline-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";
let chunkId = "";
let documentId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

beforeAll(async () => {
  const owner = await createUser({
    email: ownerEmail,
    password: "IntegrationTest123",
    name: "Timeline Owner",
  });
  ownerId = owner.id;
  await createUser({
    email: outsiderEmail,
    password: "IntegrationTest123",
    name: "Timeline Outsider",
  });

  const org = await createOrganization(ownerId, { name: "Timeline Org" });
  organizationId = org.id;
  const workspace = await createWorkspace(organizationId, { name: "Timeline WS" });
  if (!("workspace" in workspace)) throw new Error(workspace.message);
  const project = await createProject(workspace.workspace.id, {
    name: "Timeline Project",
    type: "MA",
  });
  if (!("project" in project)) throw new Error(project.message);
  projectId = project.project.id;

  const document = await prisma.document.create({
    data: {
      projectId,
      name: "history.pdf",
      originalName: "history.pdf",
      mimeType: "application/pdf",
      type: "OTHER",
      filePath: "history.pdf",
      fileSize: 100,
      status: "READY",
    },
  });
  documentId = document.id;
  const chunk = await prisma.documentChunk.create({
    data: {
      documentId,
      chunkIndex: 0,
      content: "On 2021-04-12 Acme closed a Series A financing of $20M with Beta Capital.",
      tokenCount: 20,
    },
  });
  chunkId = chunk.id;
});

beforeEach(() => {
  mockOllama.healthCheck.mockReset();
  mockOllama.chat.mockReset();
  mockRetrieve.mockReset();
  setSession({
    user: { id: ownerId, email: ownerEmail, name: "Timeline Owner" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  });
});

afterAll(async () => {
  await prisma.timelineEvent.deleteMany({ where: { projectId } });
  await prisma.documentChunk.deleteMany({ where: { documentId } });
  await prisma.document.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
  await prisma.workspace.deleteMany({ where: { organizationId } });
  await prisma.organizationMember.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
  await prisma.$disconnect();
});

describe("timeline API integration", () => {
  it("rejects unauthenticated extract", async () => {
    setSession(null);
    const response = await extractTimeline(
      new Request(`http://localhost/api/projects/${projectId}/timeline/extract`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(401);
  });

  it("rejects outsider", async () => {
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: outsiderEmail } });
    setSession({
      user: { id: outsider.id, email: outsiderEmail, name: "Outsider" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const response = await listTimeline(
      new Request(`http://localhost/api/projects/${projectId}/timeline`),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 503 when Ollama is down", async () => {
    mockRetrieve.mockResolvedValue({
      results: [
        {
          chunkId,
          documentId,
          documentName: "history.pdf",
          content: "On 2021-04-12 Acme closed a Series A financing.",
        },
      ],
      meta: { tookMs: 1, mode: "hybrid", ollamaUsed: false, uniqueDocuments: 1 },
    });
    mockOllama.healthCheck.mockResolvedValue({ ok: false, error: "down" });

    const response = await extractTimeline(
      new Request(`http://localhost/api/projects/${projectId}/timeline/extract`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.error.code).toBe("OLLAMA_UNAVAILABLE");
  });

  it("creates timeline events from mocked Ollama with citations", async () => {
    await prisma.timelineEvent.deleteMany({ where: { projectId } });
    mockRetrieve.mockResolvedValue({
      results: [
        {
          chunkId,
          documentId,
          documentName: "history.pdf",
          content: "On 2021-04-12 Acme closed a Series A financing of $20M with Beta Capital.",
        },
      ],
      meta: { tookMs: 1, mode: "hybrid", ollamaUsed: true, uniqueDocuments: 1 },
    });
    mockOllama.healthCheck.mockResolvedValue({ ok: true, models: ["llama3"] });
    mockOllama.chat.mockResolvedValue(
      JSON.stringify([
        {
          title: "Series A financing closed",
          description: "Acme raised $20M",
          eventDate: "2021-04-12T00:00:00.000Z",
          sourceChunkId: chunkId,
          documentId,
          category: "FUNDING",
        },
      ]),
    );

    const response = await extractTimeline(
      new Request(`http://localhost/api/projects/${projectId}/timeline/extract`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.created).toBeGreaterThanOrEqual(1);
    expect(body.data.events[0].sourceChunkId).toBe(chunkId);

    const list = await listTimeline(
      new Request(`http://localhost/api/projects/${projectId}/timeline`),
      { params: Promise.resolve({ id: projectId }) },
    );
    const listed = await list.json();
    expect(listed.data.events.length).toBeGreaterThanOrEqual(1);
  });

  it("supports manual CRUD", async () => {
    const created = await createTimeline(
      new Request(`http://localhost/api/projects/${projectId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Manual kickoff",
          eventDate: "2020-01-01T00:00:00.000Z",
          category: "OTHER",
        }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const createdBody = await created.json();
    expect(created.status).toBe(201);
    const eventId = createdBody.data.event.id as string;

    const deleted = await deleteTimeline(new Request(`http://localhost/api/timeline/${eventId}`), {
      params: Promise.resolve({ id: eventId }),
    });
    expect(deleted.status).toBe(200);
  });

  it("returns empty extract without calling Ollama when no chunks", async () => {
    mockRetrieve.mockResolvedValue({
      results: [],
      meta: { tookMs: 1, mode: "hybrid", ollamaUsed: false, uniqueDocuments: 0 },
    });

    const response = await extractTimeline(
      new Request(`http://localhost/api/projects/${projectId}/timeline/extract`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.created).toBe(0);
    expect(body.data.message).toMatch(/No document chunks/i);
    expect(mockOllama.healthCheck).not.toHaveBeenCalled();
  });
});
