export const dynamic = "force-dynamic";

import { requireContradictionAccess } from "@/features/contradictions/lib/authorization";
import { promoteContradictionToFinding } from "@/features/contradictions/lib/contradictions";
import { getSession } from "@/lib/session";
import { apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireContradictionAccess(id);
    const session = await getSession();

    const result = await promoteContradictionToFinding({
      contradictionId: id,
      userId: session?.user?.id ?? null,
    });

    return apiSuccess({
      finding: {
        id: result.finding.id,
        title: result.finding.title,
        status: result.finding.status,
        severity: result.finding.severity,
      },
      promotedFindingId: result.contradiction.promotedFindingId,
      created: result.created,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
