"use client";

import { ArrowRight, Building2, FolderKanban, FolderPlus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { DashboardData } from "@/features/projects/lib/dashboard";
import { Button } from "@/components/ui/button";

interface DashboardOnboardingNudgeProps {
  onboarding: DashboardData["onboarding"];
}

export function DashboardOnboardingNudge({ onboarding }: DashboardOnboardingNudgeProps) {
  const [dismissed, setDismissed] = useState(false);

  const showNudge =
    !dismissed &&
    (onboarding.needsOrganization || onboarding.needsWorkspace || onboarding.needsProject);

  if (!showNudge) {
    return null;
  }

  let title = "Get started with NexusIQ";
  let description = "Complete these steps to begin AI-powered due diligence.";
  let href = "/dashboard/organizations";
  let cta = "Create organization";
  let Icon = Building2;

  if (onboarding.needsWorkspace && onboarding.primaryOrgId) {
    title = "Create your first workspace";
    description = "Workspaces organize projects, data rooms, and intelligence runs.";
    href = `/dashboard/organizations/${onboarding.primaryOrgId}/workspaces`;
    cta = `Add workspace${onboarding.primaryOrgName ? ` in ${onboarding.primaryOrgName}` : ""}`;
    Icon = FolderKanban;
  } else if (onboarding.needsProject) {
    title = "Create your first project";
    description = "Projects scope documents, agents, reports, and deal metadata.";
    href = "/dashboard/projects";
    cta = "Create project";
    Icon = FolderPlus;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card/80 to-card/40 p-5 md:p-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8"
        aria-label="Dismiss setup guide"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pr-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <ol className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <li className={onboarding.organizationCount > 0 ? "text-primary" : ""}>
                1. Organization {onboarding.organizationCount > 0 ? "✓" : ""}
              </li>
              <li className={onboarding.workspaceCount > 0 ? "text-primary" : ""}>
                2. Workspace {onboarding.workspaceCount > 0 ? "✓" : ""}
              </li>
              <li className={onboarding.projectCount > 0 ? "text-primary" : ""}>
                3. Project {onboarding.projectCount > 0 ? "✓" : ""}
              </li>
            </ol>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={href}>
            {cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
