import { randomBytes } from "crypto";

import { prisma } from "@/lib/db";

export type ShareErrorCode = "NOT_FOUND" | "EXPIRED" | "REVOKED";

export type ShareServiceError = {
  error: ShareErrorCode;
  message: string;
};

function generateShareToken() {
  return randomBytes(24).toString("base64url");
}

export async function createDataRoomShare(params: {
  projectId: string;
  createdById: string;
  label?: string | null;
  expiresInDays?: number | null;
}) {
  const expiresAt =
    params.expiresInDays && params.expiresInDays > 0
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  return prisma.dataRoomShare.create({
    data: {
      projectId: params.projectId,
      token: generateShareToken(),
      label: params.label ?? null,
      expiresAt,
      createdById: params.createdById,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function listDataRoomShares(projectId: string) {
  return prisma.dataRoomShare.findMany({
    where: { projectId, revokedAt: null },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeDataRoomShare(shareId: string) {
  return prisma.dataRoomShare.update({
    where: { id: shareId },
    data: { revokedAt: new Date() },
  });
}

export type ShareLookupResult =
  | { error: ShareErrorCode; message: string }
  | {
      share: Awaited<ReturnType<typeof prisma.dataRoomShare.findFirst>> & {
        project: {
          id: string;
          name: string;
          workspace: { organizationId: string; name: string };
        };
      };
    };

export async function getActiveShareByToken(token: string): Promise<ShareLookupResult> {
  const share = await prisma.dataRoomShare.findFirst({
    where: { token, revokedAt: null },
    include: {
      project: {
        include: {
          workspace: { select: { organizationId: true, name: true } },
        },
      },
    },
  });

  if (!share) {
    return { error: "NOT_FOUND" as const, message: "Share link not found" };
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return { error: "EXPIRED" as const, message: "Share link has expired" };
  }

  return { share };
}
