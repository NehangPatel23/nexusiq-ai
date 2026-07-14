import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ShortcutsReference } from "@/features/settings/components/shortcuts-reference";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Keyboard Shortcuts" };

export default async function ShortcutsSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  return <ShortcutsReference />;
}
