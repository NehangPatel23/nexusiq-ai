import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { DeleteOrganizationButton } from "@/features/organizations/components/delete-organization-button";
import { OrganizationsList } from "@/features/organizations/components/organizations-list";
import { listTombstonedOrganizationsForOwner } from "@/features/history/lib/purge";
import { listUserOrganizations } from "@/features/organizations/lib/organizations";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Organizations",
};

export default async function OrganizationsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [organizations, tombstoned] = await Promise.all([
    listUserOrganizations(session.user.id),
    listTombstonedOrganizationsForOwner(session.user.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Building2}
        title="Organizations"
        description="Manage your organizations, teams, and member access."
      />
      <OrganizationsList organizations={organizations} />

      {tombstoned.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recently deactivated</h2>
          <p className="text-sm text-muted-foreground">
            These organizations can be restored within 24 hours of deletion.
          </p>
          <ul className="space-y-3">
            {tombstoned.map((org) => (
              <li key={org.id} className="surface-elevated flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <p className="font-medium">{org.name}</p>
                  <p className="text-caption">
                    Purge after{" "}
                    {org.purgeAfter ? new Date(org.purgeAfter).toLocaleString() : "24 hours"}
                  </p>
                </div>
                <DeleteOrganizationButton
                  orgId={org.id}
                  orgName={org.name}
                  tombstoned
                  purgeAfterIso={org.purgeAfter?.toISOString() ?? null}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
