import { logDataRoomAudit } from "@/features/data-room/lib/audit";

export async function logReportGenerated(params: {
  projectId: string;
  actorId: string;
  reportId: string;
  title: string;
  reportType: string;
}) {
  return logDataRoomAudit({
    projectId: params.projectId,
    actorId: params.actorId,
    action: "REPORT_GENERATED",
    resourceType: "REPORT",
    resourceId: params.reportId,
    resourceName: params.title,
    metadata: { reportType: params.reportType },
  });
}

export async function logReportExported(params: {
  projectId: string;
  actorId: string | null;
  reportId: string;
  title: string;
  format: string;
  viaShare?: boolean;
}) {
  return logDataRoomAudit({
    projectId: params.projectId,
    actorId: params.actorId,
    action: "REPORT_EXPORTED",
    resourceType: "REPORT",
    resourceId: params.reportId,
    resourceName: params.title,
    metadata: {
      format: params.format,
      viaShare: Boolean(params.viaShare),
    },
  });
}
