import { acceptInvite } from "@/features/organizations/lib/invites";
import { requireSession } from "@/features/organizations/lib/authorization";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    const { token } = await context.params;

    const result = await acceptInvite(token, session.userId, session.email);
    if ("error" in result) {
      if (result.error === "EMAIL_MISMATCH") {
        return apiError(
          "FORBIDDEN",
          "This invitation was sent to a different email address",
          403,
        );
      }
      return apiError("NOT_FOUND", "This invitation is invalid or has expired", 404);
    }

    return apiSuccess({
      organizationId: result.organizationId,
      alreadyMember: result.alreadyMember,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
