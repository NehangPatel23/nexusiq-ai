import type { Metadata } from "next";

import { OrganizationsList } from "@/features/organizations/components/organizations-list";
import { listUserOrganizations } from "@/features/organizations/lib/organizations";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Organizations",
};

export default async function OrganizationsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const organizations = await listUserOrganizations(session.user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Organizations"
        description="Manage your organizations, teams, and member access."
      />
      <OrganizationsList organizations={organizations} />
    </div>
  );
}
