export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { requireProjectMissingAccess } from "@/features/missing/lib/authorization";
import { scanMissingBodySchema } from "@/features/missing/schemas";
import { scanMissingInfo } from "@/lib/ai/missing-info";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectMissingAccess(id);

    const parsed = scanMissingBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const result = await scanMissingInfo({
      projectId: id,
      force: parsed.data.force,
      polishFollowUps: parsed.data.polishFollowUps,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
