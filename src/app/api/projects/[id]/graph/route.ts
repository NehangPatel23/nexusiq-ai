export const dynamic = "force-dynamic";

import { requireProjectGraphAccess } from "@/features/graph/lib/authorization";
import { getProjectGraph } from "@/features/graph/lib/graph-data";
import { apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireProjectGraphAccess(id);
    const graph = await getProjectGraph(id);
    return apiSuccess(graph);
  } catch (error) {
    return handleApiError(error);
  }
}
