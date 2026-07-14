import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";

import { AdminPageClient } from "@/features/admin/components/admin-page";
import { listOwnerOrganizations } from "@/features/admin/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const ownerOrgs = await listOwnerOrganizations(session.user.id);

  if (ownerOrgs.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={Shield}
          title="Admin"
          description="System health, usage, and maintenance for organization owners."
        />
        <div
          className="surface-elevated p-8 text-center text-muted-foreground"
          role="status"
        >
          Admin is restricted to organization owners. Ask an owner for access or create an
          organization.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Shield}
        title="Admin"
        description="System health, usage stats, processing queue, and search maintenance."
      />
      <AdminPageClient
        organizations={ownerOrgs.map((o) => ({ id: o.id, name: o.name }))}
        initialOrgId={ownerOrgs[0]?.id ?? null}
      />
    </div>
  );
}
