import { updateProfileSchema } from "@/features/auth/schemas";
import { updateUserProfile } from "@/features/auth/lib/users";
import { parseNotificationPrefs } from "@/features/settings/lib/notification-prefs";
import { requireSession } from "@/features/organizations/lib/authorization";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        theme: true,
        notificationPrefs: true,
        createdAt: true,
      },
    });
    if (!user) return apiError("NOT_FOUND", "User not found", 404);

    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      theme: user.theme,
      notificationPrefs: parseNotificationPrefs(user.notificationPrefs),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid profile data", 400, parsed.error.flatten());
    }

    const user = await updateUserProfile(session.userId, { name: parsed.data.name });
    return apiSuccess({
      name: user.name,
      image: user.image,
      email: user.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
