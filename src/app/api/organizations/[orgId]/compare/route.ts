import {
  assertProjectsInOrganization,
  compareProjects,
} from "@/features/history/lib/compare";
import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

type RouteContext = { params: Promise<{ orgId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    await requireOrgRole(orgId, "VIEWER");

    const url = new URL(request.url);
    const projectA = url.searchParams.get("projectA");
    const projectB = url.searchParams.get("projectB");

    if (!projectA || !projectB) {
      return apiError("VALIDATION_ERROR", "projectA and projectB are required", 400);
    }
    if (projectA === projectB) {
      return apiError("VALIDATION_ERROR", "Choose two different projects", 400);
    }

    const inOrg = await assertProjectsInOrganization(orgId, [projectA, projectB]);
    if (!inOrg) {
      return apiError("NOT_FOUND", "One or both projects were not found in this organization", 404);
    }

    const result = await compareProjects(projectA, projectB);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
