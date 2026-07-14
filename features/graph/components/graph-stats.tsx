"use client";

import { FileStack, GitBranch, Network, Shapes } from "lucide-react";

import type { GraphData } from "@/features/graph/lib/graph-data";
import { cn } from "@/lib/utils";

type GraphStatsProps = {
  graph: GraphData;
  className?: string;
};

export function deriveGraphMetrics(graph: GraphData) {
  const types = new Set(graph.nodes.map((n) => n.type));
  const docs = new Set<string>();
  for (const node of graph.nodes) {
    for (const id of node.documentIds) docs.add(id);
  }
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    typeCount: types.size,
    docCount: docs.size,
  };
}

export function GraphStats({ graph, className }: GraphStatsProps) {
  if (graph.nodes.length === 0) return null;
  const metrics = deriveGraphMetrics(graph);

  const cards = [
    {
      label: "Entities",
      value: metrics.nodeCount,
      hint: "Nodes in the project graph",
      icon: Network,
    },
    {
      label: "Relations",
      value: metrics.edgeCount,
      hint: "Directed edges with confidence",
      icon: GitBranch,
    },
    {
      label: "Types",
      value: metrics.typeCount,
      hint: "Person, org, location, …",
      icon: Shapes,
    },
    {
      label: "Documents",
      value: metrics.docCount,
      hint: "Linked via relation citations",
      icon: FileStack,
    },
  ];

  return (
    <section className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)} aria-label="Graph summary">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {card.label}
            </div>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums tracking-tight">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        );
      })}
    </section>
  );
}
