export const dynamic = "force-dynamic";

import { requireTimelineEventAccess } from "@/features/timeline/lib/authorization";
import {
  deleteTimelineEvent,
  getTimelineEventById,
  hardDeleteTimelineEvent,
  restoreTimelineEvent,
  updateTimelineEvent,
} from "@/features/timeline/lib/timeline-events";
import { updateTimelineEventBodySchema } from "@/features/timeline/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireTimelineEventAccess(id);
    const event = await getTimelineEventById(id);
    if (!event) return apiError("NOT_FOUND", "Timeline event not found", 404);
    return apiSuccess({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireTimelineEventAccess(id);

    const body = await request.json().catch(() => ({}));
    if (body && typeof body === "object" && "restore" in body && body.restore === true) {
      const event = await restoreTimelineEvent(id);
      return apiSuccess({ event });
    }

    const parsed = updateTimelineEventBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    if (parsed.data.eventDate) {
      const date = new Date(parsed.data.eventDate);
      if (Number.isNaN(date.getTime())) {
        return apiError("VALIDATION_ERROR", "Invalid eventDate", 400);
      }
      parsed.data.eventDate = date.toISOString();
    }

    const event = await updateTimelineEvent({ id, input: parsed.data });
    return apiSuccess({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireTimelineEventAccess(id);
    const url = new URL(request.url);
    const permanent = url.searchParams.get("permanent") === "1";
    if (permanent) {
      await hardDeleteTimelineEvent(id);
    } else {
      await deleteTimelineEvent(id);
    }
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
