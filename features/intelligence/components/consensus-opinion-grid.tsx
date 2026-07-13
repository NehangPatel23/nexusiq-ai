"use client";

import type { ConfidenceLevel } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AGENT_TYPE_LABELS, type SpecialistAgentType } from "@/lib/ai/agents/types";

export type ConsensusOpinion = {
  agent: SpecialistAgentType | string;
  score?: number | null;
  recommendation: string;
  confidence: ConfidenceLevel | string;
};

function confidenceVariant(confidence: string) {
  if (confidence === "HIGH") return "secondary" as const;
  if (confidence === "MEDIUM") return "outline" as const;
  if (confidence === "LOW") return "destructive" as const;
  return "outline" as const;
}

export function ConsensusOpinionGrid({ opinions }: { opinions: ConsensusOpinion[] }) {
  if (opinions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        No agent opinions yet. Run consensus after specialist scans complete.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Agent opinions">
      {opinions.map((opinion) => {
        const label =
          AGENT_TYPE_LABELS[opinion.agent as SpecialistAgentType] ??
          String(opinion.agent);
        return (
          <Card key={opinion.agent} role="listitem" className="border-border/60 bg-muted/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{label}</CardTitle>
                <Badge variant={confidenceVariant(String(opinion.confidence))}>
                  {opinion.confidence}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-display text-2xl font-semibold tabular-nums">
                {opinion.score === null || opinion.score === undefined
                  ? "—"
                  : Math.round(opinion.score)}
              </p>
              <p className="text-sm text-muted-foreground">{opinion.recommendation}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
