"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type EntityItem = { id: string; name: string; type: string };
type RelationItem = {
  id: string;
  relationType: string;
  confidence: number;
  source: EntityItem;
  target: EntityItem;
};

interface DocumentEntitiesPanelProps {
  documentId: string | null;
  className?: string;
}

export function DocumentEntitiesPanel({ documentId, className }: DocumentEntitiesPanelProps) {
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [relations, setRelations] = useState<RelationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setEntities([]);
      setRelations([]);
      return;
    }

    setLoading(true);
    setError(null);
    void fetch(`/api/documents/${documentId}/entities`)
      .then(async (res) => {
        const json = (await res.json()) as {
          success: boolean;
          data?: { entities: EntityItem[]; relations: RelationItem[] };
          error?: { message: string };
        };
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message ?? "Failed to load entities");
        }
        setEntities(json.data?.entities ?? []);
        setRelations(json.data?.relations ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load entities");
      })
      .finally(() => setLoading(false));
  }, [documentId]);

  if (!documentId) return null;

  return (
    <section className={cn("space-y-2", className)} aria-label="Extracted entities">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Extracted entities
      </h3>
      {loading && <p className="text-xs text-muted-foreground">Loading entities…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!loading && !error && entities.length === 0 && (
        <p className="text-xs text-muted-foreground">No entities extracted yet.</p>
      )}
      {!loading && entities.length > 0 && (
        <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
          {entities.map((entity) => (
            <li key={entity.id} className="flex items-center justify-between gap-2 rounded-md bg-secondary/30 px-2 py-1.5">
              <span className="truncate font-medium">{entity.name}</span>
              <span className="shrink-0 text-muted-foreground">{entity.type}</span>
            </li>
          ))}
        </ul>
      )}
      {relations.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Relationships
          </p>
          <ul className="max-h-28 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {relations.slice(0, 5).map((relation) => (
              <li key={relation.id}>
                {relation.source.name} → {relation.target.name} ({relation.relationType})
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
