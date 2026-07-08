import { requireOrgRole } from "@/features/organizations/lib/authorization";
import { createTeam, listOrganizationTeams } from "@/features/organizations/lib/organizations";
import { createTeamSchema } from "@/features/organizations/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ orgId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    await requireOrgRole(orgId, "VIEWER");

    const teams = await listOrganizationTeams(orgId);
    return apiSuccess({ items: teams, total: teams.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    await requireOrgRole(orgId, "ADMIN");

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid team data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const team = await createTeam(orgId, parsed.data);
    return apiSuccess(team, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
