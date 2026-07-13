"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";

import { useBackgroundAnalysis } from "@/features/intelligence/hooks/use-background-analysis";
import { BACKGROUND_FULL_ANALYSIS_STEPS } from "@/features/intelligence/lib/background-analysis-runner";
import { INTELLIGENCE_AGENT_TYPES } from "@/lib/ai/agents/types";
import { cn } from "@/lib/utils";

interface BackgroundAnalysisBannerProps {
  projectId: string;
}

export function BackgroundAnalysisBanner({ projectId }: BackgroundAnalysisBannerProps) {
  const analysis = useBackgroundAnalysis(projectId);
  if (analysis.status !== "running") return null;

  const total =
    analysis.totalSteps ||
    (analysis.mode === "specialists" ? INTELLIGENCE_AGENT_TYPES.length : BACKGROUND_FULL_ANALYSIS_STEPS);
  const step = Math.min(analysis.progress + (analysis.scanningAgents.length || analysis.consensusRunning ? 1 : 0), total);
  const label = analysis.mode === "full" ? "Full analysis" : "Specialist scan";
  const href = `/dashboard/projects/${projectId}/intelligence`;

  return (
    <div
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
          <span className="font-medium text-foreground">{label}</span>
          {" running in the background"}
          {analysis.currentStepLabel ? ` · ${analysis.currentStepLabel}` : ""}
          {` (${step}/${total})`}
        </span>
      </div>
      <Link href={href} className="shrink-0 text-sm font-medium text-primary hover:underline">
        View Intelligence
      </Link>
    </div>
  );
}
