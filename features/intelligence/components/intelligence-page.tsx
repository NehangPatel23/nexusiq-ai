"use client";

import type { AgentType, ConfidenceLevel } from "@prisma/client";
import { Bot, History, Loader2, Play, RefreshCw, Scan } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentRunDetail, AgentRunSummary } from "@/features/intelligence/lib/agent-runs";
import {
  aggregateOpenFindingsBySeverity,
  type FindingSeverityCounts,
} from "@/features/intelligence/lib/severity-summary";
import type { ChatCitation } from "@/lib/ai/citations";
import { INTELLIGENCE_AGENT_TYPES } from "@/lib/ai/agents/types";
import { cn } from "@/lib/utils";

import { AgentRunHistory } from "./agent-run-history";
import { AgentScoreGauge } from "./agent-score-gauge";
import { AgentThinking } from "./agent-thinking";
import { FindingsTable, type FindingRow } from "./findings-table";
import { ProjectRiskSummary } from "./project-risk-summary";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type RunResponse = {
  runId: string;
  agentType: AgentType;
  status: "completed" | "failed";
  score?: number;
  confidence: ConfidenceLevel;
  findings: FindingRow[];
  citations: ChatCitation[];
  output: Record<string, unknown> | null;
  error?: string;
};

type IntelligencePageProps = {
  projectId: string;
  projectName: string;
  initialRuns: AgentRunSummary[];
  initialDetails: Partial<Record<AgentType, AgentRunDetail>>;
  initialRiskSummary: FindingSeverityCounts;
};

const AGENT_LABELS: Record<AgentType, string> = {
  FINANCIAL: "Financial",
  LEGAL: "Legal",
  COMPLIANCE: "Compliance",
  RISK: "Risk",
  FRAUD: "Fraud",
};

const COMING_SOON_AGENTS = [
  { id: "EXECUTIVE", label: "Executive", slice: "Slice 10" },
  { id: "CONSENSUS", label: "Consensus", slice: "Slice 10" },
] as const;

const API_SEGMENTS: Record<AgentType, string> = {
  FINANCIAL: "financial",
  LEGAL: "legal",
  COMPLIANCE: "compliance",
  RISK: "risk",
  FRAUD: "fraud",
};

function confidenceBadgeVariant(confidence: ConfidenceLevel | null) {
  if (confidence === "HIGH") return "secondary";
  if (confidence === "MEDIUM") return "outline";
  if (confidence === "LOW") return "destructive";
  return "outline";
}

