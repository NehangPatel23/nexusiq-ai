export const dynamic = "force-dynamic";

import { requireProjectMissingAccess } from "@/features/missing/lib/authorization";
import {
  listMissingItems,
  missingItemsToCsv,
  missingItemsToMarkdown,
} from "@/features/missing/lib/missing-items";
import { exportMissingBodySchema } from "@/features/missing/schemas";
import { apiError, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { project } = await requireProjectMissingAccess(id);

    const parsed = exportMissingBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const all = await listMissingItems({ projectId: id });
    const statuses = new Set(parsed.data.statuses);
    const items = all.filter((item) => statuses.has(item.status as "OPEN" | "REQUESTED"));

    if (parsed.data.format === "csv") {
      const csv = missingItemsToCsv(items);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="missing-follow-ups-${project.slug}.csv"`,
        },
      });
    }

    const markdown = missingItemsToMarkdown(items, project.name);
    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="missing-follow-ups-${project.slug}.md"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
