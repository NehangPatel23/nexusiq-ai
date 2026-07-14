"use client";

import {
  ArrowLeftRight,
  CalendarClock,
  Download,
  FileText,
  Link2,
  Loader2,
  Maximize2,
  Network,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraphStats } from "@/features/graph/components/graph-stats";
import type { EntityDetail, GraphData, GraphNode } from "@/features/graph/lib/graph-data";
import { entityTypeSchema } from "@/features/graph/schemas";
import { AgentThinking } from "@/features/intelligence/components/agent-thinking";
import { useBackgroundExtract } from "@/features/projects/hooks/use-background-extract";
import { startBackgroundExtract } from "@/features/projects/lib/background-extract-runner";
import { cn } from "@/lib/utils";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type GraphPageProps = {
  projectId: string;
  projectName: string;
  initialGraph: GraphData;
  hasProcessedDocs: boolean;
};

const ENTITY_TYPES = entityTypeSchema.options;

const RELATION_TYPE_SUGGESTIONS = [
  "related_to",
  "employs",
  "employed_by",
  "invested_in",
  "owns",
  "subsidiary_of",
  "partner_of",
  "acquired",
  "board_member",
  "reports_to",
] as const;

const TYPE_COLORS: Record<string, string> = {
  person: "#38bdf8",
  organization: "#a78bfa",
  location: "#34d399",
  date: "#fbbf24",
  amount: "#fb7185",
  other: "#94a3b8",
};

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "border-rose-500/40 text-rose-300",
  HIGH: "border-orange-500/40 text-orange-300",
  MEDIUM: "border-amber-500/40 text-amber-300",
  LOW: "border-emerald-500/40 text-emerald-300",
};

type FgNode = GraphNode & { x?: number; y?: number };
type FgLink = {
  id: string;
  source: string | FgNode;
  target: string | FgNode;
  relationType: string;
  confidence: number;
};

function colorForType(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS.other;
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json()) as ApiEnvelope<T>;
}

