import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as sendMessage } from "@/app/api/chats/[id]/messages/route";
import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createProject } from "@/features/projects/lib/projects";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import {
  INSUFFICIENT_EVIDENCE_MESSAGE,
  OllamaUnavailableError,
  prepareRagChat,
  runRagChat,
} from "@/lib/ai/chat/rag-chat";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

vi.mock("@/lib/ai/chat/rag-chat", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/chat/rag-chat")>();
  return {
    ...actual,
    prepareRagChat: vi.fn(),
    runRagChat: vi.fn(),
  };
});

const ownerEmail = `chat-owner-${Date.now()}@example.com`;
const outsiderEmail = `chat-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";
let chatId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

describe("chat message API integration", () => {
  beforeAll(async () => {
    const owner = await createUser({
      name: "Chat Owner",
      email: ownerEmail,
      password: "IntegrationTest123",
    });
    ownerId = owner.id;
    await createUser({
      name: "Chat Outsider",
      email: outsiderEmail,
      password: "IntegrationTest123",
    });
    const organization = await createOrganization(owner.id, { name: "Chat Integration Org" });
    organizationId = organization.id;
    const workspace = await createWorkspace(organizationId, { name: "Chat Workspace" });
    if (!("workspace" in workspace)) throw new Error(workspace.message);
    const project = await createProject(workspace.workspace.id, {
      name: "Chat Project",
      type: "MA",
    });
    if (!("project" in project)) throw new Error(project.message);
    projectId = project.project.id;
    const chat = await prisma.chat.create({
      data: { projectId, userId: ownerId, agentType: "GENERAL" },
    });
    chatId = chat.id;
  });

  beforeEach(async () => {
    await prisma.chatMessage.deleteMany({ where: { chatId } });
    await prisma.chat.update({ where: { id: chatId }, data: { title: null } });
    setSession({
      user: { id: ownerId, email: ownerEmail, name: "Chat Owner" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    vi.mocked(prepareRagChat).mockResolvedValue({
      retrieval: {
        results: [],
        meta: { tookMs: 1, mode: "keyword", ollamaUsed: false, uniqueDocuments: 0 },
      },
    });
    vi.mocked(runRagChat).mockImplementation(async ({ onToken }) => {
      await onToken("Supported answer.");
      return {
        content: "Supported answer.",
        citations: [
          {
            documentId: "doc-1",
            chunkId: "chunk-1",
            documentName: "Evidence.pdf",
            excerpt: "Supporting excerpt",
          },
        ],
        confidence: "HIGH",
        confidenceScore: 88,
        retrievedChunks: [],
      };
    });
  });

  afterAll(async () => {
    await prisma.chat.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.workspace.deleteMany({ where: { organizationId } });
    await prisma.organizationMember.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
    await prisma.$disconnect();
  });

  it("streams and persists user and cited assistant messages", async () => {
    const response = await sendMessage(
      new Request(`http://localhost/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "What is supported?" }),
      }),
      { params: Promise.resolve({ id: chatId }) },
    );
    const stream = await response.text();
    const persisted = await prisma.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });
    const chat = await prisma.chat.findUniqueOrThrow({ where: { id: chatId } });

    expect(response.status).toBe(200);
    expect(stream).toContain("event: token");
    expect(stream).toContain("event: done");
    expect(persisted).toHaveLength(2);
    expect(persisted[1]?.confidence).toBe("HIGH");
    expect(persisted[1]?.confidenceScore).toBe(88);
    expect(persisted[1]?.citations).toEqual([
      expect.objectContaining({ documentId: "doc-1", chunkId: "chunk-1" }),
    ]);
    expect(chat.title).toBe("What is supported?");
  });

  it("persists the insufficient evidence response", async () => {
    vi.mocked(runRagChat).mockResolvedValue({
      content: INSUFFICIENT_EVIDENCE_MESSAGE,
      citations: [],
      confidence: "INSUFFICIENT",
      confidenceScore: 0,
      confidenceReason: "No relevant documents were retrieved from the data room.",
      retrievedChunks: [],
    });

    const response = await sendMessage(
      new Request(`http://localhost/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Unknown?" }),
      }),
      { params: Promise.resolve({ id: chatId }) },
    );
    await response.text();
    const assistant = await prisma.chatMessage.findFirst({
      where: { chatId, role: "ASSISTANT" },
    });

    expect(assistant?.confidence).toBe("INSUFFICIENT");
    expect(assistant?.citations).toEqual([]);
  });

  it("returns 503 when Ollama preflight fails", async () => {
    vi.mocked(prepareRagChat).mockRejectedValue(new OllamaUnavailableError());
    const response = await sendMessage(
      new Request(`http://localhost/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Question" }),
      }),
      { params: Promise.resolve({ id: chatId }) },
    );
    expect(response.status).toBe(503);
    expect(await prisma.chatMessage.count({ where: { chatId } })).toBe(0);
  });

  it("returns 401 without a session and 403 for a non-member", async () => {
    setSession(null);
    const unauthenticated = await sendMessage(
      new Request(`http://localhost/api/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: "Question" }),
      }),
      { params: Promise.resolve({ id: chatId }) },
    );
    expect(unauthenticated.status).toBe(401);

    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: outsiderEmail } });
    setSession({
      user: { id: outsider.id, email: outsiderEmail, name: "Chat Outsider" },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const forbidden = await sendMessage(
      new Request(`http://localhost/api/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: "Question" }),
      }),
      { params: Promise.resolve({ id: chatId }) },
    );
    expect(forbidden.status).toBe(403);
  });
});
