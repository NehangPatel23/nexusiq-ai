import { z } from "zod";

import { requireSession } from "@/features/organizations/lib/authorization";
import { bulkUpdateNotifications } from "@/features/organizations/lib/notifications";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

const bulkSchema = z.object({
  action: z.enum(["read", "archive", "unarchive", "delete"]),
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid bulk notification request", 400);
    }

    const result = await bulkUpdateNotifications(
      session.userId,
      parsed.data.ids,
      parsed.data.action,
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
