"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PROJECT_TABS } from "@/features/projects/components/project-shell-nav";

interface ProjectBreadcrumbsProps {
  projectId: string;
  projectName: string;
}

function getCurrentTabLabel(pathname: string, projectId: string): string | null {
  const basePath = `/dashboard/projects/${projectId}`;
  if (pathname === basePath || pathname === `${basePath}/`) {
    return "Overview";
  }

  const tab = PROJECT_TABS.find(
    (entry) => entry.segment && pathname.startsWith(`${basePath}/${entry.segment}`),
  );

  return tab?.label ?? null;
}

export function ProjectBreadcrumbs({ projectId, projectName }: ProjectBreadcrumbsProps) {
  const pathname = usePathname();
  const tabLabel = getCurrentTabLabel(pathname, projectId);

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
      <Link
        href="/dashboard/projects"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        Projects
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="max-w-[12rem] truncate text-muted-foreground transition-colors hover:text-foreground sm:max-w-xs"
      >
        {projectName}
      </Link>
      {tabLabel && tabLabel !== "Overview" && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
          <span className="font-medium text-foreground" aria-current="page">
            {tabLabel}
          </span>
        </>
      )}
    </nav>
  );
}
