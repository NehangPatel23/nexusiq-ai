"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  AuthError,
  requireOrgRole,
  requireSession,
} from "@/features/organizations/lib/authorization";
import {
  acceptInvite,
  cancelOrganizationInvite,
  createOrganizationInvite,
  updateOrganizationInviteRole,
} from "@/features/organizations/lib/invites";
import {
  countUserOrganizations,
  createOrganization,
  createTeam,
  getOrganizationById,
  removeMember,
  softDeleteOrganization,
  updateMemberRole,
  updateOrganization,
} from "@/features/organizations/lib/organizations";
import {
  createOrganizationSchema,
  createTeamSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from "@/features/organizations/schemas";
import { hasMinRole } from "@/features/organizations/lib/roles";
import { prisma } from "@/lib/db";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };

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

export async function createOrganizationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    const parsed = createOrganizationSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const organization = await createOrganization(session.userId, parsed.data);
    revalidatePath("/dashboard/organizations");
    revalidatePath("/dashboard");

    return { success: true, data: { id: organization.id } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return actionError(
        "SESSION_DB_MISMATCH",
        "Your session does not match this database. Log out, then sign in again (or register) on this environment.",
      );
    }
    throw error;
  }
}

export async function updateOrganizationAction(
  orgId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireOrgRole(orgId, "ADMIN");
    const parsed = updateOrganizationSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    await updateOrganization(orgId, parsed.data);
    revalidatePath(`/dashboard/organizations/${orgId}/settings`);
    revalidatePath("/dashboard/organizations");

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function deleteOrganizationAction(orgId: string): Promise<ActionResult> {
  try {
    await requireOrgRole(orgId, "OWNER");
    await softDeleteOrganization(orgId);
    revalidatePath("/dashboard/organizations");
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function inviteMemberAction(
  orgId: string,
  input: unknown,
): Promise<ActionResult<{ devInviteUrl?: string }>> {
  try {
    const auth = await requireOrgRole(orgId, "ADMIN");
    const parsed = inviteMemberSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return actionError("NOT_FOUND", "Organization not found");
    }

    const result = await createOrganizationInvite(
      orgId,
      organization.name,
      parsed.data.email,
      parsed.data.role,
      auth.name,
    );

    if ("error" in result) {
      return actionError("CONFLICT", "This user is already a member or has a pending invite");
    }

    revalidatePath(`/dashboard/organizations/${orgId}/settings`);

    return {
      success: true,
      data:
        process.env.NODE_ENV === "development"
          ? { devInviteUrl: `/invite/${result.invite.token}` }
          : undefined,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function updateMemberRoleAction(
  orgId: string,
  memberId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const auth = await requireOrgRole(orgId, "ADMIN");
    const parsed = updateMemberRoleSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      return actionError("NOT_FOUND", "Member not found");
    }

    if (member.role === "OWNER" && parsed.data.role !== "OWNER") {
      return actionError("FORBIDDEN", "Cannot change the organization owner's role");
    }

    if (member.userId === auth.userId) {
      return actionError("FORBIDDEN", "You cannot change your own role");
    }

    if (parsed.data.role === "OWNER" && auth.membership.role !== "OWNER") {
      return actionError("FORBIDDEN", "Only the owner can assign the owner role");
    }

    if (
      auth.membership.role !== "OWNER" &&
      !hasMinRole(auth.membership.role, parsed.data.role)
    ) {
      return actionError("FORBIDDEN", "Cannot assign a role higher than your own");
    }

    await updateMemberRole(orgId, memberId, parsed.data.role);
    revalidatePath(`/dashboard/organizations/${orgId}/settings`);

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function removeMemberAction(orgId: string, memberId: string): Promise<ActionResult> {
  try {
    const auth = await requireOrgRole(orgId, "ADMIN");

    const member = await prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });

    if (!member) {
      return actionError("NOT_FOUND", "Member not found");
    }

    if (member.role === "OWNER") {
      return actionError("FORBIDDEN", "Cannot remove the organization owner");
    }

    if (member.userId === auth.userId) {
      return actionError("FORBIDDEN", "You cannot remove yourself");
    }

    await removeMember(orgId, memberId);
    revalidatePath(`/dashboard/organizations/${orgId}/settings`);

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function createTeamAction(orgId: string, input: unknown): Promise<ActionResult> {
  try {
    await requireOrgRole(orgId, "ADMIN");
    const parsed = createTeamSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    await createTeam(orgId, parsed.data);
    revalidatePath(`/dashboard/organizations/${orgId}/settings`);

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function acceptInviteAction(token: string): Promise<ActionResult<{ organizationId: string }>> {
  try {
    const session = await requireSession();
    const result = await acceptInvite(token, session.userId, session.email);

    if ("error" in result) {
      if (result.error === "EMAIL_MISMATCH") {
        return actionError(
          "FORBIDDEN",
          "This invitation was sent to a different email address",
        );
      }
      return actionError("NOT_FOUND", "This invitation is invalid or has expired");
    }

    revalidatePath("/dashboard/organizations");
    return { success: true, data: { organizationId: result.organizationId } };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function cancelInviteAction(orgId: string, inviteId: string): Promise<ActionResult> {
  try {
    await requireOrgRole(orgId, "ADMIN");
    const cancelled = await cancelOrganizationInvite(orgId, inviteId);
    if (!cancelled) {
      return actionError("NOT_FOUND", "Invite not found or expired");
    }
    revalidatePath(`/dashboard/organizations/${orgId}/settings`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function updateInviteRoleAction(
  orgId: string,
  inviteId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireOrgRole(orgId, "ADMIN");
    const parsed = updateMemberRoleSchema.safeParse(input);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }
    if (parsed.data.role === "OWNER") {
      return actionError("FORBIDDEN", "Cannot invite users as Owner");
    }
    const updated = await updateOrganizationInviteRole(orgId, inviteId, parsed.data.role);
    if (!updated) {
      return actionError("NOT_FOUND", "Invite not found or expired");
    }
    revalidatePath(`/dashboard/organizations/${orgId}/settings`);
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.code, error.message);
    }
    throw error;
  }
}

export async function checkNeedsOnboarding(): Promise<boolean> {
  const session = await requireSession();
  const count = await countUserOrganizations(session.userId);
  return count === 0;
}
