import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface WorkspacesBreadcrumbsProps {
  orgId: string;
  orgName: string;
}

export function WorkspacesBreadcrumbs({ orgId, orgName }: WorkspacesBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link
        href={`/dashboard/organizations/${orgId}/settings`}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {orgName}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
      <span className="font-medium text-foreground" aria-current="page">
        Workspaces
      </span>
    </nav>
  );
}
