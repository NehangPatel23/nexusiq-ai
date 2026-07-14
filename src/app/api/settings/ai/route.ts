import { aiSettingsSchema } from "@/features/settings/schemas";
import {
  getEffectiveOllamaConfig,
  upsertAiSystemSettings,
} from "@/features/settings/lib/system-settings";
import { requireSession } from "@/features/organizations/lib/authorization";
import { logAudit } from "@/features/history/lib/audit";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { resetOllamaClient } from "@/lib/ai/ollama-client";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireSession();
    const effective = await getEffectiveOllamaConfig();
    return apiSuccess({
      baseUrl: effective.baseUrl.value,
      chatModel: effective.chatModel.value,
      embedModel: effective.embedModel.value,
      sources: {
        baseUrl: effective.baseUrl.source,
        chatModel: effective.chatModel.source,
        embedModel: effective.embedModel.source,
      },
      apiKeyConfigured: effective.apiKeyConfigured,
      resolutionRule: effective.resolutionRule,
      // Never expose OLLAMA_API_KEY
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = aiSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid AI settings", 400, parsed.error.flatten());
    }

    await upsertAiSystemSettings({
      baseUrl: parsed.data.baseUrl || undefined,
      chatModel: parsed.data.chatModel,
      embedModel: parsed.data.embedModel,
    });
    resetOllamaClient();

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: session.userId, organization: { deletedAt: null } },
      select: { organizationId: true },
      take: 5,
    });
    await Promise.all(
      memberships.map((m) =>
        logAudit({
          organizationId: m.organizationId,
          userId: session.userId,
          action: "SETTINGS_UPDATE",
          entityType: "SystemSetting",
          metadata: { detail: "ai_models" },
        }),
      ),
    );

    const effective = await getEffectiveOllamaConfig();
    return apiSuccess({
      baseUrl: effective.baseUrl.value,
      chatModel: effective.chatModel.value,
      embedModel: effective.embedModel.value,
      sources: {
        baseUrl: effective.baseUrl.source,
        chatModel: effective.chatModel.source,
        embedModel: effective.embedModel.source,
      },
      apiKeyConfigured: effective.apiKeyConfigured,
      resolutionRule: effective.resolutionRule,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
