"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConfidenceLevel } from "@prisma/client";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataRoomCitationHref } from "@/features/chat/lib/citation-links";
import type { ChatCitation } from "@/lib/ai/citations";

function confidenceVariant(confidence: ConfidenceLevel) {
  if (confidence === "HIGH") return "secondary" as const;
  if (confidence === "MEDIUM") return "outline" as const;
  if (confidence === "LOW") return "destructive" as const;
  return "outline" as const;
}

type ConsensusRecommendationProps = {
  projectId: string;
  finalRecommendation: string;
  decisionConfidence: ConfidenceLevel;
  resolutionRationale: string;
  citations: ChatCitation[];
};

export function ConsensusRecommendation({
  projectId,
  finalRecommendation,
  decisionConfidence,
  resolutionRationale,
  citations,
}: ConsensusRecommendationProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Final recommendation</CardTitle>
          <p className="mt-2 text-sm text-foreground/90">{finalRecommendation}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={confidenceVariant(decisionConfidence)}>{decisionConfidence}</Badge>
          <Link
            href={`/dashboard/projects/${projectId}/reports?generate=EXECUTIVE`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Export as report →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {citations.length > 0 ? (
          <div className="flex flex-wrap gap-2" aria-label="Recommendation citations">
            {citations.map((citation, index) => (
              <Link
                key={`${citation.documentId}-${citation.chunkId}-${index}`}
                href={dataRoomCitationHref(projectId, citation, index)}
                className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium hover:bg-muted/40"
              >
                {citation.documentName}
              </Link>
            ))}
          </div>
        ) : null}

        <div>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
            Why this recommendation
          </button>
          {expanded ? (
            <p className="mt-3 rounded-lg border border-border/60 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
              {resolutionRationale}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
