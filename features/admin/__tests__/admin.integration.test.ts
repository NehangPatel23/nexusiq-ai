import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createUser } from "@/features/auth/lib/users";
import { getQueueSummary } from "@/features/admin/lib/queue";
import { getOrgUsageStats } from "@/features/admin/lib/usage";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { createProject } from "@/features/projects/lib/projects";
import { prisma } from "@/lib/db";
import { GET as healthGet } from "@/app/api/admin/health/route";
import { GET as usageGet } from "@/app/api/admin/usage/route";
import { POST as reindexPost } from "@/app/api/admin/reindex/route";
import { getSession } from "@/lib/session";
import { healthCheck, resetOllamaClient } from "@/lib/ai/ollama-client";
import { embedTexts } from "@/lib/ai/embeddings";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/ai/ollama-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/ollama-client")>();
  return {
    ...actual,
    healthCheck: vi.fn(),
    getOllamaClient: vi.fn(() => ({
      healthCheck: vi.fn(),
      embed: vi.fn(),
      getConfig: () => ({
        baseUrl: "http://localhost:11434",
        chatModel: "llama3",
        embedModel: "nomic-embed-text",
      }),
    })),
  };
});

vi.mock("@/lib/ai/embeddings", () => ({
  embedTexts: vi.fn(),
  formatVectorLiteral: (values: number[]) => `[${values.join(",")}]`,
}));

const password = "IntegrationTest123";
let ownerId = "";
let viewerId = "";
let organizationId = "";
let projectId = "";
let documentId = "";
let chunkId = "";

