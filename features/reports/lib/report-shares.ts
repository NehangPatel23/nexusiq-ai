import { randomBytes } from "crypto";

import type { ReportFormat } from "@prisma/client";

import { logDataRoomAudit } from "@/features/data-room/lib/audit";
import { AuthError } from "@/features/organizations/lib/authorization";
import { prisma } from "@/lib/db";

import { requireReportAccess } from "./authorization";

export type ReportShareErrorCode = "NOT_FOUND" | "EXPIRED" | "REVOKED";

function generateShareToken() {
  return randomBytes(24).toString("base64url");
}

export function reportSharePublicUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/share/reports/${token}`;
}

export async function createReportShare(params: {
  reportId: string;
  userId: string;
  label?: string | null;
  expiresInDays?: number | null;
  format?: ReportFormat | null;
}) {
  const { report, session } = await requireReportAccess(params.reportId);
  const expiresAt =
    params.expiresInDays && params.expiresInDays > 0
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  const share = await prisma.reportShare.create({
    data: {
      reportId: report.id,
      projectId: report.projectId,
      token: generateShareToken(),
      label: params.label?.trim() || null,
      format: params.format ?? null,
      expiresAt,
      createdById: params.userId,
    },
  });

  void logDataRoomAudit({
    projectId: report.projectId,
    actorId: params.userId,
    action: "REPORT_SHARE_CREATED",
    resourceType: "REPORT",
    resourceId: report.id,
    resourceName: report.title,
    metadata: {
      shareId: share.id,
      expiresAt: expiresAt?.toISOString() ?? null,
      format: params.format ?? "all",
      role: session.membership.role,
    },
  }).catch(() => undefined);

  return share;
}

export async function listReportShares(reportId: string, userId: string) {
  await requireReportAccess(reportId);
  void userId;
  return prisma.reportShare.findMany({
    where: { reportId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function revokeReportShare(shareId: string, userId: string) {
  const share = await prisma.reportShare.findFirst({
    where: { id: shareId, revokedAt: null },
    include: { report: { select: { id: true, title: true, projectId: true } } },
  });
  if (!share) {
    throw new AuthError("NOT_FOUND", "Share not found");
  }
  await requireReportAccess(share.reportId);

  const updated = await prisma.reportShare.update({
    where: { id: shareId },
    data: { revokedAt: new Date() },
  });

  void logDataRoomAudit({
    projectId: share.report.projectId,
    actorId: userId,
    action: "REPORT_SHARE_REVOKED",
    resourceType: "REPORT",
    resourceId: share.report.id,
    resourceName: share.report.title,
    metadata: { shareId },
  }).catch(() => undefined);

  return updated;
}

export async function getActiveReportShareByToken(token: string) {
  const share = await prisma.reportShare.findFirst({
    where: { token, revokedAt: null },
    include: {
      report: {
        select: {
          id: true,
          title: true,
          reportType: true,
          content: true,
          createdAt: true,
          projectId: true,
          metadata: true,
          format: true,
          filePath: true,
        },
      },
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!share) {
    return { ok: false as const, error: "NOT_FOUND" as const, message: "Share link not found" };
  }
  if (share.expiresAt && share.expiresAt < new Date()) {
    return { ok: false as const, error: "EXPIRED" as const, message: "Share link has expired" };
  }

  return { ok: true as const, share };
}
