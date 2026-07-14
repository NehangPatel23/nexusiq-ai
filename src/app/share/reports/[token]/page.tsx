import { notFound } from "next/navigation";

import { SharedReportView } from "@/features/reports/components/shared-report-view";
import { getActiveReportShareByToken } from "@/features/reports/lib/report-shares";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedReportPage({ params }: PageProps) {
  const { token } = await params;
  const result = await getActiveReportShareByToken(token);
  if (!result.ok) {
    notFound();
  }

  const { share } = result;

  return (
    <SharedReportView
      token={token}
      projectName={share.project.name}
      shareLabel={share.label}
      formatLock={share.format}
      expiresAt={share.expiresAt?.toISOString() ?? null}
      createdBy={share.createdBy.name ?? share.createdBy.email}
      report={{
        title: share.report.title,
        reportType: share.report.reportType,
        content: share.report.content,
        createdAt: share.report.createdAt.toISOString(),
      }}
    />
  );
}
