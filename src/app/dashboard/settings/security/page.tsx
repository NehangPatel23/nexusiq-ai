import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SecurityForm } from "@/features/settings/components/security-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Security Settings" };

export default async function SecuritySettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  return <SecurityForm />;
}
