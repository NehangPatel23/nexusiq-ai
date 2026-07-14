import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";

import { HistoryPageClient } from "@/features/history/components/history-page";
import { listOrganizationProjectsForCompare } from "@/features/history/lib/compare";
import { listUserOrganizations } from "@/features/organizations/lib/organizations";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const organizations = await listUserOrganizations(session.user.id);
  const projectsByOrg: Record<string, Array<{ id: string; name: string }>> = {};
  await Promise.all(
    organizations.map(async (org) => {
      projectsByOrg[org.id] = await listOrganizationProjectsForCompare(org.id);
    }),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        icon={BarChart3}
        title="History"
        description="Organization audit log and side-by-side project comparison."
      />
      <HistoryPageClient
        organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
        initialOrgId={organizations[0]?.id ?? null}
        projectsByOrg={projectsByOrg}
      />
    </div>
  );
}
