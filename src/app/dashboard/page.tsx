import { redirect } from "next/navigation";

import { getDashboardData } from "@/features/projects/lib/dashboard";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await getDashboardData(session.user.id);

  return <DashboardHome data={data} />;
}
