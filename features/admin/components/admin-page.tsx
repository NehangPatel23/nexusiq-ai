"use client";

import {
  Activity,
  AlertTriangle,
  Database,
  FileStack,
  Folders,
  HardDrive,
  RefreshCw,
  Server,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { formatBytes } from "@/features/admin/lib/format-bytes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

type OrgOption = { id: string; name: string };

type HealthData = {
  ok: boolean;
  db: "connected" | "error";
  ollama: "connected" | "unreachable" | "not_configured";
  ollamaUrl: string;
  ollamaModels?: string[];
  ollamaConfigSource: {
    baseUrl: string;
    chatModel: string;
    embedModel: string;
  };
  apiKeyConfigured: boolean;
  disk?: {
    availableBytes?: number;
    totalBytes?: number;
    path?: string;
    note?: string;
  };
  storage: { documentsBytes: number; documentCount: number };
  queue: { pending: number; processing: number; failed: number; ready: number };
  environment: { vercel: boolean; nodeEnv: string };
  workerNote: string;
  organizationId: string;
  failedDocuments: Array<{
    id: string;
    name: string;
    projectId: string;
    projectName: string;
    errorMessage: string | null;
    updatedAt: string;
  }>;
};

type UsageData = {
  members: number;
  projects: number;
  documents: number;
  documentsByStatus: {
    pending: number;
    processing: number;
    ready: number;
    failed: number;
  };
  chunks: number;
  agentRuns: number;
  consensusRuns: number;
  simulationRuns: number;
  reports: number;
  tasks: number;
  storageBytes: number;
  series: {
    uploads: Array<{ date: string; count: number }>;
    agentRuns: Array<{ date: string; count: number }>;
  };
};

type MemberRow = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  name: string | null;
  email: string;
};

function statusTone(status: string): "good" | "bad" | "warn" | "neutral" {
  if (status === "connected" || status === "ok") return "good";
  if (status === "unreachable" || status === "error") return "bad";
  if (status === "not_configured") return "warn";
  return "neutral";
}

function StatusDot({ tone }: { tone: ReturnType<typeof statusTone> }) {
  return (
    <span
      className={cn(
        "inline-block size-2.5 rounded-full",
        tone === "good" && "bg-emerald-400 shadow-[0_0_8px_hsl(150_60%_50%/0.55)]",
        tone === "bad" && "bg-red-400 shadow-[0_0_8px_hsl(0_70%_55%/0.45)]",
        tone === "warn" && "bg-amber-400",
        tone === "neutral" && "bg-muted-foreground/50",
      )}
      aria-hidden
    />
  );
}