export function GraphPage({
  projectId,
  projectName,
  initialGraph,
  hasProcessedDocs,
}: GraphPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const extract = useBackgroundExtract(projectId, "graph");
  const extracting = extract.status === "running";
  const ollamaDown = extract.ollamaUnavailable;
  const prevExtractStatus = useRef(extract.status);
  const graphRef = useRef<{
    zoom: (scale?: number, duration?: number) => number | unknown;
    zoomToFit: (duration?: number, padding?: number) => void;
    d3Force: (
      forceName: string,
      force?: unknown,
    ) =>
      | {
          strength?: ((value: number) => unknown) | ((node: unknown) => number);
          distance?: (value: number) => unknown;
        }
      | undefined;
    d3ReheatSimulation: () => void;
  } | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  const [graph, setGraph] = useState(initialGraph);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState<string | "ALL">("ALL");
  const [density, setDensity] = useState(0.55);
  const [hoverLinkLabel, setHoverLinkLabel] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [forceConfirmOpen, setForceConfirmOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState<(typeof ENTITY_TYPES)[number]>("organization");
  const [adding, setAdding] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<(typeof ENTITY_TYPES)[number]>("other");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [relationOpen, setRelationOpen] = useState(false);
  const [relationSourceId, setRelationSourceId] = useState<string | null>(null);
  const [relationTargetId, setRelationTargetId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<string>("related_to");
  const [relationConfidence, setRelationConfidence] = useState(0.8);
  const [savingRelation, setSavingRelation] = useState(false);
  const [editRelation, setEditRelation] = useState<{
    id: string;
    relationType: string;
    confidence: number;
    label: string;
  } | null>(null);
  const [savingEditRelation, setSavingEditRelation] = useState(false);
  const [relationToDelete, setRelationToDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deletingRelation, setDeletingRelation] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(800);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = canvasHostRef.current;
    if (!el) return;
    const update = () => setCanvasWidth(Math.max(320, el.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [graph.nodes.length]);

  const types = useMemo(() => {
    const set = new Set(graph.nodes.map((n) => n.type));
    return [...set].sort();
  }, [graph.nodes]);

  const filteredGraph = useMemo(() => {
    const q = query.trim().toLowerCase();
    const nodes = graph.nodes.filter((node) => {
      if (typeFilter !== "ALL" && node.type !== typeFilter) return false;
      if (!q) return true;
      return node.name.toLowerCase().includes(q);
    });
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = graph.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
    );
    return { nodes, edges };
  }, [graph, query, typeFilter]);

  const legendTypes = useMemo(() => {
    const set = new Set(filteredGraph.nodes.map((n) => n.type));
    return [...set].sort();
  }, [filteredGraph.nodes]);

  const fgData = useMemo(
    () => ({
      nodes: filteredGraph.nodes as FgNode[],
      links: filteredGraph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relationType: edge.relationType,
        confidence: edge.confidence,
      })) as FgLink[],
    }),
    [filteredGraph],
  );

  async function refreshGraph() {
    const response = await fetch(`/api/projects/${projectId}/graph`);
    const payload = await readJson<GraphData>(response);
    if (payload.success) setGraph(payload.data);
  }

  async function loadDetail(entityId: string) {
    setSelectedId(entityId);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/graph/nodes/${entityId}`);
      const payload = await readJson<{ entity: EntityDetail }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        setDetail(null);
        return;
      }
      setDetail(payload.data.entity);
    } catch {
      toast.error("Could not load entity details");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function clearSelection() {
    setSelectedId(null);
    setDetail(null);
  }

  function startConnectFrom(sourceId: string) {
    setLinkSourceId(sourceId);
    toast.message("Click another node to create a relation (Esc to cancel)");
  }

  function cancelConnect() {
    setLinkSourceId(null);
  }

  function openRelationDialog(sourceId: string, targetId: string) {
    setRelationSourceId(sourceId);
    setRelationTargetId(targetId);
    setRelationType("related_to");
    setRelationConfidence(0.8);
    setRelationOpen(true);
    setLinkSourceId(null);
  }

  async function saveRelation() {
    if (!relationSourceId || !relationTargetId) return;
    const type = relationType.trim();
    if (!type) {
      toast.error("Relation type is required");
      return;
    }
    setSavingRelation(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/graph/relations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceEntityId: relationSourceId,
          targetEntityId: relationTargetId,
          relationType: type,
          confidence: relationConfidence,
        }),
      });
      const payload = await readJson<{ relation: { id: string } }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success("Relation created");
      setRelationOpen(false);
      await refreshGraph();
      if (selectedId === relationSourceId || selectedId === relationTargetId) {
        void loadDetail(selectedId);
      } else {
        void loadDetail(relationSourceId);
      }
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not create relation");
    } finally {
      setSavingRelation(false);
    }
  }

  async function removeRelation() {
    if (!relationToDelete) return;
    setDeletingRelation(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/graph/relations/${relationToDelete.id}`,
        { method: "DELETE" },
      );
      const payload = await readJson<{ ok: boolean }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success("Relation removed");
      setRelationToDelete(null);
      await refreshGraph();
      if (selectedId) void loadDetail(selectedId);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not remove relation");
    } finally {
      setDeletingRelation(false);
    }
  }

  async function saveEditedNode() {
    if (!selectedId) return;
    const name = editName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setSavingEdit(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/graph/nodes/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: editType }),
      });
      const payload = await readJson<{ node: GraphNode }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success("Node updated");
      setEditOpen(false);
      await refreshGraph();
      void loadDetail(selectedId);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not update node");
    } finally {
      setSavingEdit(false);
    }
  }

  async function saveEditedRelation() {
    if (!editRelation) return;
    const type = editRelation.relationType.trim();
    if (!type) {
      toast.error("Relation type is required");
      return;
    }
    setSavingEditRelation(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/graph/relations/${editRelation.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            relationType: type,
            confidence: editRelation.confidence,
          }),
        },
      );
      const payload = await readJson<{ relation: { id: string } }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success("Relation updated");
      setEditRelation(null);
      await refreshGraph();
      if (selectedId) void loadDetail(selectedId);
    } catch {
      toast.error("Could not update relation");
    } finally {
      setSavingEditRelation(false);
    }
  }

  async function reverseRelation(relationId: string) {
    try {
      const response = await fetch(`/api/projects/${projectId}/graph/relations/${relationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reverse: true }),
      });
      const payload = await readJson<{ relation: { id: string } }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success("Relation reversed");
      await refreshGraph();
      if (selectedId) void loadDetail(selectedId);
    } catch {
      toast.error("Could not reverse relation");
    }
  }

  function exportGraphJson() {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}-graph.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function createNode() {
    const name = addName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/graph/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: addType }),
      });
      const payload = await readJson<{ node: GraphNode }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success(`Added “${payload.data.node.name}”`);
      setAddOpen(false);
      setAddName("");
      setAddType("organization");
      await refreshGraph();
      void loadDetail(payload.data.node.id);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not add node");
    } finally {
      setAdding(false);
    }
  }

  async function removeSelectedNode() {
    if (!selectedId || !detail) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/graph/nodes/${selectedId}`, {
        method: "DELETE",
      });
      const payload = await readJson<{ ok: boolean }>(response);
      if (!payload.success) {
        toast.error(payload.error.message);
        return;
      }
      toast.success(`Removed “${detail.name}”`);
      setDeleteConfirmOpen(false);
      clearSelection();
      await refreshGraph();
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not remove node");
    } finally {
      setDeleting(false);
    }
  }

  function runExtract(opts: { force?: boolean; all?: boolean } = {}) {
    startBackgroundExtract({
      projectId,
      kind: "graph",
      force: opts.force,
      all: opts.all,
    });
    setForceConfirmOpen(false);
  }

  useEffect(() => {
    if (prevExtractStatus.current === "running" && extract.status === "idle") {
      void refreshGraph();
      startTransition(() => router.refresh());
    }
    prevExtractStatus.current = extract.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh only on status transitions
  }, [extract.status]);

  useEffect(() => {
    if (searchParams.get("extract") === "1") {
      runExtract({});
      const url = new URL(window.location.href);
      url.searchParams.delete("extract");
      router.replace(url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    if (!linkSourceId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLinkSourceId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [linkSourceId]);

  useEffect(() => {
    if (reducedMotion) return;

    let cancelled = false;
    let attempts = 0;

    function applyDensity() {
      if (cancelled) return;
      const api = graphRef.current;
      if (!api?.d3Force || !api.d3ReheatSimulation) {
        if (attempts < 30) {
          attempts += 1;
          requestAnimationFrame(applyDensity);
        }
        return;
      }

      // Density 0 = spread out, 1 = compact. Must reheat after cooldownTicks finish
      // or force changes are invisible.
      const chargeStrength = -40 - (1 - density) * 860; // ~-900 sparse → ~-40 compact
      const linkDistance = 28 + (1 - density) * 140; // ~168 sparse → ~28 compact
      const linkStrength = 0.2 + density * 0.7;

      const charge = api.d3Force("charge") as
        | { strength?: (value: number) => unknown }
        | undefined;
      charge?.strength?.(chargeStrength);

      const link = api.d3Force("link") as
        | {
            distance?: (value: number) => unknown;
            strength?: (value: number) => unknown;
          }
        | undefined;
      link?.distance?.(linkDistance);
      link?.strength?.(linkStrength);

      api.d3ReheatSimulation();
    }

    applyDensity();
    return () => {
      cancelled = true;
    };
  }, [density, fgData.nodes.length, fgData.links.length, reducedMotion]);

  function adjustZoom(factor: number) {
    const api = graphRef.current;
    if (!api) return;
    const currentRaw = api.zoom();
    const current = typeof currentRaw === "number" ? currentRaw : 1;
    const next = Math.min(12, Math.max(0.08, current * factor));
    api.zoom(next, reducedMotion ? 0 : 220);
  }

  function fitToView() {
    graphRef.current?.zoomToFit(reducedMotion ? 0 : 400, 48);
  }

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as FgNode;
      const label = n.name;
      const fontSize = 12 / globalScale;
      const selected = n.id === selectedId;
      const linking = n.id === linkSourceId;
      const radius = selected || linking ? 7 : 5;
      ctx.beginPath();
      ctx.arc(n.x ?? 0, n.y ?? 0, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = colorForType(n.type);
      ctx.fill();
      if (selected || linking) {
        ctx.strokeStyle = linking ? "#fbbf24" : "#fff";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(226,232,240,0.9)";
      ctx.fillText(label.slice(0, 28), n.x ?? 0, (n.y ?? 0) + radius + 2);
    },
    [selectedId, linkSourceId],
  );

  const canvasHeight = 600;

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-[hsl(var(--glass))] p-5 shadow-sm backdrop-blur-md sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(262_83%_58%/0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(217_91%_60%/0.1),transparent_50%)]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-violet-200">
              <Network className="h-3 w-3" aria-hidden="true" />
              Relationship map
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              Relationship graph
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              People, organizations, and links across{" "}
              <span className="text-foreground/90">{projectName}</span>. Seeded from document NER —
              enrich with AI extract when you need deeper coverage.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add node
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportGraphJson}
              disabled={graph.nodes.length === 0}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Export JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForceConfirmOpen(true)}
              disabled={extracting || graph.nodes.length === 0}
            >
              Replace & extract
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => runExtract({ all: true })}
              disabled={extracting}
            >
              Extract all
            </Button>
            <Button type="button" onClick={() => void runExtract({})} disabled={extracting}>
              {extracting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Extract entities
            </Button>
          </div>
        </div>
      </header>

      <GraphStats graph={graph} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Filter nodes by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter graph nodes"
          />
        </div>
        <div className="flex min-w-[200px] flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="graph-density" className="text-xs text-muted-foreground">
              Layout density
            </Label>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {density < 0.33 ? "Spread" : density > 0.66 ? "Compact" : "Balanced"}
            </span>
          </div>
          <input
            id="graph-density"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(density * 100)}
            onChange={(e) => setDensity(Number(e.target.value) / 100)}
            className="w-full accent-primary"
            aria-valuetext={
              density < 0.33 ? "Spread out" : density > 0.66 ? "Compact" : "Balanced"
            }
            aria-label="Graph layout density"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by entity type">
          <Button
            type="button"
            size="sm"
            variant={typeFilter === "ALL" ? "default" : "outline"}
            onClick={() => setTypeFilter("ALL")}
          >
            All types
            <span className="ml-1.5 tabular-nums opacity-70">{graph.nodes.length}</span>
          </Button>
          {types.map((type) => {
            const count = graph.nodes.filter((n) => n.type === type).length;
            return (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={typeFilter === type ? "default" : "outline"}
                onClick={() => setTypeFilter(type)}
              >
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: colorForType(type) }}
                  aria-hidden="true"
                />
                <span className="capitalize">{type}</span>
                <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {extracting && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
          <AgentThinking label="Extracting entities and relationships" />
        </div>
      )}

      {ollamaDown && (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          Ollama is unavailable for extraction. Existing NER entities still render below.
        </div>
      )}

      {graph.nodes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/20 px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-secondary/40">
            <Network className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mt-4 text-base font-medium">No entities yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {hasProcessedDocs
              ? "Document NER may still be empty — extract entities with AI, or reprocess docs to seed the graph."
              : "Process documents in the data room so NER can seed entities, then enrich with extract."}
          </p>
          <ul className="mx-auto mt-4 max-w-sm space-y-1.5 text-left text-xs text-muted-foreground">
            <li>· Interactive force layout of people and organizations</li>
            <li>· Click a node for relations, docs, and findings</li>
            <li>· GET graph works offline — extract needs Ollama</li>
          </ul>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/projects/${projectId}/data-room`}>Open data room</Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => setAddOpen(true)}>
              Add node
            </Button>
            <Button type="button" onClick={() => void runExtract({})} disabled={extracting}>
              Extract entities
            </Button>
          </div>
        </div>
      )}

      {graph.nodes.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div
            ref={canvasHostRef}
            className="relative min-h-[600px] overflow-hidden rounded-2xl border border-border/60 bg-[hsl(222_47%_5%)]"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(217_33%_14%/0.55),transparent_70%)]"
              aria-hidden="true"
            />

            <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-lg border border-border/50 bg-background/85 p-1 shadow-sm backdrop-blur">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Zoom in"
                  onClick={() => adjustZoom(1.75)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Zoom out"
                  onClick={() => adjustZoom(1 / 1.75)}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Fit graph to view"
                  onClick={fitToView}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/85 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground backdrop-blur">
                {filteredGraph.nodes.length} nodes · {filteredGraph.edges.length} edges
              </div>
              {hoverLinkLabel && (
                <div
                  className="max-w-xs truncate rounded-lg border border-primary/30 bg-background/90 px-2.5 py-1.5 text-xs text-foreground backdrop-blur"
                  role="status"
                  aria-live="polite"
                >
                  {hoverLinkLabel}
                </div>
              )}
              {linkSourceId && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-xs text-amber-100 backdrop-blur">
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Connect mode — click a target node
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-amber-100 hover:text-foreground"
                    onClick={cancelConnect}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {legendTypes.length > 0 && (
              <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 rounded-lg border border-border/50 bg-background/85 px-3 py-2 text-xs backdrop-blur">
                {legendTypes.map((type) => (
                  <span key={type} className="inline-flex items-center gap-1.5 capitalize">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: colorForType(type) }}
                      aria-hidden="true"
                    />
                    {type}
                  </span>
                ))}
              </div>
            )}

            <ForceGraph2D
              ref={graphRef as never}
              graphData={fgData}
              width={canvasWidth}
              height={canvasHeight}
              backgroundColor="rgba(0,0,0,0)"
              nodeCanvasObject={paintNode}
              nodePointerAreaPaint={(node, color, ctx) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x ?? 0, node.y ?? 0, 10, 0, 2 * Math.PI, false);
                ctx.fill();
              }}
              linkColor={() => "rgba(148,163,184,0.4)"}
              linkLabel={(link) => {
                const edge = link as FgLink;
                return `${edge.relationType} (${Math.round(edge.confidence * 100)}%)`;
              }}
              onLinkHover={(link) => {
                if (!link) {
                  setHoverLinkLabel(null);
                  return;
                }
                const edge = link as FgLink;
                setHoverLinkLabel(
                  `${edge.relationType} · ${Math.round(edge.confidence * 100)}% confidence`,
                );
              }}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              cooldownTicks={reducedMotion ? 0 : 140}
              cooldownTime={reducedMotion ? 0 : 8000}
              enableNodeDrag={!reducedMotion && !linkSourceId}
              onNodeClick={(node) => {
                const id = String((node as FgNode).id);
                if (linkSourceId) {
                  if (id === linkSourceId) {
                    toast.message("Pick a different node as the relation target");
                    return;
                  }
                  openRelationDialog(linkSourceId, id);
                  return;
                }
                void loadDetail(id);
              }}
              onBackgroundClick={() => {
                if (linkSourceId) {
                  cancelConnect();
                  return;
                }
                clearSelection();
              }}
            />

            <div className="sr-only" role="status" aria-live="polite">
              {detail
                ? `Selected ${detail.name}, ${detail.type}, ${detail.relations.length} relations`
                : "No entity selected"}
            </div>
          </div>

          <aside
            className={cn(
              "sticky top-4 max-h-[min(720px,calc(100vh-8rem))] overflow-y-auto rounded-2xl border border-border/60 bg-card/40 p-4",
              !selectedId && "flex min-h-[280px] items-center justify-center",
            )}
            aria-live="polite"
          >
            {!selectedId && (
              <div className="space-y-3 px-2 text-center">
                <p className="text-sm font-medium text-foreground/90">Inspect an entity</p>
                <ol className="space-y-2 text-left text-xs leading-relaxed text-muted-foreground">
                  <li>1. Click any node on the canvas</li>
                  <li>2. Add a relation via the panel or Connect mode</li>
                  <li>3. Jump to cited documents in the data room</li>
                </ol>
              </div>
            )}
            {selectedId && detailLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading entity…
              </div>
            )}
            {selectedId && !detailLoading && detail && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorForType(detail.type) }}
                        aria-hidden="true"
                      />
                      <h2 className="truncate text-lg font-semibold">{detail.name}</h2>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="capitalize">
                        {detail.type}
                      </Badge>
                      <Badge variant="secondary" className="tabular-nums">
                        {detail.relations.length} relation
                        {detail.relations.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${detail.name}`}
                      onClick={() => {
                        setEditName(detail.name);
                        setEditType(
                          (ENTITY_TYPES.includes(detail.type as (typeof ENTITY_TYPES)[number])
                            ? detail.type
                            : "other") as (typeof ENTITY_TYPES)[number],
                        );
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${detail.name}`}
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Clear selection"
                      onClick={clearSelection}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Relations
                    </h3>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          if (!detail) return;
                          setRelationSourceId(detail.id);
                          setRelationTargetId(null);
                          setRelationType("related_to");
                          setRelationConfidence(0.8);
                          setRelationOpen(true);
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                        Add
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => detail && startConnectFrom(detail.id)}
                      >
                        <Link2 className="mr-1 h-3 w-3" aria-hidden="true" />
                        Connect
                      </Button>
                    </div>
                  </div>
                  {detail.relations.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No relations yet. Use Add or Connect on the canvas.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {detail.relations.map((relation) => (
                        <li
                          key={relation.id}
                          className="rounded-lg border border-border/50 bg-background/30 p-2.5 text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="border-border/60 text-[10px] uppercase tracking-wide text-muted-foreground"
                                >
                                  {relation.direction === "outgoing" ? "Out" : "In"}
                                </Badge>
                                <button
                                  type="button"
                                  className="font-medium text-primary hover:underline"
                                  onClick={() => void loadDetail(relation.other.id)}
                                >
                                  {relation.other.name}
                                </button>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {relation.relationType}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-0.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                aria-label={`Edit relation to ${relation.other.name}`}
                                onClick={() =>
                                  setEditRelation({
                                    id: relation.id,
                                    relationType: relation.relationType,
                                    confidence: relation.confidence,
                                    label: `${relation.relationType} → ${relation.other.name}`,
                                  })
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                aria-label={`Reverse relation to ${relation.other.name}`}
                                onClick={() => void reverseRelation(relation.id)}
                              >
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0"
                                aria-label={`Remove relation to ${relation.other.name}`}
                                onClick={() =>
                                  setRelationToDelete({
                                    id: relation.id,
                                    label: `${relation.relationType} → ${relation.other.name}`,
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
                              <div
                                className="h-full rounded-full bg-primary/80"
                                style={{
                                  width: `${Math.round(Math.min(1, Math.max(0, relation.confidence)) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                              {Math.round(relation.confidence * 100)}%
                            </span>
                          </div>
                          {relation.excerpt && (
                            <p className="mt-2 border-l-2 border-border/60 pl-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                              {relation.excerpt}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Documents
                  </h3>
                  {detail.documents.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No linked documents.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {detail.documents.map((doc) => (
                        <li key={doc.id}>
                          <Link
                            href={`/dashboard/projects/${projectId}/data-room?doc=${doc.id}`}
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {doc.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {(detail.timelineEvents ?? []).length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Timeline mentions
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {(detail.timelineEvents ?? []).map((event) => (
                        <li key={event.id}>
                          <Link
                            href={`/dashboard/projects/${projectId}/timeline`}
                            className="inline-flex items-start gap-1.5 text-sm text-primary hover:underline"
                          >
                            <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>
                              {event.title}
                              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                                {new Date(event.eventDate).toLocaleDateString()} · {event.category}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detail.findings.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Related findings
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {detail.findings.map((finding) => (
                        <li
                          key={finding.id}
                          className="rounded-lg border border-border/50 px-2.5 py-2 text-sm"
                        >
                          {finding.severity && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "mb-1.5 text-[10px]",
                                SEVERITY_CLASS[finding.severity] ?? "text-muted-foreground",
                              )}
                            >
                              {finding.severity}
                            </Badge>
                          )}
                          <p className="leading-snug">{finding.title}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add node</DialogTitle>
            <DialogDescription>
              Manually add an entity to this project graph. Relations can still come from extract or
              existing NER.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="graph-node-name">Name</Label>
              <Input
                id="graph-node-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Acme Corp"
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="graph-node-type">Type</Label>
              <select
                id="graph-node-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                value={addType}
                onChange={(e) =>
                  setAddType(e.target.value as (typeof ENTITY_TYPES)[number])
                }
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type} className="capitalize">
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void createNode()} disabled={adding}>
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit node</DialogTitle>
            <DialogDescription>Rename this entity or change its type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="graph-edit-name">Name</Label>
              <Input
                id="graph-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="graph-edit-type">Type</Label>
              <select
                id="graph-edit-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                value={editType}
                onChange={(e) =>
                  setEditType(e.target.value as (typeof ENTITY_TYPES)[number])
                }
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type} value={type} className="capitalize">
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEditedNode()} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editRelation)}
        onOpenChange={(open) => {
          if (!open) setEditRelation(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit relation</DialogTitle>
            <DialogDescription>
              {editRelation ? editRelation.label : "Update relation type and confidence."}
            </DialogDescription>
          </DialogHeader>
          {editRelation && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-relation-type">Relation type</Label>
                <Input
                  id="edit-relation-type"
                  list="relation-type-suggestions"
                  value={editRelation.relationType}
                  onChange={(e) =>
                    setEditRelation((prev) =>
                      prev ? { ...prev, relationType: e.target.value } : prev,
                    )
                  }
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-relation-confidence">
                  Confidence{" "}
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {Math.round(editRelation.confidence * 100)}%
                  </span>
                </Label>
                <input
                  id="edit-relation-confidence"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(editRelation.confidence * 100)}
                  onChange={(e) =>
                    setEditRelation((prev) =>
                      prev
                        ? { ...prev, confidence: Number(e.target.value) / 100 }
                        : prev,
                    )
                  }
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRelation(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveEditedRelation()}
              disabled={savingEditRelation}
            >
              {savingEditRelation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={relationOpen}
        onOpenChange={(open) => {
          setRelationOpen(open);
          if (!open) {
            setRelationSourceId(null);
            setRelationTargetId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add relation</DialogTitle>
            <DialogDescription>
              Link two entities in this project graph. Use Connect on the canvas to pick the target
              by clicking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="relation-source">From</Label>
              <select
                id="relation-source"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={relationSourceId ?? ""}
                onChange={(e) => setRelationSourceId(e.target.value || null)}
              >
                <option value="" disabled>
                  Select source…
                </option>
                {graph.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name} ({node.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="relation-target">To</Label>
              <select
                id="relation-target"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={relationTargetId ?? ""}
                onChange={(e) => setRelationTargetId(e.target.value || null)}
              >
                <option value="" disabled>
                  Select target…
                </option>
                {graph.nodes
                  .filter((node) => node.id !== relationSourceId)
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name} ({node.type})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="relation-type">Relation type</Label>
              <Input
                id="relation-type"
                list="relation-type-suggestions"
                value={relationType}
                onChange={(e) => setRelationType(e.target.value)}
                placeholder="e.g. employs"
                maxLength={120}
              />
              <datalist id="relation-type-suggestions">
                {RELATION_TYPE_SUGGESTIONS.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="relation-confidence">
                Confidence{" "}
                <span className="font-mono tabular-nums text-muted-foreground">
                  {Math.round(relationConfidence * 100)}%
                </span>
              </Label>
              <input
                id="relation-confidence"
                type="range"
                min={0}
                max={100}
                value={Math.round(relationConfidence * 100)}
                onChange={(e) => setRelationConfidence(Number(e.target.value) / 100)}
                className="w-full accent-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRelationOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveRelation()}
              disabled={savingRelation || !relationSourceId || !relationTargetId}
            >
              {savingRelation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save relation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={forceConfirmOpen}
        onOpenChange={setForceConfirmOpen}
        title="Replace existing graph?"
        description="This deletes current entities and relations for the project, then re-extracts from documents."
        confirmLabel="Replace & extract"
        variant="destructive"
        loading={extracting}
        onConfirm={() => void runExtract({ force: true })}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Remove node?"
        description={
          detail
            ? `Delete “${detail.name}” and any relations connected to it from this project graph.`
            : undefined
        }
        confirmLabel="Remove"
        variant="destructive"
        loading={deleting}
        onConfirm={() => void removeSelectedNode()}
      />

      <ConfirmDialog
        open={Boolean(relationToDelete)}
        onOpenChange={(open) => {
          if (!open) setRelationToDelete(null);
        }}
        title="Remove relation?"
        description={
          relationToDelete ? `Delete “${relationToDelete.label}” from this graph.` : undefined
        }
        confirmLabel="Remove"
        variant="destructive"
        loading={deletingRelation}
        onConfirm={() => void removeRelation()}
      />
    </div>
  );
}
