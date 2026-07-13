"use client";

import Link from "next/link";

import type { ChatCitation } from "@/lib/ai/citations";
import { dataRoomCitationHref } from "@/features/chat/lib/citation-links";

type EvidencePanelProps = {
  projectId: string;
  description: string;
  citations: ChatCitation[];
  sourceChunkId?: string | null;
  documentId?: string | null;
};

export function EvidencePanel({
  projectId,
  description,
  citations,
  sourceChunkId,
  documentId,
}: EvidencePanelProps) {
  const matched =
    citations.find((citation) => citation.chunkId === sourceChunkId) ??
    citations.find((citation) => citation.documentId === documentId) ??
    citations[0];

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <p className="text-sm text-foreground">{description}</p>
      {matched ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence</p>
          <blockquote className="rounded-md border border-border/50 bg-background/60 p-3 text-sm text-muted-foreground">
            {matched.excerpt}
          </blockquote>
          <div className="flex flex-wrap gap-2">
            <Link
              href={dataRoomCitationHref(projectId, matched, 0)}
              className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-muted/40"
            >
              {matched.documentName}
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No linked citation excerpt available.</p>
      )}
    </div>
  );
}