function SectionHeading({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h2 id={id} className="text-h3">
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function HealthCard({
  icon: Icon,
  title,
  status,
  statusLabel,
  children,
}: {
  icon: typeof Database;
  title: string;
  status: string;
  statusLabel?: string;
  children: React.ReactNode;
}) {
  const tone = statusTone(status);
  return (
    <article className="surface-card flex h-full flex-col gap-4 p-5 transition-colors hover:border-primary/25">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-caption capitalize">
              <StatusDot tone={tone} />
              {statusLabel ?? status.replaceAll("_", " ")}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-auto space-y-2 text-sm text-muted-foreground">{children}</div>
    </article>
  );
}

export function AdminPageClient({
  organizations,
  initialOrgId,
}: {
  organizations: OrgOption[];
  initialOrgId: string | null;
}) {
  const [orgId, setOrgId] = useState(initialOrgId ?? organizations[0]?.id ?? "");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [manageHref, setManageHref] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [confirm, setConfirm] = useState<null | "fts" | "embeddings" | "retry">(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAll = useCallback(async (organizationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = `organizationId=${encodeURIComponent(organizationId)}`;
      const [healthRes, usageRes, usersRes] = await Promise.all([
        fetch(`/api/admin/health?${q}`),
        fetch(`/api/admin/usage?${q}&days=30`),
        fetch(`/api/admin/users?${q}`),
      ]);

      const healthJson = (await healthRes.json()) as {
        success: boolean;
        data?: HealthData;
        error?: { message: string };
      };
      const usageJson = (await usageRes.json()) as {
        success: boolean;
        data?: UsageData;
        error?: { message: string };
      };
      const usersJson = (await usersRes.json()) as {
        success: boolean;
        data?: { members: MemberRow[]; manageHref: string };
        error?: { message: string };
      };

      if (!healthJson.success || !healthJson.data) {
        throw new Error(healthJson.error?.message ?? "Failed to load health");
      }
      if (!usageJson.success || !usageJson.data) {
        throw new Error(usageJson.error?.message ?? "Failed to load usage");
      }
      if (!usersJson.success || !usersJson.data) {
        throw new Error(usersJson.error?.message ?? "Failed to load users");
      }

      setHealth(healthJson.data);
      setUsage(usageJson.data);
      setMembers(usersJson.data.members);
      setManageHref(usersJson.data.manageHref);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load admin data";
      setError(message);
      setHealth(null);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orgId) void loadAll(orgId);
  }, [orgId, loadAll]);

  const chartData = useMemo(() => {
    if (!usage) return [];
    const byDate = new Map<string, { date: string; uploads: number; agentRuns: number }>();
    for (const row of usage.series.uploads) {
      byDate.set(row.date, { date: row.date.slice(5), uploads: row.count, agentRuns: 0 });
    }
    for (const row of usage.series.agentRuns) {
      const existing = byDate.get(row.date) ?? {
        date: row.date.slice(5),
        uploads: 0,
        agentRuns: 0,
      };
      existing.agentRuns = row.count;
      byDate.set(row.date, existing);
    }
    return [...byDate.values()];
  }, [usage]);

  async function runReindex(mode: "fts" | "embeddings") {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/reindex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, organizationId: orgId, confirm: true }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: {
          updatedChunks: number;
          tookMs: number;
          strategy: string;
          message?: string;
        };
        error?: { message: string };
      };
      if (!json.success || !json.data) {
        toast.error(json.error?.message ?? "Reindex failed");
        return;
      }
      toast.success(
        json.data.message ??
          `Updated ${json.data.updatedChunks} chunks in ${json.data.tookMs}ms (${json.data.strategy})`,
      );
      await loadAll(orgId);
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  async function runRetryFailed() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/queue/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, confirm: true }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { updated: number };
        error?: { message: string };
      };
      if (!json.success || !json.data) {
        toast.error(json.error?.message ?? "Retry failed");
        return;
      }
      toast.success(`Queued ${json.data.updated} document(s) for reprocessing`);
      await loadAll(orgId);
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  }

  if (organizations.length === 0) {
    return (
      <div className="surface-elevated p-8 text-center text-muted-foreground" role="status">
        You need to be an organization owner to access Admin.
      </div>
    );
  }

  const secondaryStats = usage
    ? [
        { label: "Agent runs", value: usage.agentRuns },
        { label: "Consensus", value: usage.consensusRuns },
        { label: "Simulations", value: usage.simulationRuns },
        { label: "Reports", value: usage.reports },
        { label: "Tasks", value: usage.tasks },
        { label: "Storage", value: formatBytes(usage.storageBytes) },
      ]
    : [];

  return (
    <div className="space-y-10">
      <div className="surface-elevated flex flex-wrap items-end justify-between gap-4 p-4 md:p-5">
        <div className="space-y-2">
          <label htmlFor="admin-org" className="text-label">
            Organization
          </label>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger id="admin-org" className="w-[280px]" aria-label="Select organization">
              <SelectValue placeholder="Select organization" />
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
        <Button
          type="button"
          variant="outline"
          disabled={loading || isRefreshing || !orgId}
          onClick={() => startRefresh(() => loadAll(orgId))}
          aria-label="Refresh admin data"
        >
          <RefreshCw className={cn("mr-2 size-4", (loading || isRefreshing) && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <span className="flex-1">{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadAll(orgId)}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading && !health ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-live="polite">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card h-36 animate-pulse bg-secondary/30" />
          ))}
        </div>
      ) : null}

      {health ? (
        <section aria-labelledby="admin-health-heading" className="space-y-4">
          <SectionHeading
            id="admin-health-heading"
            title="System health"
            description="Live checks for database, Ollama, storage, and the processing queue."
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HealthCard icon={Database} title="Database" status={health.db}>
              <p className="text-caption">
                {health.environment.nodeEnv}
                {health.environment.vercel ? " · Vercel" : " · local"}
              </p>
            </HealthCard>

            <HealthCard icon={Server} title="Ollama" status={health.ollama}>
              <p>
                Host <span className="text-foreground">{health.ollamaUrl || "—"}</span>
              </p>
              <p className="text-caption">
                Key {health.apiKeyConfigured ? "configured" : "not set"} · URL{" "}
                {health.ollamaConfigSource.baseUrl}
              </p>
              {health.ollamaModels && health.ollamaModels.length > 0 ? (
                <p className="text-caption line-clamp-2" title={health.ollamaModels.join(", ")}>
                  Models: {health.ollamaModels.slice(0, 5).join(", ")}
                  {health.ollamaModels.length > 5 ? "…" : ""}
                </p>
              ) : null}
              <Button asChild variant="link" className="h-auto px-0 text-sm">
                <Link href="/dashboard/settings/ai">Configure in AI Models</Link>
              </Button>
            </HealthCard>

            <HealthCard icon={HardDrive} title="Storage" status="connected">
              <p className="text-foreground">
                {formatBytes(health.storage.documentsBytes)}
                <span className="text-muted-foreground">
                  {" "}
                  · {health.storage.documentCount} files
                </span>
              </p>
              {health.disk?.note ? (
                <p className="text-caption">{health.disk.note}</p>
              ) : (
                <p className="text-caption">
                  {health.disk?.availableBytes != null
                    ? `${formatBytes(health.disk.availableBytes)} free`
                    : "Disk n/a"}
                  {health.disk?.totalBytes != null
                    ? ` / ${formatBytes(health.disk.totalBytes)}`
                    : ""}
                </p>
              )}
            </HealthCard>

            <HealthCard
              icon={Activity}
              title="Queue"
              status={health.queue.failed > 0 ? "not_configured" : "connected"}
              statusLabel={health.queue.failed > 0 ? "attention" : "healthy"}
            >
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(
                  [
                    ["Pending", health.queue.pending],
                    ["Processing", health.queue.processing],
                    ["Ready", health.queue.ready],
                    ["Failed", health.queue.failed],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border/50 bg-secondary/20 px-2.5 py-2"
                  >
                    <p className="text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-caption">{health.workerNote}</p>
            </HealthCard>
          </div>
        </section>
      ) : null}

      {usage ? (
        <section aria-labelledby="admin-usage-heading" className="space-y-4">
          <SectionHeading
            id="admin-usage-heading"
            title="Usage"
            description="Organization aggregates for the last 30 days of activity."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Members" value={usage.members} icon={Users} />
            <StatCard label="Projects" value={usage.projects} icon={Folders} />
            <StatCard label="Documents" value={usage.documents} icon={FileStack} />
            <StatCard label="Chunks" value={usage.chunks} icon={Database} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {secondaryStats.map((stat) => (
              <div key={stat.label} className="surface-card px-4 py-3">
                <p className="text-label">{stat.label}</p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums tracking-tight">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          <div className="surface-elevated p-5 md:p-6">
            <div className="mb-4 space-y-1">
              <h3 className="text-sm font-semibold">Activity (30 days)</h3>
              <p className="text-caption">Uploads and agent runs by day</p>
            </div>
            {chartData.every((d) => d.uploads === 0 && d.agentRuns === 0) ? (
              <p className="py-10 text-center text-sm text-muted-foreground" role="status">
                No uploads or agent runs in this period.
              </p>
            ) : (
              <div
                className="h-64 w-full"
                role="img"
                aria-label="Usage chart for uploads and agent runs"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border) / 0.6)",
                        borderRadius: 12,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="uploads" name="Uploads" fill="hsl(var(--primary))" radius={4} />
                    <Bar
                      dataKey="agentRuns"
                      name="Agent runs"
                      fill="hsl(var(--accent))"
                      radius={4}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {health ? (
        <section aria-labelledby="admin-queue-heading" className="space-y-4">
          <SectionHeading
            id="admin-queue-heading"
            title="Failed documents"
            description="Reset failed processing jobs back to PENDING for the worker."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={health.queue.failed === 0 || actionLoading}
                onClick={() => setConfirm("retry")}
              >
                <AlertTriangle className="mr-2 size-4" aria-hidden />
                Retry all failed
              </Button>
            }
          />
          {health.failedDocuments.length === 0 ? (
            <div
              className="surface-muted px-6 py-8 text-center text-sm text-muted-foreground"
              role="status"
            >
              No failed documents in this organization.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border/60 bg-secondary/30 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Document</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Error</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {health.failedDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-border/40 transition-colors hover:bg-secondary/20"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/projects/${doc.projectId}/data-room?documentId=${doc.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {doc.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{doc.projectName}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                        {doc.errorMessage ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(doc.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <section aria-labelledby="admin-users-heading" className="space-y-4">
        <SectionHeading
          id="admin-users-heading"
          title="Members"
          description="Active organization members. Role changes live in Organizations."
          action={
            manageHref ? (
              <Button asChild variant="outline" size="sm">
                <Link href={manageHref}>Manage roles</Link>
              </Button>
            ) : null
          }
        />
        {members.length === 0 && !loading ? (
          <div
            className="surface-muted px-6 py-8 text-center text-sm text-muted-foreground"
            role="status"
          >
            No active members.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/40">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-border/60 bg-secondary/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border/40 transition-colors hover:bg-secondary/20"
                  >
                    <td className="px-4 py-3 font-medium">{m.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{m.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="admin-maintenance-heading" className="space-y-4">
        <SectionHeading
          id="admin-maintenance-heading"
          title="Maintenance"
          description="Rebuild search indexes. Re-embed requires a reachable Ollama endpoint."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="surface-elevated flex flex-col gap-4 p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <Wrench className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold">Reindex FTS</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rebuild Postgres search vectors offline. Ollama is not required.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-auto w-fit"
              disabled={actionLoading}
              onClick={() => setConfirm("fts")}
            >
              Reindex FTS
            </Button>
          </div>
          <div className="surface-elevated flex flex-col gap-4 border-destructive/25 p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
                <Shield className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold">Re-embed all</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Regenerate embeddings via Ollama. May take several minutes on large corpora.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="mt-auto w-fit"
              disabled={actionLoading}
              onClick={() => setConfirm("embeddings")}
            >
              Re-embed all
            </Button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirm === "fts"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Rebuild full-text search index?"
        description="This updates search_vector for all document chunks in the organization. Ollama is not required."
        confirmLabel="Reindex FTS"
        loading={actionLoading}
        onConfirm={() => void runReindex("fts")}
      />
      <ConfirmDialog
        open={confirm === "embeddings"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Re-embed all document chunks?"
        description="This calls Ollama to regenerate embeddings for every chunk. It can take a long time and requires a reachable Ollama endpoint. On Vercel with a large corpus, documents may be queued PENDING for the worker instead."
        confirmLabel="Re-embed all"
        variant="destructive"
        loading={actionLoading}
        onConfirm={() => void runReindex("embeddings")}
      />
      <ConfirmDialog
        open={confirm === "retry"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Retry all failed documents?"
        description="Failed documents will be reset to PENDING for worker reprocessing. Inline processing is not used on Vercel."
        confirmLabel="Retry failed"
        variant="destructive"
        loading={actionLoading}
        onConfirm={() => void runRetryFailed()}
      />
    </div>
  );
}
