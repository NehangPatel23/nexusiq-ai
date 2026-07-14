import type { AuditAction, DataRoomAuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { listAuditLogs, type ListAuditLogsOptions } from "./audit-queries";

/** Human-readable activity source shown in the History table. */
export type HistorySourceLabel =
  | "Data Room"
  | "Intelligence"
  | "Reports"
  | "Simulator"
  | "Chat"
  | "Search"
  | "Auth"
  | "Settings"
  | "Organization"
  | "System";

export type HistoryFeedItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
  source: "audit_log" | "data_room";
  sourceLabel: HistorySourceLabel;
  user: { id: string; name: string | null; email: string } | null;
};

const DATA_ROOM_ACTION_MAP: Record<DataRoomAuditAction, AuditAction | string> = {
  UPLOADED: "UPLOAD",
  SOFT_DELETED: "DELETE",
  RESTORED: "UPDATE",
  PERMANENTLY_DELETED: "DELETE",
  REPROCESSED: "PROCESS",
  RENAMED: "UPDATE",
  MOVED: "UPDATE",
  SHARE_CREATED: "UPDATE",
  SHARE_REVOKED: "UPDATE",
  AGENT_RUN_COMPLETED: "AGENT_RUN",
  AGENT_RUN_FAILED: "AGENT_RUN",
  REPORT_GENERATED: "REPORT",
  REPORT_EXPORTED: "REPORT",
  REPORT_SHARE_CREATED: "REPORT",
  REPORT_SHARE_REVOKED: "REPORT",
};

function mapDataRoomAction(action: DataRoomAuditAction): string {
  return DATA_ROOM_ACTION_MAP[action] ?? action;
}

function metadataProjectId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as { projectId?: unknown }).projectId;
  return typeof value === "string" ? value : null;
}

export function resolveHistorySourceLabel(input: {
  source: "audit_log" | "data_room";
  action: string;
  dataRoomAction?: DataRoomAuditAction | string | null;
}): HistorySourceLabel {
  const dataRoomAction = input.dataRoomAction ?? null;

  // Prefer the original Data Room audit action when present (agent runs / reports
  // are written into DataRoomAuditEvent but are not Data Room UI activity).
  if (
    dataRoomAction === "AGENT_RUN_COMPLETED" ||
    dataRoomAction === "AGENT_RUN_FAILED"
  ) {
    return "Intelligence";
  }
  if (
    dataRoomAction === "REPORT_GENERATED" ||
    dataRoomAction === "REPORT_EXPORTED" ||
    dataRoomAction === "REPORT_SHARE_CREATED" ||
    dataRoomAction === "REPORT_SHARE_REVOKED"
  ) {
    return "Reports";
  }

  switch (input.action) {
    case "AGENT_RUN":
    case "CONSENSUS":
      return "Intelligence";
    case "REPORT":
      return "Reports";
    case "SIMULATION":
      return "Simulator";
    case "CHAT":
      return "Chat";
    case "SEARCH":
      return "Search";
    case "UPLOAD":
    case "PROCESS":
      return "Data Room";
    case "LOGIN":
    case "LOGOUT":
    case "USER_DELETED":
    case "USER_RECOVERED":
    case "USER_PURGED":
      return "Auth";
    case "SETTINGS_UPDATE":
      return "Settings";
    case "ORG_DELETED":
    case "ORG_RECOVERED":
    case "ORG_PURGED":
    case "CREATE":
    case "UPDATE":
    case "DELETE":
      // When these arrive via the Data Room audit stream they are file ops, not org CRUD.
      return input.source === "data_room" || dataRoomAction
        ? "Data Room"
        : "Organization";
    default:
      return input.source === "data_room" || dataRoomAction
        ? "Data Room"
        : "System";
  }
}

/**
 * Org history feed: AuditLog rows unioned with projected DataRoomAuditEvent activity
 * (uploads, agent runs written to data-room audit, report exports, etc.).
 */
export async function listOrgHistoryFeed(
  organizationId: string,
  options: ListAuditLogsOptions = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
  const fetchLimit = Math.min(500, Math.max(page * pageSize * 2, pageSize * 4));

  const orgProjects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      workspace: { organizationId, deletedAt: null },
      ...(options.projectId ? { id: options.projectId } : {}),
    },
    select: { id: true, name: true },
  });
  const projectIds = orgProjects.map((p) => p.id);
  const projectNameById = new Map(orgProjects.map((p) => [p.id, p.name]));

  const auditPromise = listAuditLogs(organizationId, {
    ...options,
    page: 1,
    pageSize: fetchLimit,
  });

  const dataRoomWhere: Prisma.DataRoomAuditEventWhereInput = {
    projectId: { in: projectIds.length > 0 ? projectIds : ["__none__"] },
    ...(options.userId ? { actorId: options.userId } : {}),
    ...((options.from || options.to) && {
      createdAt: {
        ...(options.from ? { gte: options.from } : {}),
        ...(options.to ? { lte: options.to } : {}),
      },
    }),
  };

  const dataRoomPromise =
    projectIds.length === 0
      ? Promise.resolve([])
      : prisma.dataRoomAuditEvent.findMany({
          where: dataRoomWhere,
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: fetchLimit,
        });

  const [auditResult, dataRoomEvents] = await Promise.all([auditPromise, dataRoomPromise]);

  const fromAudit: HistoryFeedItem[] = auditResult.items.map((item) => ({
    id: `audit:${item.id}`,
    action: item.action,
    entityType: item.entityType,
    entityId: item.entityId,
    metadata: item.metadata,
    ipAddress: item.ipAddress,
    createdAt: item.createdAt,
    source: "audit_log",
    sourceLabel: resolveHistorySourceLabel({
      source: "audit_log",
      action: item.action,
    }),
    user: item.user,
  }));

  const fromDataRoom: HistoryFeedItem[] = dataRoomEvents.map((event) => {
    const action = mapDataRoomAction(event.action);
    return {
      id: `data-room:${event.id}`,
      action,
      entityType: event.resourceType,
      entityId: event.resourceId,
      metadata: {
        ...(typeof event.metadata === "object" && event.metadata !== null
          ? (event.metadata as Record<string, unknown>)
          : {}),
        projectId: event.projectId,
        projectName: projectNameById.get(event.projectId) ?? null,
        resourceName: event.resourceName,
        dataRoomAction: event.action,
      },
      ipAddress: null,
      createdAt: event.createdAt,
      source: "data_room" as const,
      sourceLabel: resolveHistorySourceLabel({
        source: "data_room",
        action,
        dataRoomAction: event.action,
      }),
      user: event.actor,
    };
  });

  // Prefer org AuditLog rows when both streams capture the same event
  // (first-seen wins below — AuditLog must come first).
  let merged = [...fromAudit, ...fromDataRoom];

  if (options.action) {
    merged = merged.filter((item) => item.action === options.action);
  }

  if (options.projectId) {
    const projectId = options.projectId;
    merged = merged.filter(
      (item) =>
        item.entityId === projectId || metadataProjectId(item.metadata) === projectId,
    );
  }

  merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const seen = new Set<string>();
  merged = merged.filter((item) => {
    const key = `${item.action}|${item.entityId}|${item.createdAt.toISOString().slice(0, 19)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const total = merged.length;
  const skip = (page - 1) * pageSize;
  const items = merged.slice(skip, skip + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
