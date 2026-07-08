import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AcceptInviteButton } from "@/features/organizations/components/accept-invite-button";
import { findValidInvite } from "@/features/organizations/lib/invites";
import { formatOrgRole } from "@/features/organizations/lib/roles";
import { auth } from "@/lib/auth";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Accept Invitation",
};

export default async function InvitePage({ params }: PageProps) {
  const session = await auth();
  const { token } = await params;
  const invite = await findValidInvite(token);

  if (!invite) {
    return (
      <main id="main-content" className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Invitation expired</h1>
          <p className="text-muted-foreground">
            This invitation link is invalid or has expired. Ask your administrator to send a new
            invite.
          </p>
          <Link href="/dashboard" className="text-primary hover:underline">
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border/60 bg-card/40 p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">You&apos;re invited</h1>
          <p className="text-muted-foreground">
            Join <strong>{invite.organization.name}</strong> as{" "}
            <strong>{formatOrgRole(invite.role)}</strong>.
          </p>
          <p className="text-xs text-muted-foreground">Invitation sent to {invite.email}</p>
        </div>
        <AcceptInviteButton token={token} organizationName={invite.organization.name} />
      </div>
    </main>
  );
}
