import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GET as listTasks,
  POST as createTask,
} from "@/app/api/projects/[id]/tasks/route";
import { POST as fromFindings } from "@/app/api/projects/[id]/tasks/from-findings/route";
import { DELETE as deleteTask, PATCH as patchTask } from "@/app/api/tasks/[id]/route";
import { createUser } from "@/features/auth/lib/users";
import { createOrganization } from "@/features/organizations/lib/organizations";
import { createProject } from "@/features/projects/lib/projects";
import { createWorkspace } from "@/features/workspaces/lib/workspaces";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const ownerEmail = `task-owner-${Date.now()}@example.com`;
const outsiderEmail = `task-outsider-${Date.now()}@example.com`;
let ownerId = "";
let organizationId = "";
let projectId = "";
let findingId = "";

const setSession = (value: unknown) => {
  (getSession as unknown as { mockResolvedValue: (session: unknown) => void }).mockResolvedValue(
    value,
  );
};

beforeAll(async () => {
  const owner = await createUser({
    email: ownerEmail,
    password: "IntegrationTest123",
    name: "Task Owner",
  });
  ownerId = owner.id;
  await createUser({
    email: outsiderEmail,
    password: "IntegrationTest123",
    name: "Task Outsider",
  });

  const org = await createOrganization(ownerId, { name: "Task Org" });
  organizationId = org.id;
  const workspace = await createWorkspace(organizationId, { name: "Task WS" });
  if (!("workspace" in workspace)) throw new Error(workspace.message);
  const project = await createProject(workspace.workspace.id, {
    name: "Task Project",
    type: "MA",
  });
  if (!("project" in project)) throw new Error(project.message);
  projectId = project.project.id;

  const finding = await prisma.finding.create({
    data: {
      projectId,
      agentType: "RISK",
      category: "Legal",
      title: "Open litigation exposure",
      description: "Pending claim of $2M",
      severity: "HIGH",
      status: "OPEN",
    },
  });
  findingId = finding.id;

  await prisma.agentRun.create({
    data: {
      projectId,
      agentType: "EXECUTIVE",
      status: "COMPLETED",
      confidence: "HIGH",
      output: {
        priorityActions: ["Request updated litigation memo", "Confirm insurance coverage"],
      },
      completedAt: new Date(),
    },
  });
});

beforeEach(async () => {
  await prisma.task.deleteMany({ where: { projectId } });
  await prisma.notification.deleteMany({
    where: { userId: ownerId, type: "TASK_ASSIGNED" },
  });
  setSession({
    user: { id: ownerId, email: ownerEmail, name: "Task Owner" },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  });
});

afterAll(async () => {
  await prisma.task.deleteMany({ where: { projectId } });
  await prisma.finding.deleteMany({ where: { projectId } });
  await prisma.agentRun.deleteMany({ where: { projectId } });
  await prisma.notification.deleteMany({ where: { userId: ownerId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
  await prisma.workspace.deleteMany({ where: { organizationId } });
  await prisma.organizationMember.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, outsiderEmail] } } });
  await prisma.$disconnect();
});

describe("tasks API integration", () => {
  it("rejects unauthenticated create", async () => {
    setSession(null);
    const response = await createTask(
      new Request(`http://localhost/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title: "Do something" }),
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
    const response = await listTasks(
      new Request(`http://localhost/api/projects/${projectId}/tasks`),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(403);
  });

  it("supports CRUD + soft delete without Ollama", async () => {
    const created = await createTask(
      new Request(`http://localhost/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Confirm escrow",
          priority: "HIGH",
          assigneeId: ownerId,
          findingId,
        }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    const taskId = createdBody.data.id as string;

    const notifications = await prisma.notification.findMany({
      where: { userId: ownerId, type: "TASK_ASSIGNED" },
    });
    // Self-assign should not notify
    expect(notifications).toHaveLength(0);

    const patched = await patchTask(
      new Request(`http://localhost/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }),
      { params: Promise.resolve({ id: taskId }) },
    );
    expect(patched.status).toBe(200);
    const patchedBody = await patched.json();
    expect(patchedBody.data.status).toBe("IN_PROGRESS");

    const deleted = await deleteTask(
      new Request(`http://localhost/api/tasks/${taskId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: taskId }) },
    );
    expect(deleted.status).toBe(200);

    const listed = await listTasks(
      new Request(`http://localhost/api/projects/${projectId}/tasks`),
      { params: Promise.resolve({ id: projectId }) },
    );
    const listedBody = await listed.json();
    expect(listedBody.data.tasks.find((t: { id: string }) => t.id === taskId)).toBeUndefined();

    const soft = await prisma.task.findUnique({ where: { id: taskId } });
    expect(soft?.deletedAt).not.toBeNull();
  });

  it("creates tasks from findings and executive actions with dedupe", async () => {
    const first = await fromFindings(
      new Request(`http://localhost/api/projects/${projectId}/tasks/from-findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeExecutiveActions: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    expect(firstBody.data.created).toBeGreaterThanOrEqual(3);

    const second = await fromFindings(
      new Request(`http://localhost/api/projects/${projectId}/tasks/from-findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeExecutiveActions: true }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    const secondBody = await second.json();
    expect(secondBody.data.created).toBe(0);
  });

  it("rejects assignee outside organization", async () => {
    const outsider = await prisma.user.findUniqueOrThrow({ where: { email: outsiderEmail } });
    const response = await createTask(
      new Request(`http://localhost/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Bad assignee",
          assigneeId: outsider.id,
        }),
      }),
      { params: Promise.resolve({ id: projectId }) },
    );
    expect(response.status).toBe(403);
  });
});
