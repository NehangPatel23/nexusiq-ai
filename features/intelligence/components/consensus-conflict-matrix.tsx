"use client";

import { Badge } from "@/components/ui/badge";

export type ConsensusConflict = {
  topic: string;
  positions: Array<{ agent: string; position: string }>;
  severity: string;
};

export type ConsensusAgreement = {
  topic: string;
  agents: string[];
  summary: string;
};

function severityVariant(severity: string) {
  const upper = severity.toUpperCase();
  if (upper === "CRITICAL" || upper === "HIGH") return "destructive" as const;
  if (upper === "MEDIUM") return "default" as const;
  return "outline" as const;
}

export function ConsensusConflictMatrix({
  agreements,
  conflicts,
}: {
  agreements: ConsensusAgreement[];
  conflicts: ConsensusConflict[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="consensus-agreements-heading">
        <h3 id="consensus-agreements-heading" className="mb-3 text-sm font-medium text-muted-foreground">
          Agreements
        </h3>
        {agreements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No explicit agreements recorded.
          </p>
        ) : (
          <ul className="space-y-2" role="list">
            {agreements.map((item, index) => (
              <li key={`${item.topic}-${index}`} className="rounded-lg border border-border/60 p-3">
                <p className="text-sm font-medium">{item.topic}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                {item.agents.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">{item.agents.join(" · ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="consensus-conflicts-heading">
        <h3 id="consensus-conflicts-heading" className="mb-3 text-sm font-medium text-muted-foreground">
          Conflicts
        </h3>
        {conflicts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No material conflicts recorded.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/30">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                    Topic
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                    Positions
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-muted-foreground">
                    Severity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {conflicts.map((conflict, index) => (
                  <tr key={`${conflict.topic}-${index}`}>
                    <td className="px-3 py-3 align-top font-medium">{conflict.topic}</td>
                    <td className="px-3 py-3 align-top">
                      <ul className="space-y-1">
                        {conflict.positions.map((position, positionIndex) => (
                          <li key={`${position.agent}-${positionIndex}`} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{position.agent}:</span>{" "}
                            {position.position}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Badge variant={severityVariant(conflict.severity)}>{conflict.severity}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
