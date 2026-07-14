"use client";

import type { FindingSeverity } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { dataRoomCitationHref } from "@/features/chat/lib/citation-links";
import { SeveritySelect } from "@/features/intelligence/components/severity-status-selects";
import { dispatchRiskStateChanged } from "@/features/intelligence/lib/risk-state-events";
import type { ChatCitation } from "@/lib/ai/citations";
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
  onSeverityChange?: (findingId: string, severity: FindingSeverity) => void;
};

export function FindingsTable({
  projectId,
  findings,
  citations,
  onSeverityChange,
}: FindingsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [severities, setSeverities] = useState<Record<string, FindingSeverity | null>>(() => {
    const initial: Record<string, FindingSeverity | null> = {};
    for (const finding of findings) initial[finding.id] = finding.severity;
    return initial;
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (savingId) return;
    setSeverities(() => {
      const next: Record<string, FindingSeverity | null> = {};
      for (const finding of findings) next[finding.id] = finding.severity;
      return next;
    });
  }, [findings, savingId]);

  async function updateSeverity(findingId: string, severity: FindingSeverity) {
    setSavingId(findingId);
    const previous = severities[findingId] ?? null;
    setSeverities((prev) => ({ ...prev, [findingId]: severity }));
    onSeverityChange?.(findingId, severity);
    try {
      const res = await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity }),
      });
      const json = (await res.json()) as { success: boolean; error?: { message: string } };
      if (!res.ok || !json.success) {
        setSeverities((prev) => ({ ...prev, [findingId]: previous }));
        if (previous) onSeverityChange?.(findingId, previous);
        toast.error(json.error?.message ?? "Failed to update severity");
        return;
      }
      dispatchRiskStateChanged({
        projectId,
        entity: "finding",
        id: findingId,
        severity,
      });
      toast.success(`Severity set to ${severity.toLowerCase()}`);
    } catch {
      setSeverities((prev) => ({ ...prev, [findingId]: previous }));
      if (previous) onSeverityChange?.(findingId, previous);
      toast.error("Failed to update severity");
    } finally {
      setSavingId(null);
    }
  }

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
            const severity = severities[finding.id] ?? finding.severity;
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
                  <SeveritySelect
                    value={severity}
                    disabled={savingId === finding.id}
                    ariaLabel={`Severity for ${finding.title}`}
                    onChange={(next) => void updateSeverity(finding.id, next)}
                  />
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
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                    />
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
