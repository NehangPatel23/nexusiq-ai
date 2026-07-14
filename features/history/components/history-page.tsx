"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrgOption = { id: string; name: string };
type ProjectOption = { id: string; name: string };

type AuditItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  source?: "audit_log" | "data_room";
  sourceLabel?: string;
  user: { id: string; name: string | null; email: string } | null;
  metadata: unknown;
};

type CompareResult = {
  projectA: { projectName: string; agentScores: Record<string, number | null>; consensusConfidence: string | null; findingSeverityCounts: Record<string, number>; openContradictionCount: number; openMissingCount: number };
  projectB: { projectName: string; agentScores: Record<string, number | null>; consensusConfidence: string | null; findingSeverityCounts: Record<string, number>; openContradictionCount: number; openMissingCount: number };
  scoreDiffs: Array<{
    agentType: string;
    label: string;
    scoreA: number | null;
    scoreB: number | null;
    diff: number | null;
  }>;
};

const ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "UPLOAD",
  "PROCESS",
  "UPDATE",
  "DELETE",
  "AGENT_RUN",
  "CONSENSUS",
  "SIMULATION",
  "REPORT",
  "SETTINGS_UPDATE",
  "MAINTENANCE",
  "USER_DELETED",
  "USER_RECOVERED",
  "ORG_DELETED",
  "ORG_RECOVERED",
] as const;

export function HistoryPageClient({
  organizations,
  initialOrgId,
  projectsByOrg,
  projectFilter,
}: {
  organizations: OrgOption[];
  initialOrgId: string | null;
  projectsByOrg: Record<string, ProjectOption[]>;
  projectFilter?: string;
}) {
  const [orgId, setOrgId] = useState(initialOrgId ?? organizations[0]?.id ?? "");
  const [mode, setMode] = useState<"audit" | "compare">(projectFilter ? "audit" : "audit");
  const [action, setAction] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projectA, setProjectA] = useState("");
  const [projectB, setProjectB] = useState("");
  const [compare, setCompare] = useState<CompareResult | null>(null);
  const [isComparing, startCompare] = useTransition();

  const projects = projectsByOrg[orgId] ?? [];

  const loadAudit = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (action !== "all") params.set("action", action);
      if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
      if (to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
      if (projectFilter) params.set("projectId", projectFilter);

      const res = await fetch(`/api/organizations/${orgId}/audit?${params}`);
      const json = (await res.json()) as {
        success: boolean;
        data?: { items: AuditItem[]; totalPages: number; total: number };
        error?: { message: string };
      };
      if (!json.success || !json.data) {
        toast.error(json.error?.message ?? "Failed to load audit log");
        return;
      }
      setItems(json.data.items);
      setTotalPages(json.data.totalPages);
      setTotal(json.data.total);
    } finally {
      setLoading(false);
    }
  }, [orgId, page, action, from, to, projectFilter]);

  useEffect(() => {
    if (mode === "audit") void loadAudit();
  }, [mode, loadAudit]);

  function runCompare() {
    if (!orgId || !projectA || !projectB) {
      toast.error("Select two projects to compare");
      return;
    }
    startCompare(async () => {
      const params = new URLSearchParams({ projectA, projectB });
      const res = await fetch(`/api/organizations/${orgId}/compare?${params}`);
      const json = (await res.json()) as {
        success: boolean;
        data?: CompareResult;
        error?: { message: string };
      };
      if (!json.success || !json.data) {
        toast.error(json.error?.message ?? "Compare failed");
        setCompare(null);
        return;
      }
      setCompare(json.data);
    });
  }

  if (organizations.length === 0) {
    return (
      <div className="surface-elevated p-8 text-center text-muted-foreground">
        Join or create an organization to view audit history.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        {organizations.length > 1 ? (
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select
              value={orgId}
              onValueChange={(value) => {
                setOrgId(value);
                setPage(1);
                setCompare(null);
                setProjectA("");
                setProjectB("");
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select org" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button
            variant={mode === "audit" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("audit")}
          >
            Audit log
          </Button>
          <Button
            variant={mode === "compare" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("compare")}
          >
            Compare projects
          </Button>
        </div>
      </div>

      {mode === "audit" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={action}
                onValueChange={(value) => {
                  setAction(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <DatePicker
                id="from"
                value={from || null}
                allowClear
                placeholder="Start date"
                className="w-[180px]"
                onChange={(ymd) => {
                  setFrom(ymd);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <DatePicker
                id="to"
                value={to || null}
                allowClear
                placeholder="End date"
                className="w-[180px]"
                onChange={(ymd) => {
                  setTo(ymd);
                  setPage(1);
                }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadAudit()} disabled={loading}>
              Refresh
            </Button>
          </div>

          <div className="surface-elevated overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No audit events yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const resourceName =
                      item.metadata &&
                      typeof item.metadata === "object" &&
                      "resourceName" in item.metadata &&
                      typeof (item.metadata as { resourceName?: unknown }).resourceName === "string"
                        ? (item.metadata as { resourceName: string }).resourceName
                        : null;
                    return (
                      <tr key={item.id} className="border-b border-border/40">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.action}</td>
                        <td className="px-4 py-3">
                          {resourceName ?? item.entityType}
                          {item.entityId ? (
                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                              {item.entityId.slice(0, 8)}…
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {item.user?.name ?? item.user?.email ?? "System"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.sourceLabel ??
                            (item.source === "data_room" ? "Data Room" : "System")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total} event{total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-2 py-1">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Project A</Label>
              <Select value={projectA} onValueChange={setProjectA}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === projectB}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project B</Label>
              <Select value={projectB} onValueChange={setProjectB}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === projectA}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runCompare} disabled={isComparing}>
              {isComparing ? "Comparing…" : "Compare"}
            </Button>
          </div>

          {compare ? (
            <div className="surface-elevated overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-4 py-3 font-medium">{compare.projectA.projectName}</th>
                    <th className="px-4 py-3 font-medium">{compare.projectB.projectName}</th>
                    <th className="px-4 py-3 font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.scoreDiffs.map((row) => (
                    <tr key={row.agentType} className="border-b border-border/40">
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3">{row.scoreA ?? "—"}</td>
                      <td className="px-4 py-3">{row.scoreB ?? "—"}</td>
                      <td className="px-4 py-3">{row.diff ?? "—"}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border/40">
                    <td className="px-4 py-3 font-medium">Consensus</td>
                    <td className="px-4 py-3">{compare.projectA.consensusConfidence ?? "—"}</td>
                    <td className="px-4 py-3">{compare.projectB.consensusConfidence ?? "—"}</td>
                    <td className="px-4 py-3">—</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="px-4 py-3 font-medium">Open contradictions</td>
                    <td className="px-4 py-3">{compare.projectA.openContradictionCount}</td>
                    <td className="px-4 py-3">{compare.projectB.openContradictionCount}</td>
                    <td className="px-4 py-3">
                      {compare.projectA.openContradictionCount -
                        compare.projectB.openContradictionCount}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Open missing</td>
                    <td className="px-4 py-3">{compare.projectA.openMissingCount}</td>
                    <td className="px-4 py-3">{compare.projectB.openMissingCount}</td>
                    <td className="px-4 py-3">
                      {compare.projectA.openMissingCount - compare.projectB.openMissingCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select two projects to see side-by-side agent scores and risk counts.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
