export const dynamic = "force-dynamic";

import { requireProjectMissingAccess } from "@/features/missing/lib/authorization";
import { listMissingItems } from "@/features/missing/lib/missing-items";
import { listMissingQuerySchema } from "@/features/missing/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectMissingAccess(id);

    const url = new URL(request.url);
    const parsed = listMissingQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const items = await listMissingItems({
      projectId: id,
      status: parsed.data.status,
    });

    return apiSuccess({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
