"use client";

import type { FindingSeverity } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ChatCitation } from "@/lib/ai/citations";
import { dataRoomCitationHref } from "@/features/chat/lib/citation-links";
import { cn } from "@/lib/utils";

import { EvidencePanel } from "./evidence-panel";

export type FindingRow = {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: FindingSeverity | null;
  sourceChunkId?: string | null;
  documentId?: string | null;
};

type FindingsTableProps = {
  projectId: string;
  findings: FindingRow[];
  citations: ChatCitation[];
};

const SEVERITY_VARIANT: Record<FindingSeverity, "destructive" | "default" | "secondary" | "outline"> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "default",
  LOW: "secondary",
};

export function FindingsTable({ projectId, findings, citations }: FindingsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (findings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
        No findings for this scan. Upload more documents or re-run when new evidence is available.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium" scope="col">
              Finding
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Category
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Severity
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              Source
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              <span className="sr-only">Expand</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {findings.map((finding) => {
            const citation = citations.find((item) => item.chunkId === finding.sourceChunkId);
            const expanded = expandedId === finding.id;
            return (
              <tr key={finding.id} className="border-t border-border/50 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{finding.title}</p>
                  <p className="mt-1 text-muted-foreground">{finding.description}</p>
                  {expanded ? (
                    <div className="mt-3">
                      <EvidencePanel
                        projectId={projectId}
                        description={finding.description}
                        citations={citations}
                        sourceChunkId={finding.sourceChunkId}
                        documentId={finding.documentId}
                      />
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{finding.category}</td>
                <td className="px-4 py-3">
                  {finding.severity ? (
                    <Badge variant={SEVERITY_VARIANT[finding.severity]}>{finding.severity}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {citation ? (
                    <Link
                      href={dataRoomCitationHref(projectId, citation, 0)}
                      className="text-primary hover:underline"
                    >
                      {citation.documentName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Collapse evidence" : "Expand evidence"}
                    onClick={() => setExpandedId(expanded ? null : finding.id)}
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
