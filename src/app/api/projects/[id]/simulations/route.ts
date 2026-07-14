export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { requireProjectSimulatorAccess } from "@/features/simulator/lib/authorization";
import { runSimulationBodySchema } from "@/features/simulator/schemas";
import { OllamaUnavailableError, OllamaTimeoutError } from "@/lib/ai/agents/run-agent";
import {
  getSimulationPrerequisites,
  listSimulationRuns,
  runSimulation,
  SimulationPrerequisiteError,
} from "@/lib/ai/simulator";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectSimulatorAccess(id);
    const [simulations, prerequisites] = await Promise.all([
      listSimulationRuns(id),
      getSimulationPrerequisites(id),
    ]);
    return apiSuccess({ simulations, prerequisites });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { session } = await requireProjectSimulatorAccess(id);

    const parsed = runSimulationBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const simulation = await runSimulation({
      projectId: id,
      scenarioName: parsed.data.scenarioName,
      parameters: parsed.data.parameters,
      triggeredById: session.userId,
    });

    return apiSuccess(simulation, 201);
  } catch (error) {
    if (error instanceof SimulationPrerequisiteError) {
      return apiError(error.code, error.message, 400, { missing: error.missing });
    }
    if (error instanceof OllamaUnavailableError) {
      return apiError(error.code, error.message, 503);
    }
    if (error instanceof OllamaTimeoutError) {
      return apiError(error.code, error.message, 504);
    }
    return handleApiError(error);
  }
}
