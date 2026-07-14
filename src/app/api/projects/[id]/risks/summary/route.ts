export const dynamic = "force-dynamic";

import { requireProjectRisksAccess } from "@/features/risks/lib/authorization";
import { getProjectRisksSummary } from "@/features/risks/lib/risks-summary";
import { apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectRisksAccess(id);
    const summary = await getProjectRisksSummary(id);
    return apiSuccess({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}
