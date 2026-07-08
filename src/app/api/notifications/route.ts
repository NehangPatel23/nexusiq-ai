import { requireSession } from "@/features/organizations/lib/authorization";
import {
  countUnreadNotifications,
  listUserNotifications,
} from "@/features/organizations/lib/notifications";
import { apiSuccess, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireSession();
    const [items, unreadCount] = await Promise.all([
      listUserNotifications(session.userId),
      countUnreadNotifications(session.userId),
    ]);

    return apiSuccess({ items, unreadCount, total: items.length });
  } catch (error) {
    return handleApiError(error);
  }
}
