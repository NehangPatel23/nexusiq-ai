"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { verifyPassword } from "@/features/auth/lib/password";
import { updateUserPassword, updateUserProfile } from "@/features/auth/lib/users";
import { updateProfileSchema } from "@/features/auth/schemas";
import { logAudit } from "@/features/history/lib/audit";
import { AuthError, requireSession } from "@/features/organizations/lib/authorization";
import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OllamaClient, getOllamaHostOnly, resetOllamaClient } from "@/lib/ai/ollama-client";

import {
  AccountDeletionError,
  recoverUser,
  tombstoneUser,
} from "./lib/account-deletion";
import { parseNotificationPrefs } from "./lib/notification-prefs";
import { toOllamaClientConfig } from "./lib/ollama-config";
import { getEffectiveOllamaConfig, upsertAiSystemSettings } from "./lib/system-settings";
import {
  aiSettingsSchema,
  changePasswordSchema,
  deleteAccountSchema,
  notificationPrefsSchema,
  themeSchema,
} from "./schemas";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | {
      success: false;
      error: { code: string; message: string; fieldErrors?: Record<string, string[]> };
    };

function validationError(fieldErrors: Record<string, string[]>) {
  return {
    success: false as const,
    error: {
      code: "VALIDATION_ERROR",
      message: "Please fix the errors below",
      fieldErrors,
    },
  };
}

function actionError<T = void>(code: string, message: string): ActionResult<T> {
  return { success: false, error: { code, message } };
}

async function logSettingsUpdate(userId: string, detail: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId, organization: { deletedAt: null } },
    select: { organizationId: true },
    take: 5,
  });
  await Promise.all(
    memberships.map((m) =>
      logAudit({
        organizationId: m.organizationId,
        userId,
        action: "SETTINGS_UPDATE",
        entityType: "User",
        entityId: userId,
        metadata: { detail },
      }),
    ),
  );
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return actionError("NOT_FOUND", "User not found");

    const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return actionError("UNAUTHORIZED", "Current password is incorrect");
    }

    await updateUserPassword(user.email, parsed.data.newPassword);
    await logSettingsUpdate(session.userId, "password_changed");
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) return actionError(error.code, error.message);
    throw error;
  }
}

export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = deleteAccountSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    await tombstoneUser(session.userId, parsed.data.password);

    try {
      await signOut({ redirectTo: "/login?deleted=1" });
    } catch (error) {
      if (isRedirectError(error)) throw error;
    }
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) return actionError(error.code, error.message);
    if (error instanceof AccountDeletionError) {
      return actionError(error.code, error.message);
    }
    if (isRedirectError(error)) throw error;
    throw error;
  }
}

export async function recoverAccountAction(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await recoverUser(session.userId);
    const { unstable_update } = await import("@/lib/auth");
    await unstable_update({ user: { accountStatus: "active" } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) return actionError(error.code, error.message);
    if (error instanceof AccountDeletionError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function updateNotificationPrefsAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = notificationPrefsSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { notificationPrefs: parsed.data },
    });
    await logSettingsUpdate(session.userId, "notification_prefs");
    revalidatePath("/dashboard/settings/notifications");
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) return actionError(error.code, error.message);
    throw error;
  }
}

export async function updateThemeAction(input: unknown): Promise<ActionResult<{ theme: string }>> {
  try {
    const session = await requireSession();
    const parsed = themeSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { theme: parsed.data.theme },
    });
    await logSettingsUpdate(session.userId, `theme:${parsed.data.theme}`);
    revalidatePath("/dashboard/settings/appearance");
    return { success: true, data: { theme: parsed.data.theme } };
  } catch (error) {
    if (error instanceof AuthError) return actionError(error.code, error.message);
    throw error;
  }
}

export async function updateAiSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const parsed = aiSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    await upsertAiSystemSettings({
      baseUrl: parsed.data.baseUrl || undefined,
      chatModel: parsed.data.chatModel,
      embedModel: parsed.data.embedModel,
    });
    resetOllamaClient();
    await logSettingsUpdate(session.userId, "ai_models");
    revalidatePath("/dashboard/settings/ai");
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) return actionError(error.code, error.message);
    throw error;
  }
}

export async function testOllamaConnectionAction(): Promise<
  ActionResult<{ status: "connected" | "unreachable"; host: string; error?: string }>
> {
  try {
    await requireSession();
    const effective = await getEffectiveOllamaConfig();
    const clientConfig = toOllamaClientConfig(effective);
    const client = new OllamaClient({ config: clientConfig });
    const health = await client.healthCheck();
    const host = getOllamaHostOnly(clientConfig.baseUrl) || "(not set)";

    if (health.ok) {
      return { success: true, data: { status: "connected", host } };
    }
    return {
      success: true,
      data: { status: "unreachable", host, error: health.error },
    };
  } catch (error) {
    if (error instanceof AuthError) return actionError(error.code, error.message);
    throw error;
  }
}

export async function updateSettingsProfileAction(
  input: unknown,
): Promise<ActionResult<{ name: string; image: string | null }>> {
  try {
    const session = await requireSession();
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const user = await updateUserProfile(session.userId, { name: parsed.data.name });
    await logSettingsUpdate(session.userId, "profile");
    return {
      success: true,
      data: { name: user.name ?? "", image: user.image },
    };
  } catch (error) {
    if (error instanceof AuthError) return actionError(error.code, error.message);
    throw error;
  }
}

export async function getNotificationPrefsForCurrentUser() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { notificationPrefs: true },
  });
  return parseNotificationPrefs(user?.notificationPrefs);
}
