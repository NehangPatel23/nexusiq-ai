import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";

import {
  dedupeTaskKey,
  mapExecutiveActionToTaskDraft,
  mapFindingToTaskDraft,
  type SuggestedTaskDraft,
} from "@/features/actions/lib/from-findings";
import {
  getAgentRunWithFindings,
  getLatestCompletedRunsByAgent,
} from "@/features/intelligence/lib/agent-runs";
import { AuthError } from "@/features/organizations/lib/authorization";
import { createNotification } from "@/features/organizations/lib/notifications";
import { prisma } from "@/lib/db";

export type TaskView = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assignee: { id: string; name: string | null; email: string; image: string | null } | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  impact: string | null;
  findingId: string | null;
  finding: { id: string; title: string; severity: string | null } | null;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
};

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true, image: true } },
  finding: { select: { id: true, title: true, severity: true } },
} satisfies Prisma.TaskInclude;

function mapTask(row: {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  impact: string | null;
  findingId: string | null;
  documentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignee: TaskView["assignee"];
  finding: TaskView["finding"];
}): TaskView {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    assigneeId: row.assigneeId,
    assignee: row.assignee,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate?.toISOString() ?? null,
    impact: row.impact,
    findingId: row.findingId,
    finding: row.finding,
    documentId: row.documentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function assertAssigneeInOrganization(
  organizationId: string,
  assigneeId: string | null | undefined,
) {
  if (!assigneeId) return;
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: assigneeId },
    },
  });
  if (!membership) {
    throw new AuthError("FORBIDDEN", "Assignee must be a member of the project organization");
  }
}

export async function assertFindingInProject(projectId: string, findingId: string | null | undefined) {
  if (!findingId) return;
  const finding = await prisma.finding.findFirst({
    where: { id: findingId, projectId },
    select: { id: true },
  });
  if (!finding) {
    throw new AuthError("NOT_FOUND", "Finding not found in this project");
  }
}

export async function assertDocumentInProject(
  projectId: string,
  documentId: string | null | undefined,
) {
  if (!documentId) return;
  const document = await prisma.document.findFirst({
    where: { id: documentId, projectId, deletedAt: null },
    select: { id: true },
  });
  if (!document) {
    throw new AuthError("NOT_FOUND", "Document not found in this project");
  }
}

async function notifyTaskAssigned(input: {
  projectId: string;
  assigneeId: string;
  title: string;
  actorId?: string;
}) {
  if (input.actorId && input.actorId === input.assigneeId) return;
  await createNotification({
    userId: input.assigneeId,
    type: "TASK_ASSIGNED",
    title: "Task assigned to you",
    body: input.title,
    link: `/dashboard/projects/${input.projectId}/actions`,
  }).catch(() => undefined);
}

export async function listTasks(
  projectId: string,
  filters?: { status?: TaskStatus; priority?: TaskPriority },
) {
  const rows = await prisma.task.findMany({
    where: {
      projectId,
      deletedAt: null,
      ...(filters?.status
        ? { status: filters.status }
        : { status: { not: "CANCELLED" } }),
      ...(filters?.priority ? { priority: filters.priority } : {}),
    },
    include: taskInclude,
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(mapTask);
}

export async function createTask(input: {
  projectId: string;
  organizationId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  impact?: string | null;
  findingId?: string | null;
  documentId?: string | null;
  actorId?: string;
}) {
  await assertAssigneeInOrganization(input.organizationId, input.assigneeId);
  await assertFindingInProject(input.projectId, input.findingId);
  await assertDocumentInProject(input.projectId, input.documentId);

  const row = await prisma.task.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      assigneeId: input.assigneeId ?? null,
      status: input.status ?? "TODO",
      priority: input.priority ?? "MEDIUM",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      impact: input.impact ?? null,
      findingId: input.findingId ?? null,
      documentId: input.documentId ?? null,
    },
    include: taskInclude,
  });

  if (row.assigneeId) {
    await notifyTaskAssigned({
      projectId: input.projectId,
      assigneeId: row.assigneeId,
      title: row.title,
      actorId: input.actorId,
    });
  }

  return mapTask(row);
}

