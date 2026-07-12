import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { createProject } from "@/features/projects/lib/projects";
import { searchDocuments, retrieveForRag } from "@/lib/ai/retrieval";
import { formatVectorLiteral } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db";

const ownerEmail = `search-owner-${Date.now()}@example.com`;

let organizationId = "";
let projectId = "";
let documentId = "";
let chunkId = "";
let secondChunkId = "";
let weakDocumentId = "";
let weakChunkId = "";

vi.mock("@/lib/ai/embeddings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/embeddings")>();
  return {
    ...actual,
    embedTexts: vi.fn(async () => {
      const vector = Array.from({ length: 768 }, (_, index) => (index === 0 ? 1 : 0));
      return [vector];
    }),
  };
});

describe("search integration", () => {
  beforeAll(async () => {
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";

    const owner = await createUser({
      name: "Search Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });

    const organization = await createOrganization(owner.id, {
      name: "Search Integration Org",
    });
    organizationId = organization.id;

    const workspace = await createWorkspace(organizationId, {
      name: "Search Workspace",
    });
    expect("workspace" in workspace).toBe(true);
    if (!("workspace" in workspace)) return;

    const project = await createProject(workspace.workspace.id, {
      name: "Search Project",
      type: "MA",
    });
    expect("project" in project).toBe(true);
    if (!("project" in project)) return;
    projectId = project.project.id;

    documentId = randomUUID();
    chunkId = randomUUID();

    await prisma.document.create({
      data: {
        id: documentId,
        projectId,
        name: "Revenue Report.pdf",
        originalName: "Revenue Report.pdf",
        mimeType: "application/pdf",
        type: "PDF",
        classification: "FINANCIAL",
        filePath: "search/revenue.pdf",
        fileSize: 1024,
        status: "READY",
        tags: ["financial", "revenue"],
      },
    });

    const vector = Array.from({ length: 768 }, (_, index) => (index === 0 ? 1 : 0));
    const vectorLiteral = formatVectorLiteral(vector);

    await prisma.$executeRaw`
      INSERT INTO document_chunks (
        id, document_id, chunk_index, content, token_count,
        embedding, search_vector, page_number, section_title, created_at
      ) VALUES (
        ${chunkId},
        ${documentId},
        0,
        ${"Annual revenue increased by 12 percent year over year in the fourth quarter."},
        20,
        ${vectorLiteral}::vector,
        to_tsvector('english', ${"Annual revenue increased by 12 percent year over year in the fourth quarter."}),
        3,
        ${"Financial Summary"},
        NOW()
      )
    `;

    secondChunkId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO document_chunks (
        id, document_id, chunk_index, content, token_count,
        embedding, search_vector, page_number, section_title, created_at
      ) VALUES (
        ${secondChunkId},
        ${documentId},
        1,
        ${"Revenue growth was driven by enterprise contracts and renewals."},
        18,
        ${vectorLiteral}::vector,
        to_tsvector('english', ${"Revenue growth was driven by enterprise contracts and renewals."}),
        4,
        ${"Growth Drivers"},
        NOW()
      )
    `;

    weakDocumentId = randomUUID();
    weakChunkId = randomUUID();
    const weakVector = Array.from({ length: 768 }, (_, index) => (index === 1 ? 1 : 0));
    const weakVectorLiteral = formatVectorLiteral(weakVector);

    await prisma.document.create({
      data: {
        id: weakDocumentId,
        projectId,
        name: "HR Handbook.pdf",
        originalName: "HR Handbook.pdf",
        mimeType: "application/pdf",
        type: "PDF",
        filePath: "search/hr.pdf",
        fileSize: 512,
        status: "READY",
      },
    });

    await prisma.$executeRaw`
      INSERT INTO document_chunks (
        id, document_id, chunk_index, content, token_count,
        embedding, search_vector, page_number, section_title, created_at
      ) VALUES (
        ${weakChunkId},
        ${weakDocumentId},
        0,
        ${"Employee vacation policy and paid time off guidelines."},
        14,
        ${weakVectorLiteral}::vector,
        to_tsvector('english', ${"Employee vacation policy and paid time off guidelines."}),
        1,
        ${"HR Policies"},
        NOW()
      )
    `;
  });

  afterAll(async () => {
    await prisma.savedSearch.deleteMany({ where: { projectId } });
    await prisma.documentChunk.deleteMany({
      where: { document: { projectId } },
    });
    await prisma.document.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { email: ownerEmail } });
    await prisma.$disconnect();
  });

  it("returns keyword hits without Ollama", async () => {
    const response = await searchDocuments({
      projectId,
      query: "revenue quarter",
      mode: "keyword",
    });

    expect(response.results.length).toBe(1);
    expect(response.results[0]?.documentId).toBe(documentId);
    expect(response.results[0]?.chunkId).toBe(chunkId);
    expect(response.meta.ollamaUsed).toBe(false);
    expect(response.meta.mode).toBe("keyword");
    expect(response.results[0]?.snippet).toContain("mark");
  });

  it("deduplicates to one result per document", async () => {
    const response = await searchDocuments({
      projectId,
      query: "revenue",
      mode: "keyword",
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.documentId).toBe(documentId);
  });

  it("filters weak semantic matches", async () => {
    const response = await searchDocuments({
      projectId,
      query: "earnings performance",
      mode: "semantic",
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.documentId).toBe(documentId);
    expect(response.results.every((r) => r.documentId !== weakDocumentId)).toBe(true);
  });

  it("fuses keyword and semantic results in hybrid mode", async () => {
    const response = await searchDocuments({
      projectId,
      query: "revenue",
      mode: "hybrid",
    });

    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.documentId).toBe(documentId);
    expect(response.meta.mode).toBe("hybrid");
    expect(response.meta.ollamaUsed).toBe(true);
  });

  it("returns empty for irrelevant keyword queries", async () => {
    const response = await searchDocuments({
      projectId,
      query: "zzzznonexistentterm",
      mode: "keyword",
    });

    expect(response.results).toEqual([]);
  });

  it("filters by document type", async () => {
    const response = await searchDocuments({
      projectId,
      query: "revenue",
      mode: "keyword",
      filters: { type: "PDF" },
    });
    expect(response.results.length).toBe(1);

    const empty = await searchDocuments({
      projectId,
      query: "revenue",
      mode: "keyword",
      filters: { type: "DOCX" },
    });
    expect(empty.results).toEqual([]);
  });

  it("retrieveForRag returns project-scoped results", async () => {
    const response = await retrieveForRag(projectId, "revenue", { mode: "keyword", limit: 5 });

    expect(response.results.length).toBeGreaterThan(0);
    expect(response.meta.uniqueDocuments).toBe(response.results.length);
    expect(response.meta.mode).toBe("keyword");
  });

  it("rejects empty query", async () => {
    await expect(
      searchDocuments({
        projectId,
        query: "   ",
        mode: "keyword",
      }),
    ).rejects.toThrow("Search query is required");
  });
});
