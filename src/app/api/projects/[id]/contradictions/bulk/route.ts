export const dynamic = "force-dynamic";

import { requireProjectContradictionsAccess } from "@/features/contradictions/lib/authorization";
import { updateContradictionStatus } from "@/features/contradictions/lib/contradictions";
import { bulkUpdateContradictionStatusBodySchema } from "@/features/contradictions/schemas";
import { getSession } from "@/lib/session";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params;
    await requireProjectContradictionsAccess(projectId);
    const session = await getSession();

    const parsed = bulkUpdateContradictionStatusBodySchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const owned = await prisma.contradiction.findMany({
      where: { projectId, id: { in: parsed.data.ids } },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((row) => row.id));
    const updates = [];
    for (const contradictionId of parsed.data.ids) {
      if (!ownedIds.has(contradictionId)) continue;
      updates.push(
        updateContradictionStatus({
          id: contradictionId,
          status: parsed.data.status,
          resolutionNote: parsed.data.resolutionNote,
          statusChangedById: session?.user?.id ?? null,
        }),
      );
    }
    const results = await Promise.all(updates);
    return apiSuccess({ updated: results.length, contradictions: results });
  } catch (error) {
    return handleApiError(error);
  }
}