export async function updateTask(input: {
  taskId: string;
  projectId: string;
  organizationId: string;
  actorId?: string;
  data: {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    impact?: string | null;
    findingId?: string | null;
    documentId?: string | null;
  };
}) {
  const existing = await prisma.task.findFirst({
    where: { id: input.taskId, projectId: input.projectId, deletedAt: null },
  });
  if (!existing) {
    throw new AuthError("NOT_FOUND", "Task not found");
  }

  if (input.data.assigneeId !== undefined) {
    await assertAssigneeInOrganization(input.organizationId, input.data.assigneeId);
  }
  if (input.data.findingId !== undefined) {
    await assertFindingInProject(input.projectId, input.data.findingId);
  }
  if (input.data.documentId !== undefined) {
    await assertDocumentInProject(input.projectId, input.data.documentId);
  }

  const row = await prisma.task.update({
    where: { id: input.taskId },
    data: {
      ...(input.data.title !== undefined ? { title: input.data.title } : {}),
      ...(input.data.description !== undefined ? { description: input.data.description } : {}),
      ...(input.data.assigneeId !== undefined ? { assigneeId: input.data.assigneeId } : {}),
      ...(input.data.status !== undefined ? { status: input.data.status } : {}),
      ...(input.data.priority !== undefined ? { priority: input.data.priority } : {}),
      ...(input.data.dueDate !== undefined
        ? { dueDate: input.data.dueDate ? new Date(input.data.dueDate) : null }
        : {}),
      ...(input.data.impact !== undefined ? { impact: input.data.impact } : {}),
      ...(input.data.findingId !== undefined ? { findingId: input.data.findingId } : {}),
      ...(input.data.documentId !== undefined ? { documentId: input.data.documentId } : {}),
    },
    include: taskInclude,
  });

  const assigneeChanged =
    input.data.assigneeId !== undefined &&
    input.data.assigneeId !== null &&
    input.data.assigneeId !== existing.assigneeId;

  if (assigneeChanged && row.assigneeId) {
    await notifyTaskAssigned({
      projectId: input.projectId,
      assigneeId: row.assigneeId,
      title: row.title,
      actorId: input.actorId,
    });
  }

  return mapTask(row);
}

export async function softDeleteTask(taskId: string, projectId: string) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, projectId, deletedAt: null },
  });
  if (!existing) {
    throw new AuthError("NOT_FOUND", "Task not found");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });

  return { id: taskId, deleted: true as const };
}

export async function createTasksFromFindings(input: {
  projectId: string;
  organizationId: string;
  findingIds?: string[];
  includeExecutiveActions?: boolean;
  actorId?: string;
}) {
  const drafts: SuggestedTaskDraft[] = [];

  const findings = await prisma.finding.findMany({
    where: {
      projectId: input.projectId,
      status: "OPEN",
      ...(input.findingIds?.length ? { id: { in: input.findingIds } } : {}),
    },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  for (const finding of findings) {
    drafts.push(mapFindingToTaskDraft(finding));
  }

  if (input.includeExecutiveActions) {
    const latest = await getLatestCompletedRunsByAgent(input.projectId);
    const exec = latest.get("EXECUTIVE");
    if (exec) {
      const detail = await getAgentRunWithFindings(exec.id);
      const actions = Array.isArray(detail?.output?.priorityActions)
        ? (detail!.output!.priorityActions as unknown[]).filter(
            (a): a is string => typeof a === "string" && a.trim().length > 0,
          )
        : [];
      actions.forEach((action, index) => {
        drafts.push(mapExecutiveActionToTaskDraft(action, index));
      });
    }
  }

  const existing = await prisma.task.findMany({
    where: { projectId: input.projectId, deletedAt: null },
    select: { title: true, findingId: true },
  });
  const existingKeys = new Set(
    existing.map((t) => dedupeTaskKey(t.title, t.findingId)),
  );

  const created: TaskView[] = [];
  for (const draft of drafts) {
    const key = dedupeTaskKey(draft.title, draft.findingId);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);

    const task = await createTask({
      projectId: input.projectId,
      organizationId: input.organizationId,
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      impact: draft.impact,
      findingId: draft.findingId,
      documentId: draft.documentId,
      status: "TODO",
      actorId: input.actorId,
    });
    created.push(task);
  }

  return { created: created.length, tasks: created };
}

export async function listOpenFindingsForPicker(projectId: string) {
  return prisma.finding.findMany({
    where: { projectId, status: "OPEN" },
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      agentType: true,
      documentId: true,
    },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}
