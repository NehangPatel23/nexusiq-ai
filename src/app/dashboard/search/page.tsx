import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen, Search } from "lucide-react";

import { listUserProjects } from "@/features/projects/lib/projects";
import { getDashboardData } from "@/features/projects/lib/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Search" };

export default async function GlobalSearchPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [dashboard, projects] = await Promise.all([
    getDashboardData(session.user.id),
    listUserProjects(session.user.id),
  ]);

  if (dashboard.recentProjectId) {
    redirect(`/dashboard/projects/${dashboard.recentProjectId}/search`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Search className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Smart Search</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Document search is scoped to a project. Select a project below to search its data room.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Create a project and upload documents before searching.
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
                    <Link href={`/dashboard/projects/${project.id}/search`}>Search project</Link>
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
