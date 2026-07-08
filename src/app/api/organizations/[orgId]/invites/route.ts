import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { createOrganizationInvite } from "@/features/organizations/lib/invites";
import {
  getOrganizationById,
} from "@/features/organizations/lib/organizations";
import { inviteMemberSchema } from "@/features/organizations/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    const auth = await requireOrgRole(orgId, "ADMIN");

    const body = await request.json();
    const parsed = inviteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid invite data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return apiError("NOT_FOUND", "Organization not found", 404);
    }

    const result = await createOrganizationInvite(
      orgId,
      organization.name,
      parsed.data.email,
      parsed.data.role,
      auth.name,
    );

    if ("error" in result) {
      return apiError("CONFLICT", "This user is already a member or has a pending invite", 409);
    }

    return apiSuccess(
      {
        id: result.invite.id,
        email: result.invite.email,
        role: result.invite.role,
        expiresAt: result.invite.expiresAt,
        ...(process.env.NODE_ENV === "development"
          ? { devInviteUrl: `/invite/${result.invite.token}` }
          : {}),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
