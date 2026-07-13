import { unarchiveNotification } from "@/features/organizations/lib/notifications";
import { requireSession } from "@/features/organizations/lib/authorization";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    const { id } = await context.params;

    const notification = await unarchiveNotification(id, session.userId);
    if (!notification) {
      return apiError("NOT_FOUND", "Notification not found", 404);
    }

    return apiSuccess(notification);
  } catch (error) {
    return handleApiError(error);
  }
}
