import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { isWithinGrace } from "@/features/history/lib/constants";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (session?.user?.id) {
    if (session.user.accountStatus === "pending_deletion") {
      redirect("/account/recover");
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { deletedAt: true, purgeAfter: true },
    });
    if (user?.deletedAt) {
      if (isWithinGrace(user.purgeAfter)) {
        redirect("/account/recover");
      }
      redirect("/login");
    }
  }

  return (
    <AppShell
      user={
        session?.user
          ? {
              name: session.user.name,
              email: session.user.email ?? "",
              image: session.user.image,
            }
          : undefined
      }
    >
      {children}
    </AppShell>
  );
}
