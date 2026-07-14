export const dynamic = "force-dynamic";

import { requireProjectTimelineAccess } from "@/features/timeline/lib/authorization";
import { createTimelineEvent, listTimelineEvents } from "@/features/timeline/lib/timeline-events";
import {
  createTimelineEventBodySchema,
  timelineListQuerySchema,
} from "@/features/timeline/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectTimelineAccess(id);

    const url = new URL(request.url);
    const parsed = timelineListQuerySchema.safeParse({
      category: url.searchParams.get("category") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      trash: url.searchParams.get("trash") ?? undefined,
    });
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const events = await listTimelineEvents({
      projectId: id,
      category: parsed.data.category,
      from: parsed.data.from,
      to: parsed.data.to,
      q: parsed.data.q,
      trash: parsed.data.trash,
    });
    return apiSuccess({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectTimelineAccess(id);

    const parsed = createTimelineEventBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const eventDate = new Date(parsed.data.eventDate);
    if (Number.isNaN(eventDate.getTime())) {
      return apiError("VALIDATION_ERROR", "Invalid eventDate", 400);
    }

    const event = await createTimelineEvent({
      projectId: id,
      input: { ...parsed.data, eventDate: eventDate.toISOString() },
      isManual: true,
    });
    return apiSuccess({ event }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
