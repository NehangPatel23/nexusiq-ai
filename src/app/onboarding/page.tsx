import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/features/organizations/components/onboarding-form";
import { listPendingInvitesForEmail } from "@/features/organizations/lib/invites";
import { countUserOrganizations } from "@/features/organizations/lib/organizations";
import { formatOrgRole } from "@/features/organizations/lib/roles";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Onboarding",
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  const orgCount = await countUserOrganizations(session.user.id);
  if (orgCount > 0) {
    redirect("/dashboard");
  }

  const pendingInvites = await listPendingInvitesForEmail(session.user.email);

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg space-y-6">
        {pendingInvites.length > 0 && (
          <div
            role="status"
            className="rounded-xl border border-primary/30 bg-primary/10 p-4"
          >
            <p className="text-sm font-medium text-primary">You have pending invitations</p>
            <ul className="mt-3 space-y-2" role="list">
              {pendingInvites.map((invite) => (
                <li key={invite.id}>
                  <Link
                    href={`/invite/${invite.token}`}
                    className="block rounded-lg border border-border/50 bg-card/40 px-4 py-3 text-sm transition-colors hover:border-primary/30"
                  >
                    <span className="font-medium">{invite.organization.name}</span>
                    <span className="text-muted-foreground"> — join as {formatOrgRole(invite.role)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <OnboardingForm />
      </div>
    </main>
  );
}
