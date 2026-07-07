import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

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
