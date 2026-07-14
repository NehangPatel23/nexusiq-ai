"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";

import { useBackgroundSimulation } from "@/features/simulator/hooks/use-background-simulation";
import { useBackgroundTasks } from "@/features/actions/hooks/use-background-tasks";
import { kindLabel } from "@/features/actions/lib/background-tasks-runner";
import { cn } from "@/lib/utils";

interface BackgroundSlice14BannerProps {
  projectId: string;
}

export function BackgroundSlice14Banner({ projectId }: BackgroundSlice14BannerProps) {
  const simulation = useBackgroundSimulation(projectId);
  const tasks = useBackgroundTasks(projectId);

  const banners: Array<{ key: string; label: string; href: string; linkLabel: string }> = [];

  if (simulation.status === "running") {
    banners.push({
      key: "simulation",
      label: simulation.scenarioName
        ? `Risk simulation · ${simulation.scenarioName.replace(/_/g, " ")}`
        : "Risk simulation",
      href: `/dashboard/projects/${projectId}/simulator`,
      linkLabel: "View Simulator",
    });
  }

  if (tasks.status === "running" && tasks.kind) {
    banners.push({
      key: "tasks",
      label: kindLabel(tasks.kind),
      href: `/dashboard/projects/${projectId}/actions`,
      linkLabel: "View Action Plan",
    });
  }

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2">
      {banners.map((banner) => (
        <div
          key={banner.key}
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30",
            "bg-primary/5 px-4 py-2.5 text-sm",
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground">{banner.label}</span>
              {" running in the background"}
            </span>
          </div>
          <Link
            href={banner.href}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            {banner.linkLabel}
          </Link>
        </div>
      ))}
    </div>
  );
}
