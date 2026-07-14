import type { Prisma, TimelineCategory, TimelineEvent } from "@prisma/client";

import type {
  CreateTimelineEventInput,
  TimelineCategoryInput,
  UpdateTimelineEventInput,
} from "@/features/timeline/schemas";
import { prisma } from "@/lib/db";

export type TimelineEventView = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  eventDate: string;
  category: TimelineCategory;
  sourceChunkId: string | null;
  documentId: string | null;
  documentName: string | null;
  isManual: boolean;
  pinned: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type EventWithDoc = TimelineEvent & {
  document: { id: string; name: string } | null;
};

function mapEvent(event: EventWithDoc): TimelineEventView {
  return {
    id: event.id,
    projectId: event.projectId,
    title: event.title,
    description: event.description,
    eventDate: event.eventDate.toISOString(),
    category: event.category,
    sourceChunkId: event.sourceChunkId,
    documentId: event.documentId,
    documentName: event.document?.name ?? null,
    isManual: event.isManual,
    pinned: event.pinned,
    deletedAt: event.deletedAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

const eventInclude = {
  document: { select: { id: true, name: true } },
} satisfies Prisma.TimelineEventInclude;

export async function listTimelineEvents(params: {
  projectId: string;
  category?: TimelineCategoryInput;
  from?: string;
  to?: string;
  q?: string;
  /** Default: active only. `archived` = soft-deleted only. `all` = both. */
  trash?: "active" | "archived" | "all";
}): Promise<TimelineEventView[]> {
  const trash = params.trash ?? "active";
  const where: Prisma.TimelineEventWhereInput = {
    projectId: params.projectId,
  };
  if (trash === "active") where.deletedAt = null;
  else if (trash === "archived") where.deletedAt = { not: null };
  if (params.category) where.category = params.category;
  if (params.from || params.to) {
    where.eventDate = {};
    if (params.from) {
      const from = new Date(params.from);
      if (!Number.isNaN(from.getTime())) where.eventDate.gte = from;
    }
    if (params.to) {
      const to = new Date(params.to);
      if (!Number.isNaN(to.getTime())) {
        // Inclusive end-of-day when YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(params.to)) {
          to.setHours(23, 59, 59, 999);
        }
        where.eventDate.lte = to;
      }
    }
  }
  if (params.q?.trim()) {
    const q = params.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.timelineEvent.findMany({
    where,
    include: eventInclude,
    orderBy: [{ pinned: "desc" }, { eventDate: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(mapEvent);
}

export async function getTimelineEventById(id: string): Promise<TimelineEventView | null> {
  const row = await prisma.timelineEvent.findUnique({
    where: { id },
    include: eventInclude,
  });
  return row ? mapEvent(row) : null;
}

function parseEventDate(raw: string): Date {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid eventDate");
  }
  return date;
}

export async function createTimelineEvent(params: {
  projectId: string;
  input: CreateTimelineEventInput;
  isManual?: boolean;
}): Promise<TimelineEventView> {
  const created = await prisma.timelineEvent.create({
    data: {
      projectId: params.projectId,
      title: params.input.title,
      description: params.input.description ?? null,
      eventDate: parseEventDate(params.input.eventDate),
      category: params.input.category,
      documentId: params.input.documentId ?? null,
      sourceChunkId: params.input.sourceChunkId ?? null,
      isManual: params.isManual ?? true,
      pinned: false,
    },
    include: eventInclude,
  });
  return mapEvent(created);
}

export async function updateTimelineEvent(params: {
  id: string;
  input: UpdateTimelineEventInput;
}): Promise<TimelineEventView> {
  const data: Prisma.TimelineEventUpdateInput = {};
  if (params.input.title !== undefined) data.title = params.input.title;
  if (params.input.description !== undefined) data.description = params.input.description;
  if (params.input.eventDate !== undefined) data.eventDate = parseEventDate(params.input.eventDate);
  if (params.input.category !== undefined) data.category = params.input.category;
  if (params.input.pinned !== undefined) data.pinned = params.input.pinned;
  if (params.input.documentId !== undefined) {
    data.document = params.input.documentId
      ? { connect: { id: params.input.documentId } }
      : { disconnect: true };
  }
  if (params.input.sourceChunkId !== undefined) {
    data.sourceChunk = params.input.sourceChunkId
      ? { connect: { id: params.input.sourceChunkId } }
      : { disconnect: true };
  }

  const updated = await prisma.timelineEvent.update({
    where: { id: params.id },
    data,
    include: eventInclude,
  });
  return mapEvent(updated);
}

/** Soft-delete (moves to trash). */
export async function deleteTimelineEvent(id: string): Promise<void> {
  await prisma.timelineEvent.update({
    where: { id },
    data: { deletedAt: new Date(), pinned: false },
  });
}

export async function restoreTimelineEvent(id: string): Promise<TimelineEventView> {
  const updated = await prisma.timelineEvent.update({
    where: { id },
    data: { deletedAt: null },
    include: eventInclude,
  });
  return mapEvent(updated);
}

/** Permanent remove (used from trash). */
export async function hardDeleteTimelineEvent(id: string): Promise<void> {
  await prisma.timelineEvent.delete({ where: { id } });
}
