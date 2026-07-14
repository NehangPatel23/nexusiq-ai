import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountRecoverPanel } from "@/features/settings/components/account-recover-panel";
import { isWithinGrace } from "@/features/history/lib/constants";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Account Recovery" };

export default async function AccountRecoverPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/recover");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, deletedAt: true, purgeAfter: true },
  });

  if (!user?.deletedAt || !isWithinGrace(user.purgeAfter)) {
    redirect("/dashboard");
  }

  return (
    <AccountRecoverPanel
      email={user.email}
      purgeAfterIso={user.purgeAfter?.toISOString() ?? null}
    />
  );
}
