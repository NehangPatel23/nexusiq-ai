import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { createProject } from "@/features/projects/lib/projects";
import { uploadDocument } from "@/features/data-room/lib/documents";
import { prisma } from "@/lib/db";
import { resetStorageAdapter } from "@/lib/storage";
import { OllamaClient } from "@/lib/ai/ollama-client";
import { processDocument } from "@/lib/ai/processing/pipeline";

const ownerEmail = `processing-owner-${Date.now()}@example.com`;

let organizationId = "";
let projectId = "";
let ownerId = "";
let storageDir = "";

function createMockOllama(): OllamaClient {
  const fetchImpl = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/tags")) {
      return new Response(JSON.stringify({ models: [{ name: "llama3" }] }), { status: 200 });
    }
    if (url.endsWith("/api/chat")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as { messages: Array<{ role: string }> };
      const isClassify = body.messages.some((m) => String(m).includes("Classify") || true);
      void isClassify;
      return new Response(
        JSON.stringify({
          message: { role: "assistant", content: '{"classification":"financial"}' },
        }),
        { status: 200 },
      );
    }
    if (url.endsWith("/api/embeddings")) {
      const vector = Array.from({ length: 768 }, (_, i) => (i + 1) * 0.001);
      return new Response(JSON.stringify({ embedding: vector }), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  });

  return new OllamaClient({
    config: {
      baseUrl: "http://mock-ollama",
      chatModel: "llama3",
      embedModel: "nomic-embed-text",
    },
    fetchImpl,
  });
}

describe("document processing pipeline integration", () => {
  beforeAll(async () => {
    storageDir = await mkdtemp(path.join(os.tmpdir(), "nexusiq-processing-"));
    process.env.STORAGE_PATH = storageDir;
    process.env.ENABLE_INLINE_PROCESSING = "false";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetStorageAdapter();

    const owner = await createUser({
      name: "Processing Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });
    ownerId = owner.id;

    const organization = await createOrganization(owner.id, {
      name: "Processing Org",
    });
    organizationId = organization.id;

    const workspace = await createWorkspace(organizationId, {
      name: "Processing Workspace",
    });
    expect("workspace" in workspace).toBe(true);
    if (!("workspace" in workspace)) return;

    const project = await createProject(workspace.workspace.id, {
      name: "Processing Project",
      type: "MA",
    });
    expect("project" in project).toBe(true);
    if ("project" in project) {
      projectId = project.project.id;
    }
  });

  afterAll(async () => {
    await prisma.entityRelation.deleteMany({ where: { projectId } });
    await prisma.entity.deleteMany({ where: { projectId } });
    await prisma.documentChunk.deleteMany({ where: { document: { projectId } } });
    await prisma.documentVersion.deleteMany({ where: { document: { projectId } } });
    await prisma.document.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
    await prisma.$disconnect();
    await rm(storageDir, { recursive: true, force: true });
    resetStorageAdapter();
  });

  it("processes a TXT document to READY with chunks", async () => {
    const text = "Revenue grew 12% year over year. This is a financial summary for diligence.";
    const upload = await uploadDocument({
      organizationId,
      projectId,
      uploadedById: ownerId,
      fileName: "summary.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(text),
      folderId: null,
    });

    expect("document" in upload).toBe(true);
    if (!("document" in upload)) return;

    const mockOllama = createMockOllama();
    const result = await processDocument(upload.document.id, { ollama: mockOllama });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const updated = await prisma.document.findUnique({ where: { id: upload.document.id } });
    expect(updated?.status).toBe("READY");
    expect(updated?.classification).toBe("FINANCIAL");

    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: upload.document.id },
      orderBy: { chunkIndex: "asc" },
    });
    expect(chunks.length).toBeGreaterThan(0);
    expect(result.chunkCount).toBe(chunks.length);
  });
});
