export const dynamic = "force-dynamic";

import { requireSimulationAccess } from "@/features/simulator/lib/authorization";
import { getSimulationRun } from "@/lib/ai/simulator";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireSimulationAccess(id);
    const simulation = await getSimulationRun(id);
    if (!simulation) {
      return apiError("NOT_FOUND", "Simulation not found", 404);
    }
    return apiSuccess(simulation);
  } catch (error) {
    return handleApiError(error);
  }
}
