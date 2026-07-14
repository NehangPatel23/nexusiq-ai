"use client";

import Link from "next/link";
import { Camera, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type { ReportSnapshotAsOf } from "../lib/snapshot";

type ReportSnapshotChipsProps = {
  projectId: string;
  snapshot: ReportSnapshotAsOf | null | undefined;
  consensusRunId?: string | null;
};

export function ReportSnapshotChips({
  projectId,
  snapshot,
  consensusRunId,
}: ReportSnapshotChipsProps) {
  if (!snapshot && !consensusRunId) return null;

  const agentRuns = snapshot?.agentRuns ?? [];
  const consensus = snapshot?.consensus;

  return (
    <div
      className="report-print-hide mt-3 rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5"
      aria-label="Intelligence snapshot as of generation"
    >
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Camera className="h-3 w-3" aria-hidden="true" />
        Snapshot as of
        {snapshot?.capturedAt
          ? ` ${new Date(snapshot.capturedAt).toLocaleString()}`
          : " generation"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {agentRuns.length === 0 ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            No agent runs pinned
          </Badge>
        ) : (
          agentRuns.map((run) => (
            <Badge
              key={run.id}
              variant="secondary"
              className="bg-background/60 text-[10px] font-normal"
              title={run.completedAt ? `Completed ${new Date(run.completedAt).toLocaleString()}` : run.id}
            >
              {run.agentType}
              {run.score != null ? ` · ${Math.round(run.score)}` : ""}
            </Badge>
          ))
        )}
        {consensus || consensusRunId ? (
          <Link
            href={`/dashboard/projects/${projectId}/intelligence?tab=consensus`}
            className="inline-flex"
          >
            <Badge variant="outline" className="gap-1 border-primary/30 text-[10px] font-normal text-primary">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Consensus
              {consensus?.decisionConfidence ? ` · ${consensus.decisionConfidence}` : ""}
            </Badge>
          </Link>
        ) : null}
        {typeof snapshot?.openFindingCount === "number" ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {snapshot.openFindingCount} open finding{snapshot.openFindingCount === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </div>
      {consensus?.finalRecommendation ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
          Rec: {consensus.finalRecommendation}
        </p>
      ) : null}
    </div>
  );
}
