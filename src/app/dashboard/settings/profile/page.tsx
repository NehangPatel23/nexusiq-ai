import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/features/auth/components/profile-form";
import { PageHeader } from "@/components/layout/page-header";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Profile Settings",
};

export default async function ProfileSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <PageHeader title="Profile" description="Manage your name, avatar, and account details." />
      <ProfileForm user={user} />
    </div>
  );
}