function setSession(userId: string, email: string) {
  vi.mocked(getSession).mockResolvedValue({
    user: { id: userId, email, name: "Admin User" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as unknown as Awaited<ReturnType<typeof getSession>>);
}

beforeAll(async () => {
  const stamp = Date.now();
  const owner = await createUser({
    name: "Admin Owner",
    email: `admin-owner-${stamp}@test.com`,
    password,
  });
  ownerId = owner.id;

  const viewer = await createUser({
    name: "Admin Viewer",
    email: `admin-viewer-${stamp}@test.com`,
    password,
  });
  viewerId = viewer.id;

  const org = await createOrganization(ownerId, { name: `Admin Org ${stamp}` });
  organizationId = org.id;

  await prisma.organizationMember.create({
    data: {
      organizationId,
      userId: viewerId,
      role: "VIEWER",
    },
  });

  const ws = await createWorkspace(organizationId, { name: `Admin WS ${stamp}` });
  if (!("workspace" in ws)) throw new Error(ws.message);
  const project = await createProject(ws.workspace.id, {
    name: `Admin Project ${stamp}`,
    type: "MA",
  });
  if (!("project" in project)) throw new Error(project.message);
  projectId = project.project.id;

  const doc = await prisma.document.create({
    data: {
      projectId,
      name: "Admin Doc",
      originalName: "admin.txt",
      mimeType: "text/plain",
      type: "TXT",
      filePath: "org/admin.txt",
      fileSize: 1200,
      status: "READY",
    },
  });
  documentId = doc.id;

  chunkId = (
    await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO document_chunks (
        id, document_id, chunk_index, content, token_count, search_vector, created_at
      ) VALUES (
        gen_random_uuid(),
        ${documentId},
        0,
        'NexusIQ admin reindex chunk with unique token zxqAdminFts',
        12,
        to_tsvector('english', 'placeholder'),
        NOW()
      )
      RETURNING id
    `
  )[0]!.id;
});

beforeEach(() => {
  setSession(ownerId, "admin-owner@test.com");
  resetOllamaClient();
  vi.mocked(healthCheck).mockReset();
  vi.mocked(healthCheck).mockResolvedValue({ ok: true, models: ["llama3"] });
  vi.mocked(embedTexts).mockReset();
});

afterAll(async () => {
  if (organizationId) {
    await prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
  }
  if (ownerId) {
    await prisma.user.delete({ where: { id: ownerId } }).catch(() => undefined);
  }
  if (viewerId) {
    await prisma.user.delete({ where: { id: viewerId } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

describe("Admin integration", () => {
  it("aggregates usage and queue for owner org", async () => {
    const usage = await getOrgUsageStats(organizationId, { days: 7 });
    expect(usage.documents).toBeGreaterThanOrEqual(1);
    expect(usage.chunks).toBeGreaterThanOrEqual(1);
    expect(usage.storageBytes).toBeGreaterThanOrEqual(1200);
    expect(usage.members).toBeGreaterThanOrEqual(2);

    const queue = await getQueueSummary(organizationId);
    expect(queue.ready).toBeGreaterThanOrEqual(1);
  });

  it("owner can GET health and usage; non-owner gets 403", async () => {
    const healthRes = await healthGet(
      new Request(`http://localhost/api/admin/health?organizationId=${organizationId}`),
    );
    expect(healthRes.status).toBe(200);
    const healthJson = (await healthRes.json()) as {
      success: boolean;
      data: { db: string; apiKeyConfigured: boolean; queue: { ready: number } };
    };
    expect(healthJson.success).toBe(true);
    expect(healthJson.data.db).toBe("connected");
    expect(typeof healthJson.data.apiKeyConfigured).toBe("boolean");
    expect(healthJson.data).not.toHaveProperty("apiKey");

    const usageRes = await usageGet(
      new Request(`http://localhost/api/admin/usage?organizationId=${organizationId}`),
    );
    expect(usageRes.status).toBe(200);

    setSession(viewerId, "admin-viewer@test.com");
    const forbidden = await healthGet(
      new Request(`http://localhost/api/admin/health?organizationId=${organizationId}`),
    );
    expect(forbidden.status).toBe(403);
  });

  it("reindex fts updates search_vector without Ollama", async () => {
    const res = await reindexPost(
      new Request("http://localhost/api/admin/reindex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fts",
          organizationId,
          confirm: true,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: { updatedChunks: number; ollamaUsed: boolean };
    };
    expect(json.success).toBe(true);
    expect(json.data.ollamaUsed).toBe(false);
    expect(json.data.updatedChunks).toBeGreaterThanOrEqual(1);

    const rows = await prisma.$queryRaw<Array<{ rank: number }>>`
      SELECT ts_rank(search_vector, plainto_tsquery('english', 'zxqAdminFts')) AS rank
      FROM document_chunks
      WHERE id = ${chunkId}
    `;
    expect(Number(rows[0]?.rank ?? 0)).toBeGreaterThan(0);
  });

  it("reindex embeddings returns 503 when Ollama healthCheck fails", async () => {
    vi.mocked(healthCheck).mockResolvedValue({ ok: false, error: "down" });

    const res = await reindexPost(
      new Request("http://localhost/api/admin/reindex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "embeddings",
          organizationId,
          confirm: true,
        }),
      }),
    );
    expect(res.status).toBe(503);
    const json = (await res.json()) as { success: boolean; error: { code: string } };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("OLLAMA_UNAVAILABLE");
  });

  it("reindex embeddings updates vectors when Ollama is mocked", async () => {
    vi.mocked(healthCheck).mockResolvedValue({ ok: true, models: ["nomic-embed-text"] });
    const fake = Array.from({ length: 768 }, (_, i) => (i === 0 ? 0.5 : 0));
    vi.mocked(embedTexts).mockResolvedValue([fake]);

    // Force non-Vercel inline path
    const prevVercel = process.env.VERCEL;
    delete process.env.VERCEL;

    const res = await reindexPost(
      new Request("http://localhost/api/admin/reindex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "embeddings",
          organizationId,
          confirm: true,
        }),
      }),
    );

    if (prevVercel !== undefined) process.env.VERCEL = prevVercel;

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      data: { updatedChunks: number; ollamaUsed: boolean };
    };
    expect(json.success).toBe(true);
    expect(json.data.ollamaUsed).toBe(true);
    expect(json.data.updatedChunks).toBeGreaterThanOrEqual(1);
    expect(embedTexts).toHaveBeenCalled();
  });
});