function AgentBreakdown({
  agentType,
  output,
}: {
  agentType: AgentType;
  output: Record<string, unknown> | null;
}) {
  if (!output) return null;

  if (agentType === "RISK" && output.categoryScores && typeof output.categoryScores === "object") {
    const entries = Object.entries(output.categoryScores as Record<string, number>);
    return (
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map(([category, score]) => (
          <div key={category} className="rounded-lg border border-border/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{category}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{Math.round(score)}</p>
          </div>
        ))}
      </div>
    );
  }

  if (agentType === "COMPLIANCE" && Array.isArray(output.frameworkGaps)) {
    const gaps = output.frameworkGaps as Array<{ framework: string; status: string }>;
    return (
      <div className="flex flex-wrap gap-2">
        {gaps.map((gap, index) => (
          <Badge
            key={`${gap.framework}-${index}`}
            variant={gap.status === "missing" ? "destructive" : gap.status === "partial" ? "default" : "secondary"}
          >
            {gap.framework}: {gap.status}
          </Badge>
        ))}
      </div>
    );
  }

  if (agentType === "LEGAL" && Array.isArray(output.expiringContracts)) {
    const contracts = output.expiringContracts as Array<{ name: string; expiryDate?: string }>;
    return (
      <ul className="space-y-2 text-sm" role="list">
        {contracts.slice(0, 5).map((contract, index) => (
          <li key={`${contract.name}-${index}`} className="rounded-md border border-border/50 px-3 py-2">
            <span className="font-medium">{contract.name}</span>
            <span className="text-muted-foreground"> · expires {contract.expiryDate ?? "unknown"}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (agentType === "FINANCIAL") {
    const parts = [
      output.revenueAnalysis,
      output.expenseAnalysis,
      output.marginAnalysis,
    ].filter((value) => typeof value === "string") as string[];
    if (parts.length === 0) return null;
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        {parts.map((part, index) => (
          <p key={index}>{part}</p>
        ))}
      </div>
    );
  }

  if (agentType === "FRAUD" && typeof output.recommendation === "string") {
    return <p className="text-sm text-muted-foreground">{output.recommendation}</p>;
  }

  return null;
}

export function IntelligencePage({
  projectId,
  projectName,
  initialRuns,
  initialDetails,
  initialRiskSummary,
}: IntelligencePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeAgent, setActiveAgent] = useState<AgentType>("FINANCIAL");
  const [runs, setRuns] = useState(initialRuns);
  const [details, setDetails] = useState(initialDetails);
  const [scanningAgents, setScanningAgents] = useState<Set<AgentType>>(() => new Set());
  const [runningAll, setRunningAll] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState(0);
  const [ollamaUnavailable, setOllamaUnavailable] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const runAllTriggeredRef = useRef(false);

  const isAgentScanning = useCallback(
    (agentType: AgentType) => scanningAgents.has(agentType),
    [scanningAgents],
  );

  const activeDetail = details[activeAgent];
  const isActiveAgentScanning = isAgentScanning(activeAgent);
  const isWaitingInFullScan =
    runningAll && !isActiveAgentScanning && activeDetail === undefined;
  const activeRun = useMemo(() => {
    if (isActiveAgentScanning || runningAll) return undefined;
    return runs.find((run) => run.agentType === activeAgent && run.status === "COMPLETED");
  }, [runs, activeAgent, isActiveAgentScanning, runningAll]);

  const refreshRuns = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/agents/runs?limit=30`);
    const payload = (await response.json()) as ApiEnvelope<AgentRunSummary[]>;
    if (payload.success) setRuns(payload.data);
  }, [projectId]);

  const loadRunDetail = useCallback(
    async (runId: string, agentType: AgentType) => {
      const response = await fetch(`/api/agent-runs/${runId}`);
      const payload = (await response.json()) as ApiEnvelope<AgentRunDetail>;
      if (payload.success) {
        setDetails((current) => ({ ...current, [agentType]: payload.data }));
      }
    },
    [],
  );

  const beginAgentScan = useCallback((agentType: AgentType) => {
    setScanningAgents((current) => new Set(current).add(agentType));
    setDetails((current) => {
      const next = { ...current };
      delete next[agentType];
      return next;
    });
  }, []);

  const endAgentScan = useCallback((agentType: AgentType) => {
    setScanningAgents((current) => {
      const next = new Set(current);
      next.delete(agentType);
      return next;
    });
  }, []);

  const runAgent = useCallback(
    async (
      agentType: AgentType,
      force = false,
      options?: { skipRouterRefresh?: boolean },
    ): Promise<boolean> => {
      beginAgentScan(agentType);
      setOllamaUnavailable(false);
      try {
        const response = await fetch(`/api/projects/${projectId}/agents/${API_SEGMENTS[agentType]}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        const payload = (await response.json()) as ApiEnvelope<RunResponse>;

        if (!payload.success) {
          if (payload.error.code === "OLLAMA_UNAVAILABLE") {
            setOllamaUnavailable(true);
            toast.error(payload.error.message);
            return false;
          }
          toast.error(payload.error.message);
          return false;
        }

        if (payload.data.status === "failed") {
          toast.error(payload.data.error ?? "Agent scan failed.");
        } else {
          toast.success(`${AGENT_LABELS[agentType]} scan completed.`);
        }

        await refreshRuns();
        await loadRunDetail(payload.data.runId, agentType);
        // Invalidate the Router Cache so server components on sibling tabs
        // (e.g. the project overview scores + enterprise risk gauge) reflect
        // this run without a manual page refresh.
        if (!options?.skipRouterRefresh) {
          router.refresh();
        }
        return payload.data.status === "completed";
      } catch {
        toast.error("Agent scan could not be started.");
        return false;
      } finally {
        endAgentScan(agentType);
      }
    },
    [projectId, refreshRuns, loadRunDetail, beginAgentScan, endAgentScan, router],
  );

  const runAllAgents = useCallback(async () => {
    setRunningAll(true);
    setRunAllProgress(0);
    setDetails({});
    setOllamaUnavailable(false);

    let completed = 0;
    for (let index = 0; index < INTELLIGENCE_AGENT_TYPES.length; index += 1) {
      const agentType = INTELLIGENCE_AGENT_TYPES[index];
      setActiveAgent(agentType);
      const ok = await runAgent(agentType, true, { skipRouterRefresh: true });
      setRunAllProgress(index + 1);
      if (!ok) break;
      completed += 1;
    }

    setRunningAll(false);
    if (completed > 0) {
      // Single refresh after the batch so overview scores update once.
      router.refresh();
    }
    if (completed === INTELLIGENCE_AGENT_TYPES.length) {
      toast.success("Full intelligence scan finished.");
    } else if (completed > 0) {
      toast.message("Full scan stopped early. Completed agents were updated.");
    }
  }, [runAgent, router]);

  useEffect(() => {
    const runAll = searchParams.get("runAll");
    if (runAll !== "1" || runAllTriggeredRef.current) return;
    runAllTriggeredRef.current = true;
    router.replace(`/dashboard/projects/${projectId}/intelligence`);
    void runAllAgents();
  }, [searchParams, runAllAgents, router, projectId]);

  useEffect(() => {
    const runId = searchParams.get("run");
    if (!runId) return;
    const run = runs.find((item) => item.id === runId);
    if (run) {
      setActiveAgent(run.agentType);
      void loadRunDetail(run.id, run.agentType);
    }
  }, [searchParams, runs, loadRunDetail]);

  const riskSummary = useMemo(() => {
    const detailList = INTELLIGENCE_AGENT_TYPES.map((agent) => details[agent]);
    const hasAnyDetail = detailList.some(Boolean);
    return hasAnyDetail ? aggregateOpenFindingsBySeverity(detailList) : initialRiskSummary;
  }, [details, initialRiskSummary]);

  const showResults = !isActiveAgentScanning && !isWaitingInFullScan && Boolean(activeDetail);
  const currentFindings = showResults ? (activeDetail?.findings ?? []) : [];
  const currentCitations = showResults ? (activeDetail?.citations ?? []) : [];
  const currentOutput = showResults ? (activeDetail?.output ?? null) : null;
  const currentScore = showResults ? (activeDetail?.score ?? null) : null;
  const currentConfidence = showResults ? (activeDetail?.confidence ?? null) : null;
  const anyScanInProgress = scanningAgents.size > 0 || runningAll;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold tracking-tight">Intelligence Agents</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Run specialist scans on {projectName}&apos;s data room with cited findings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={anyScanInProgress}
            onClick={() => void runAllAgents()}
          >
            <Scan className="h-4 w-4" aria-hidden="true" />
            Run all agents
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowHistory((value) => !value)}>
            <History className="h-4 w-4" aria-hidden="true" />
            Run history
          </Button>
        </div>
      </div>

      <ProjectRiskSummary counts={riskSummary} />

      {runningAll ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <AgentThinking label={`Running full scan (${runAllProgress}/${INTELLIGENCE_AGENT_TYPES.length})`} />
            <span className="text-sm text-muted-foreground">
              {AGENT_LABELS[INTELLIGENCE_AGENT_TYPES[Math.min(runAllProgress, INTELLIGENCE_AGENT_TYPES.length - 1)] ?? "FINANCIAL"]}
            </span>
          </CardContent>
        </Card>
      ) : null}

      {ollamaUnavailable ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            Ollama is unavailable. Agent scans require a reachable Ollama endpoint configured on the server.
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Intelligence agents">
        {INTELLIGENCE_AGENT_TYPES.map((agent) => {
          const scanning = isAgentScanning(agent);
          const agentDetail = details[agent];
          const waitingInFullScan = runningAll && !scanning && agentDetail === undefined;
          const latest =
            !runningAll && !scanning
              ? runs.find((run) => run.agentType === agent && run.status === "COMPLETED")
              : undefined;
          const tabScore =
            agentDetail?.score !== null && agentDetail?.score !== undefined
              ? agentDetail.score
              : !runningAll && latest?.score !== null && latest?.score !== undefined
                ? latest.score
                : null;

          return (
            <button
              key={agent}
              type="button"
              role="tab"
              aria-selected={activeAgent === agent}
              aria-busy={scanning || waitingInFullScan}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                activeAgent === agent
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
                (scanning || waitingInFullScan) && "border-primary/40",
              )}
              onClick={() => setActiveAgent(agent)}
            >
              {AGENT_LABELS[agent]}
              {scanning ? (
                <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-primary" aria-hidden="true" />
              ) : tabScore !== null ? (
                <span className="tabular-nums text-xs text-muted-foreground">{Math.round(tabScore)}</span>
              ) : null}
            </button>
          );
        })}
        {COMING_SOON_AGENTS.map((agent) => (
          <button
            key={agent.id}
            type="button"
            role="tab"
            aria-selected={false}
            disabled
            title={`Coming in ${agent.slice}`}
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-border/40 px-4 py-2 text-sm text-muted-foreground opacity-60"
          >
            {agent.label}
            <span className="text-xs">Soon</span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>{AGENT_LABELS[activeAgent]} agent</CardTitle>
            <CardDescription>
              {isActiveAgentScanning
                ? "Assessment in progress…"
                : isWaitingInFullScan
                  ? "Queued in full scan…"
                  : activeDetail
                    ? `Last completed ${new Date(activeDetail.completedAt ?? activeDetail.startedAt).toLocaleString()}`
                    : activeRun
                      ? `Last completed ${new Date(activeRun.completedAt ?? activeRun.startedAt).toLocaleString()}`
                      : "No completed runs yet"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {showResults && currentConfidence ? (
              <Badge variant={confidenceBadgeVariant(currentConfidence)}>{currentConfidence}</Badge>
            ) : null}
            <Button
              type="button"
              disabled={isActiveAgentScanning || runningAll}
              onClick={() => void runAgent(activeAgent, true)}
            >
              {isActiveAgentScanning ? (
                <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {isActiveAgentScanning ? "Running scan…" : activeRun ? "Re-run scan" : "Run scan"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isActiveAgentScanning ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
              <AgentThinking label={`Running ${AGENT_LABELS[activeAgent].toLowerCase()} assessment`} />
              <p className="mt-3 text-sm text-muted-foreground">
                Previous results are hidden until this scan completes.
              </p>
            </div>
          ) : null}

          {isWaitingInFullScan ? (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              This agent is queued in the full scan. Results will appear here when its turn completes.
            </div>
          ) : null}

          {!isActiveAgentScanning && !isWaitingInFullScan && !activeDetail && !activeRun ? (
            <p className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              No scans yet. Run the {AGENT_LABELS[activeAgent].toLowerCase()} agent to generate a score and findings.
            </p>
          ) : null}

          {!isActiveAgentScanning && !isWaitingInFullScan && (activeDetail ?? activeRun) && currentConfidence === "INSUFFICIENT" ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
              Insufficient evidence in the data room for a confident {AGENT_LABELS[activeAgent].toLowerCase()} scan.
              Upload and process more documents, then re-run.
            </p>
          ) : null}

          {showResults ? (
            <>
              <AgentScoreGauge
                score={currentScore}
                label={`${AGENT_LABELS[activeAgent]} score`}
                description={
                  typeof currentOutput?.recommendation === "string" ? currentOutput.recommendation : undefined
                }
              />

              <div>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">Breakdown</h3>
                <AgentBreakdown agentType={activeAgent} output={currentOutput} />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">Findings</h3>
                <FindingsTable
                  projectId={projectId}
                  findings={currentFindings}
                  citations={currentCitations}
                />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {showHistory ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run history</CardTitle>
            <CardDescription>Past {AGENT_LABELS[activeAgent].toLowerCase()} scans for this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <AgentRunHistory projectId={projectId} runs={runs} activeAgent={activeAgent} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
