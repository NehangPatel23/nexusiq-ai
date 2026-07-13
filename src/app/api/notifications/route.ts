import { requireSession } from "@/features/organizations/lib/authorization";
import {
  countUnreadNotifications,
  listUserNotifications,
} from "@/features/organizations/lib/notifications";
import { apiSuccess, handleApiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";

    const [items, unreadCount] = await Promise.all([
      listUserNotifications(session.userId, { archived }),
      countUnreadNotifications(session.userId),
    ]);

    return apiSuccess({ items, unreadCount, total: items.length, archived });
  } catch (error) {
    return handleApiError(error);
  }
}
