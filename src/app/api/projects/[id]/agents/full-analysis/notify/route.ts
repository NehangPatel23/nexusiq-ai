export const dynamic = "force-dynamic";

import { z } from "zod";

import { requireProjectIntelligenceAccess } from "@/features/intelligence/lib/authorization";
import { notifyBackgroundAnalysisCompleted } from "@/features/intelligence/lib/full-analysis-notifications";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  mode: z.enum(["full", "specialists"]),
  outcome: z.enum(["success", "partial", "failed", "ollama"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  tab: z.enum(["consensus", "executive"]).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { session } = await requireProjectIntelligenceAccess(id);
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid request body", 400, parsed.error.flatten().fieldErrors);
    }

    const notification = await notifyBackgroundAnalysisCompleted({
      userId: session.userId,
      projectId: id,
      title: parsed.data.title,
      body: parsed.data.body,
      tab: parsed.data.tab,
    });

    return apiSuccess({ notificationId: notification.id });
  } catch (error) {
    return handleApiError(error);
  }
}
