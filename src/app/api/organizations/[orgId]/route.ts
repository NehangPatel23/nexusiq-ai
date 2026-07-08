import {
  requireOrgRole,
} from "@/features/organizations/lib/authorization";
import {
  getOrganizationById,
  softDeleteOrganization,
  updateOrganization,
} from "@/features/organizations/lib/organizations";
import { updateOrganizationSchema } from "@/features/organizations/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    await requireOrgRole(orgId, "VIEWER");

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return apiError("NOT_FOUND", "Organization not found", 404);
    }

    return apiSuccess(organization);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    await requireOrgRole(orgId, "ADMIN");

    const body = await request.json();
    const parsed = updateOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid organization data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return apiError("NOT_FOUND", "Organization not found", 404);
    }

    const updated = await updateOrganization(orgId, parsed.data);
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    await requireOrgRole(orgId, "OWNER");

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return apiError("NOT_FOUND", "Organization not found", 404);
    }

    await softDeleteOrganization(orgId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
