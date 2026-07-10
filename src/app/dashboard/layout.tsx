import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

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
