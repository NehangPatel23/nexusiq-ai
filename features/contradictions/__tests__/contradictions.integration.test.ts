import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH as patchContradiction } from "@/app/api/contradictions/[id]/route";
import { GET as listContradictions } from "@/app/api/projects/[id]/contradictions/route";
import { POST as scanContradictions } from "@/app/api/projects/[id]/contradictions/scan/route";
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

const ownerEmail = `contra-owner-${Date.now()}@example.com`;
const outsiderEmail = `contra-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";
let docAId = "";
let docBId = "";
let chunkAId = "";
let chunkBId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

beforeAll(async () => {
  const owner = await createUser({
    email: ownerEmail,
    password: "IntegrationTest123",
    name: "Contra Owner",
  });
  ownerId = owner.id;
  await createUser({
    email: outsiderEmail,
    password: "IntegrationTest123",
    name: "Contra Outsider",
  });

  const org = await createOrganization(ownerId, { name: "Contra Org" });
  organizationId = org.id;
  const workspace = await createWorkspace(organizationId, { name: "Contra WS" });
  if (!("workspace" in workspace)) throw new Error(workspace.message);
  const project = await createProject(workspace.workspace.id, {
    name: "Contra Project",
    type: "MA",
  });
  if (!("project" in project)) throw new Error(project.message);
  projectId = project.project.id;

  const docA = await prisma.document.create({
    data: {
      projectId,
      name: "term-sheet.pdf",
      originalName: "term-sheet.pdf",
      mimeType: "application/pdf",
      type: "OTHER",
      filePath: "term-sheet.pdf",
      fileSize: 100,
      status: "READY",
    },
  });
  const docB = await prisma.document.create({
    data: {
      projectId,
      name: "spa.pdf",
      originalName: "spa.pdf",
      mimeType: "application/pdf",
      type: "OTHER",
      filePath: "spa.pdf",
      fileSize: 100,
      status: "READY",
    },
  });
  docAId = docA.id;
  docBId = docB.id;

  const chunkA = await prisma.documentChunk.create({
    data: {
      documentId: docAId,
      chunkIndex: 0,
      content: "Closing date is 2024-01-15. Purchase price $10,000,000.",
      tokenCount: 20,
    },
  });
  const chunkB = await prisma.documentChunk.create({
    data: {
      documentId: docBId,
      chunkIndex: 0,
      content: "Closing date is 2024-03-01. Purchase price $12,000,000.",
      tokenCount: 20,
    },
  });
  chunkAId = chunkA.id;
  chunkBId = chunkB.id;
});

beforeEach(() => {
  mockOllama.healthCheck.mockReset();
  mockOllama.chat.mockReset();
  mockRetrieve.mockReset();
  setSession({
    user: { id: ownerId, email: ownerEmail, name: "Contra Owner" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  });
});

afterAll(async () => {
  await prisma.contradiction.deleteMany({ where: { projectId } });
  await prisma.documentChunk.deleteMany({
    where: { documentId: { in: [docAId, docBId] } },
  });
  await prisma.document.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
  await prisma.workspace.deleteMany({ where: { organizationId } });
  await prisma.organizationMember.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
  await prisma.$disconnect();
});

describe("contradictions API integration", () => {
  it("rejects unauthenticated scan", async () => {
    setSession(null);
    const response = await scanContradictions(
      new Request(`http://localhost/api/projects/${projectId}/contradictions/scan`, {
        method: "POST",
        body: "{}",
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
    const response = await listContradictions(
      new Request(`http://localhost/api/projects/${projectId}/contradictions`),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(403);
  });

  it("returns 503 when Ollama is down", async () => {
    mockRetrieve.mockResolvedValue({
      results: [
        {
          chunkId: chunkAId,
          documentId: docAId,
          documentName: "term-sheet.pdf",
          content: "Closing date is 2024-01-15.",
        },
        {
          chunkId: chunkBId,
          documentId: docBId,
          documentName: "spa.pdf",
          content: "Closing date is 2024-03-01.",
        },
      ],
    });
    mockOllama.healthCheck.mockResolvedValue({ ok: false, error: "down" });

    const response = await scanContradictions(
      new Request(`http://localhost/api/projects/${projectId}/contradictions/scan`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("OLLAMA_UNAVAILABLE");
    expect(mockOllama.chat).not.toHaveBeenCalled();
  });

  it("creates contradictions from mocked Ollama JSON", async () => {
    await prisma.contradiction.deleteMany({ where: { projectId } });
    mockRetrieve.mockResolvedValue({
      results: [
        {
          chunkId: chunkAId,
          documentId: docAId,
          documentName: "term-sheet.pdf",
          content: "Closing date is 2024-01-15. Purchase price $10,000,000.",
        },
        {
          chunkId: chunkBId,
          documentId: docBId,
          documentName: "spa.pdf",
          content: "Closing date is 2024-03-01. Purchase price $12,000,000.",
        },
      ],
    });
    mockOllama.healthCheck.mockResolvedValue({ ok: true, models: ["llama3"] });
    mockOllama.chat.mockResolvedValue(
      JSON.stringify([
        {
          subject: "Closing date",
          factType: "date",
          valueA: "2024-01-15",
          valueB: "2024-03-01",
          documentAId: docAId,
          chunkAId,
          documentBId: docBId,
          chunkBId,
          explanation: "Term sheet and SPA disagree on closing date.",
          severity: "HIGH",
        },
      ]),
    );

    const response = await scanContradictions(
      new Request(`http://localhost/api/projects/${projectId}/contradictions/scan`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.created).toBeGreaterThanOrEqual(1);

    const list = await listContradictions(
      new Request(`http://localhost/api/projects/${projectId}/contradictions`),
      { params: Promise.resolve({ id: projectId }) },
    );
    const listBody = await list.json();
    expect(listBody.data.contradictions.length).toBeGreaterThanOrEqual(1);

    const id = listBody.data.contradictions[0].id as string;
    const patch = await patchContradiction(
      new Request(`http://localhost/api/contradictions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACKNOWLEDGED" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(patch.status).toBe(200);
    const patchBody = await patch.json();
    expect(patchBody.data.contradiction.status).toBe("ACKNOWLEDGED");

    const severityPatch = await patchContradiction(
      new Request(`http://localhost/api/contradictions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ severity: "LOW" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(severityPatch.status).toBe(200);
    const severityBody = await severityPatch.json();
    expect(severityBody.data.contradiction.severity).toBe("LOW");
  });

  it("skips Ollama when fewer than 2 ready docs", async () => {
    const soloProject = await createProject(
      (await prisma.workspace.findFirstOrThrow({ where: { organizationId } })).id,
      { name: `Solo ${Date.now()}`, type: "MA" },
    );
    if (!("project" in soloProject)) throw new Error(soloProject.message);
    const soloId = soloProject.project.id;
    await prisma.document.create({
      data: {
        projectId: soloId,
        name: "alone.pdf",
        originalName: "alone.pdf",
        mimeType: "application/pdf",
        type: "OTHER",
        filePath: "alone.pdf",
        fileSize: 10,
        status: "READY",
      },
    });

    const response = await scanContradictions(
      new Request(`http://localhost/api/projects/${soloId}/contradictions/scan`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ id: soloId }) },
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.created).toBe(0);
    expect(mockOllama.healthCheck).not.toHaveBeenCalled();

    await prisma.document.deleteMany({ where: { projectId: soloId } });
    await prisma.project.delete({ where: { id: soloId } });
  });
});
