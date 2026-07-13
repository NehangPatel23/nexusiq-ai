"use client";

import type { AgentType } from "@prisma/client";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { AgentRunSummary } from "@/features/intelligence/lib/agent-runs";

type AgentRunHistoryProps = {
  projectId: string;
  runs: AgentRunSummary[];
  activeAgent: AgentType;
};

function formatAgentLabel(agent: AgentType) {
  return agent.charAt(0) + agent.slice(1).toLowerCase();
}

export function AgentRunHistory({ projectId, runs, activeAgent }: AgentRunHistoryProps) {
  const filtered = runs.filter((run) => run.agentType === activeAgent);

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">No prior runs for this agent.</p>;
  }

  return (
    <ul className="space-y-2" role="list">
      {filtered.map((run) => (
        <li
          key={run.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium">
              {formatAgentLabel(run.agentType)} scan
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(run.startedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={run.status === "COMPLETED" ? "secondary" : run.status === "FAILED" ? "destructive" : "outline"}>
              {run.status.toLowerCase()}
            </Badge>
            {run.score !== null ? (
              <span className="text-sm font-medium tabular-nums">{Math.round(run.score)}</span>
            ) : null}
            <Link href={`/dashboard/projects/${projectId}/intelligence?run=${run.id}`} className="text-sm text-primary hover:underline">
              View
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
