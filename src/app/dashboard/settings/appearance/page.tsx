import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppearanceForm } from "@/features/settings/components/appearance-form";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Appearance Settings" };

export default async function AppearanceSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { theme: true },
  });

  return <AppearanceForm initialTheme={user?.theme ?? "dark"} />;
}
