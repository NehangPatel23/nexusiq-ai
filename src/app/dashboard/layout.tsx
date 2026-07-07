import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Protected layout skeleton for /dashboard.
 * Auth middleware will be added in slice 01-auth.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
