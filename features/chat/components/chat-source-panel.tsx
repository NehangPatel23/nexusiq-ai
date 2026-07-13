"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { SourceChunk } from "@/features/chat/lib/types";
import { dataRoomCitationHref } from "@/features/chat/lib/citation-links";
import type { ChatCitation } from "@/lib/ai/citations";

type ChatSourcePanelProps = {
  projectId: string;
  sources: SourceChunk[];
  className?: string;
};

export function ChatSourcePanel({ projectId, sources, className }: ChatSourcePanelProps) {
  return (
    <div className={className}>
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-semibold">Source context</h2>
        <Badge variant="secondary">{sources.length}</Badge>
      </div>
      {sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
          Sources used for the latest answer will appear here.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ol className="space-y-3">
            {sources.map((source, index) => {
              const citation: ChatCitation = {
                documentId: source.documentId,
                chunkId: source.chunkId,
                documentName: source.documentName,
                excerpt: source.content,
              };
              return (
                <li
                  key={source.chunkId}
                  id={`source-${index + 1}`}
                  className="scroll-mt-4 rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={dataRoomCitationHref(projectId, citation, index + 1)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {source.documentName}
                    </Link>
                    <span className="font-mono text-[10px] text-muted-foreground">#{index + 1}</span>
                  </div>
                  {(source.sectionTitle || source.pageNumber) && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {source.sectionTitle}
                      {source.sectionTitle && source.pageNumber ? " · " : ""}
                      {source.pageNumber ? `Page ${source.pageNumber}` : ""}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-6 text-xs leading-5 text-muted-foreground">
                    {source.content}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
