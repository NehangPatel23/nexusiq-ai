import { markAllNotificationsRead } from "@/features/organizations/lib/notifications";
import { requireSession } from "@/features/organizations/lib/authorization";
import { apiSuccess, handleApiError } from "@/lib/api";

export async function PATCH() {
  try {
    const session = await requireSession();
    const result = await markAllNotificationsRead(session.userId);
    return apiSuccess({ updated: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
