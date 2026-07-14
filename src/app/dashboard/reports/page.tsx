import type { Metadata } from "next";
import { FileText, FolderOpen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardData } from "@/features/projects/lib/dashboard";
import { listUserProjects } from "@/features/projects/lib/projects";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const [dashboard, projects] = await Promise.all([
    getDashboardData(session.user.id),
    listUserProjects(session.user.id),
  ]);

  if (dashboard.recentProjectId) {
    redirect(`/dashboard/projects/${dashboard.recentProjectId}/reports`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <FileText className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Reports & Export</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Reports are scoped to a project so exports stay grounded in its intelligence runs.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Create a project and run intelligence before generating exportable reports.
            </p>
            <Button asChild>
              <Link href="/dashboard/projects">Go to projects</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3" role="list">
          {projects.map((project) => (
            <li key={project.id}>
              <Card className="transition-colors hover:border-primary/30">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {project.workspace.organization.name} · {project.workspace.name}
                    </p>
                  </div>
                  <Button asChild variant="secondary">
                    <Link href={`/dashboard/projects/${project.id}/reports`}>Open reports</Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
