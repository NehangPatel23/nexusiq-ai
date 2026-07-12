import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { createProject } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";

import { POST as searchPost } from "@/app/api/projects/[id]/search/route";
import { GET as savedGet, POST as savedPost } from "@/app/api/projects/[id]/saved-searches/route";
import { DELETE as savedDelete } from "@/app/api/saved-searches/[id]/route";

const ownerEmail = `search-api-${Date.now()}@example.com`;
const outsiderEmail = `search-outsider-${Date.now()}@example.com`;

let projectId = "";
let organizationId = "";
let ownerId = "";
let savedSearchId = "";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/ai/embeddings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/embeddings")>();
  return {
    ...actual,
    embedTexts: vi.fn(async () => [Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0))]),
  };
});

import { getSession } from "@/lib/session";

describe("search API auth", () => {
  beforeAll(async () => {
    const owner = await createUser({
      name: "Search API Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });
    ownerId = owner.id;

    const outsider = await createUser({
      name: "Outsider",
      email: outsiderEmail,
      password: "IntegrationTest123",
    });

    const organization = await createOrganization(owner.id, {
      name: "Search API Org",
    });
    organizationId = organization.id;

    const workspace = await createWorkspace(organizationId, {
      name: "Search API Workspace",
    });
    expect("workspace" in workspace).toBe(true);
    if (!("workspace" in workspace)) return;

    const project = await createProject(workspace.workspace.id, {
      name: "Search API Project",
      type: "AUDIT",
    });
    expect("project" in project).toBe(true);
    if (!("project" in project)) return;
    projectId = project.project.id;

    const documentId = randomUUID();
    const chunkId = randomUUID();
    await prisma.document.create({
      data: {
        id: documentId,
        projectId,
        name: "Audit Memo.txt",
        originalName: "Audit Memo.txt",
        mimeType: "text/plain",
        type: "TXT",
        filePath: "search/memo.txt",
        fileSize: 256,
        status: "READY",
      },
    });

    await prisma.$executeRaw`
      INSERT INTO document_chunks (
        id, document_id, chunk_index, content, token_count, search_vector, created_at
      ) VALUES (
        ${chunkId},
        ${documentId},
        0,
        ${"Material weakness identified in revenue recognition controls."},
        12,
        to_tsvector('english', ${"Material weakness identified in revenue recognition controls."}),
        NOW()
      )
    `;

    void outsider;
  });

  afterAll(async () => {
    await prisma.savedSearch.deleteMany({ where: { projectId } });
    await prisma.documentChunk.deleteMany({ where: { document: { projectId } } });
    await prisma.document.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await searchPost(
      new Request("http://localhost/api/projects/x/search", {
        method: "POST",
        body: JSON.stringify({ query: "revenue" }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns keyword search results for authorized user", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: ownerId, email: ownerEmail, name: "Search API Owner" },
      expires: new Date(Date.now() + 3600_000).toISOString(),
    });

    const response = await searchPost(
      new Request("http://localhost/api/projects/x/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "revenue recognition", mode: "keyword" }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    const json = (await response.json()) as {
      success: boolean;
      data?: { results: Array<{ chunkId: string }>; meta: { mode: string } };
    };

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data?.results.length).toBeGreaterThan(0);
    expect(json.data?.meta.mode).toBe("keyword");
  });

  it("creates and deletes saved searches", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: ownerId, email: ownerEmail, name: "Search API Owner" },
      expires: new Date(Date.now() + 3600_000).toISOString(),
    });

    const createResponse = await savedPost(
      new Request("http://localhost/api/projects/x/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Revenue controls",
          query: "revenue recognition",
          mode: "hybrid",
          filters: {},
        }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as {
      success: boolean;
      data: { id: string; name: string };
    };
    savedSearchId = created.data.id;

    const listResponse = await savedGet(new Request("http://localhost"), {
      params: Promise.resolve({ id: projectId }),
    });
    const listed = (await listResponse.json()) as {
      success: boolean;
      data: { items: Array<{ id: string }> };
    };
    expect(listed.data.items.some((item) => item.id === savedSearchId)).toBe(true);

    const deleteResponse = await savedDelete(new Request("http://localhost"), {
      params: Promise.resolve({ id: savedSearchId }),
    });
    expect(deleteResponse.status).toBe(200);
  });
});
