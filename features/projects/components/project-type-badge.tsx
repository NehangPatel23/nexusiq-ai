import type { ProjectType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { getProjectTypeLabel } from "../lib/project-types";

const TYPE_VARIANTS: Record<ProjectType, string> = {
  MA: "border-violet-500/30 bg-violet-500/10 text-violet-900 dark:text-violet-300",
  VENDOR_DD: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  AUDIT: "badge-tint-amber",
  INVESTMENT: "border-emerald-500/30 bg-emerald-500/10 text-tint-emerald",
  INTERNAL: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

interface ProjectTypeBadgeProps {
  type: ProjectType;
  className?: string;
}

export function ProjectTypeBadge({ type, className }: ProjectTypeBadgeProps) {
  return (
    <Badge variant="outline" className={cn("font-medium", TYPE_VARIANTS[type], className)}>
      {getProjectTypeLabel(type)}
    </Badge>
  );
}
