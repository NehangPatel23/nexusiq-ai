"use client";

import type { AgentType, ConfidenceLevel } from "@prisma/client";
import { Bot, History, Loader2, Play, RefreshCw, Scan, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBackgroundAnalysis } from "@/features/intelligence/hooks/use-background-analysis";
import type { AgentRunDetail, AgentRunSummary } from "@/features/intelligence/lib/agent-runs";
import {
  BACKGROUND_FULL_ANALYSIS_STEPS,
  getBackgroundAnalysisSnapshot,
  startBackgroundFullAnalysis,
  startBackgroundSpecialistsScan,
  subscribeBackgroundAnalysis,
} from "@/features/intelligence/lib/background-analysis-runner";
import type {
  ConsensusRunApiResponse,
  ConsensusRunDetail,
  ConsensusRunSummary,
} from "@/features/intelligence/lib/consensus-runs";
import {
  aggregateOpenFindingsBySeverity,
  type FindingSeverityCounts,
} from "@/features/intelligence/lib/severity-summary";
import type { ChatCitation } from "@/lib/ai/citations";
import {
  AGENT_TYPE_LABELS,
  INTELLIGENCE_AGENT_TYPES,
  SPECIALIST_AGENT_TYPES,
  type SpecialistAgentType,
} from "@/lib/ai/agents/types";
import { cn } from "@/lib/utils";

import { AgentRunHistory } from "./agent-run-history";
import { AgentScoreGauge } from "./agent-score-gauge";
import { AgentThinking } from "./agent-thinking";
import { ConsensusConflictMatrix } from "./consensus-conflict-matrix";
import { ConsensusOpinionGrid } from "./consensus-opinion-grid";
import { ConsensusRecommendation } from "./consensus-recommendation";
import { ExecutiveReportView } from "./executive-report-view";
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

type IntelligenceTab = SpecialistAgentType | "EXECUTIVE" | "CONSENSUS";

type IntelligencePageProps = {
  projectId: string;
  projectName: string;
  initialRuns: AgentRunSummary[];
  initialDetails: Partial<Record<AgentType, AgentRunDetail>>;
  initialRiskSummary: FindingSeverityCounts;
  initialConsensus: ConsensusRunDetail | null;
  initialConsensusHistory: ConsensusRunSummary[];
};

const API_SEGMENTS: Record<AgentType, string> = {
  FINANCIAL: "financial",
  LEGAL: "legal",
  COMPLIANCE: "compliance",
  RISK: "risk",
  FRAUD: "fraud",
  EXECUTIVE: "executive",
};

const FULL_ANALYSIS_TOTAL_STEPS = BACKGROUND_FULL_ANALYSIS_STEPS;

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
  if (!output || agentType === "EXECUTIVE") return null;

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

function detailToConsensusApi(detail: ConsensusRunDetail): ConsensusRunApiResponse {
  return {
    consensusRunId: detail.id,
    projectId: detail.projectId,
    status: "completed",
    finalRecommendation: detail.finalRecommendation,
    decisionConfidence: detail.decisionConfidence,
    agentOpinions: detail.agentOpinions,
    agreements: detail.agreements,
    conflicts: detail.conflicts,
    resolutionRationale: detail.resolutionRationale,
    citations: detail.citations,
    agentRunIds: detail.agentRunIds,
  };
}

export function IntelligencePage({
  projectId,
  projectName,
  initialRuns,
  initialDetails,
  initialRiskSummary,
  initialConsensus,
  initialConsensusHistory,
}: IntelligencePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backgroundAnalysis = useBackgroundAnalysis(projectId);
  const [activeTab, setActiveTab] = useState<IntelligenceTab>("FINANCIAL");
  const [runs, setRuns] = useState(initialRuns);
  const [details, setDetails] = useState(initialDetails);
  const [scanningAgents, setScanningAgents] = useState<Set<AgentType>>(() => new Set());
  const [consensusRunningLocal, setConsensusRunningLocal] = useState(false);
  const [ollamaUnavailable, setOllamaUnavailable] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const runAllTriggeredRef = useRef(false);
  const fullAnalysisTriggeredRef = useRef(false);

  const runningAll = backgroundAnalysis.status === "running" && backgroundAnalysis.mode === "specialists";
  const runningFullAnalysis = backgroundAnalysis.status === "running" && backgroundAnalysis.mode === "full";
  const runAllProgress = backgroundAnalysis.mode === "specialists" ? backgroundAnalysis.progress : 0;
  const fullAnalysisProgress = backgroundAnalysis.mode === "full" ? backgroundAnalysis.progress : 0;
  const consensusRunning = consensusRunningLocal || backgroundAnalysis.consensusRunning;
  const [consensus, setConsensus] = useState<ConsensusRunApiResponse | null>(
    initialConsensus ? detailToConsensusApi(initialConsensus) : null,
  );
  const [consensusHistory, setConsensusHistory] = useState(initialConsensusHistory);

  const completedSpecialists = useMemo(() => {
    const latest = new Map<SpecialistAgentType, AgentRunSummary>();
    for (const run of runs) {
      if (run.status !== "COMPLETED") continue;
      if (!SPECIALIST_AGENT_TYPES.includes(run.agentType as SpecialistAgentType)) continue;
      if (!latest.has(run.agentType as SpecialistAgentType)) {
        latest.set(run.agentType as SpecialistAgentType, run);
      }
    }
    return latest;
  }, [runs]);

  const missingSpecialists = useMemo(
    () => SPECIALIST_AGENT_TYPES.filter((agent) => !completedSpecialists.has(agent)),
    [completedSpecialists],
  );

  const isAgentScanning = useCallback(
    (agentType: AgentType) =>
      scanningAgents.has(agentType) || backgroundAnalysis.scanningAgents.includes(agentType),
    [scanningAgents, backgroundAnalysis.scanningAgents],
  );

  const isSpecialistTab = SPECIALIST_AGENT_TYPES.includes(activeTab as SpecialistAgentType);
  const activeAgent = isSpecialistTab || activeTab === "EXECUTIVE" ? (activeTab as AgentType) : null;
  const activeDetail = activeAgent ? details[activeAgent] : undefined;
  const isActiveAgentScanning = activeAgent ? isAgentScanning(activeAgent) : false;
  const batchRunning = runningAll || runningFullAnalysis;
  const isWaitingInFullScan =
    batchRunning &&
    activeAgent !== null &&
    activeAgent !== "EXECUTIVE" &&
    !isActiveAgentScanning &&
    activeDetail === undefined;
  const activeRun = useMemo(() => {
    if (!activeAgent || isActiveAgentScanning || batchRunning) return undefined;
    return runs.find((run) => run.agentType === activeAgent && run.status === "COMPLETED");
  }, [runs, activeAgent, isActiveAgentScanning, batchRunning]);

  const refreshRuns = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/agents/runs?limit=30`);
    const payload = (await response.json()) as ApiEnvelope<AgentRunSummary[]>;
    if (payload.success) {
      setRuns(payload.data);
      return payload.data;
    }
    return null;
  }, [projectId]);

  const refreshConsensusHistory = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/agents/consensus/runs?limit=20`);
    const payload = (await response.json()) as ApiEnvelope<ConsensusRunSummary[]>;
    if (payload.success) setConsensusHistory(payload.data);
  }, [projectId]);

  const loadRunDetail = useCallback(async (runId: string, agentType: AgentType) => {
    const response = await fetch(`/api/agent-runs/${runId}`);
    const payload = (await response.json()) as ApiEnvelope<AgentRunDetail>;
    if (payload.success) {
      setDetails((current) => ({ ...current, [agentType]: payload.data }));
    }
  }, []);

  const loadConsensusDetail = useCallback(async (consensusRunId: string) => {
    const response = await fetch(`/api/consensus-runs/${consensusRunId}`);
    const payload = (await response.json()) as ApiEnvelope<ConsensusRunDetail>;
    if (payload.success) {
      setConsensus(detailToConsensusApi(payload.data));
    }
  }, []);

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
    ): Promise<"completed" | "failed" | "ollama_unavailable"> => {
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
            return "ollama_unavailable";
          }
          toast.error(payload.error.message);
          return "failed";
        }

        if (payload.data.status === "failed") {
          toast.error(payload.data.error ?? "Agent scan failed.");
          const latestRuns = await refreshRuns();
          const previousCompleted = latestRuns?.find(
            (run) =>
              run.agentType === agentType &&
              run.status === "COMPLETED" &&
              run.id !== payload.data.runId,
          );
          // Prefer restoring a prior successful result so the tab isn't blank.
          // If none exists, load the failed run so the UI can show the error.
          await loadRunDetail(previousCompleted?.id ?? payload.data.runId, agentType);
          if (!options?.skipRouterRefresh) {
            router.refresh();
          }
          return "failed";
        }

        toast.success(`${AGENT_TYPE_LABELS[agentType]} scan completed.`);
        await refreshRuns();
        await loadRunDetail(payload.data.runId, agentType);
        if (!options?.skipRouterRefresh) {
          router.refresh();
        }
        return "completed";
      } catch {
        toast.error("Agent scan could not be started.");
        return "failed";
      } finally {
        endAgentScan(agentType);
      }
    },
    [projectId, refreshRuns, loadRunDetail, beginAgentScan, endAgentScan, router],
  );

  const runConsensus = useCallback(
    async (
      force = false,
      options?: { skipRouterRefresh?: boolean },
    ): Promise<"completed" | "failed" | "ollama_unavailable"> => {
      setConsensusRunningLocal(true);
      setOllamaUnavailable(false);
      try {
        const response = await fetch(`/api/projects/${projectId}/agents/consensus/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        const payload = (await response.json()) as ApiEnvelope<ConsensusRunApiResponse>;

        if (!payload.success) {
          if (payload.error.code === "OLLAMA_UNAVAILABLE") {
            setOllamaUnavailable(true);
            toast.error(payload.error.message);
            return "ollama_unavailable";
          }
          toast.error(payload.error.message);
          return "failed";
        }

        setConsensus(payload.data);
        await refreshConsensusHistory();
        toast.success("Consensus synthesis completed.");
        if (!options?.skipRouterRefresh) {
          router.refresh();
        }
        return "completed";
      } catch {
        toast.error("Consensus could not be started.");
        return "failed";
      } finally {
        setConsensusRunningLocal(false);
      }
    },
    [projectId, refreshConsensusHistory, router],
  );

  const runAllAgents = useCallback(() => {
    if (backgroundAnalysis.status === "running") return;
    setDetails({});
    setOllamaUnavailable(false);
    startBackgroundSpecialistsScan(projectId);
  }, [backgroundAnalysis.status, projectId]);

  const runFullAnalysis = useCallback(() => {
    if (backgroundAnalysis.status === "running") return;
    setDetails({});
    setConsensus(null);
    setOllamaUnavailable(false);
    startBackgroundFullAnalysis(projectId);
  }, [backgroundAnalysis.status, projectId]);

  useEffect(() => {
    const onUpdate = (
      snapshot: ReturnType<typeof getBackgroundAnalysisSnapshot>,
      event: Parameters<Parameters<typeof subscribeBackgroundAnalysis>[1]>[1],
    ) => {
      if (snapshot.ollamaUnavailable) {
        setOllamaUnavailable(true);
      }

      if (snapshot.suggestedTab && snapshot.status === "running") {
        setActiveTab(snapshot.suggestedTab);
      }

      if (!event) {
        if (snapshot.status === "running") {
          void refreshRuns();
          for (const [agentType, runId] of Object.entries(snapshot.completedRuns) as Array<
            [AgentType, string]
          >) {
            void loadRunDetail(runId, agentType);
          }
          if (snapshot.consensus) {
            setConsensus(snapshot.consensus);
          }
        }
        return;
      }

      if (event.type === "started") {
        setDetails({});
        if (event.mode === "full") setConsensus(null);
        setOllamaUnavailable(false);
        return;
      }

      if (event.type === "agent_started") {
        beginAgentScan(event.agentType);
        setActiveTab(event.agentType);
        return;
      }

      if (event.type === "agent_completed") {
        endAgentScan(event.agentType);
        void refreshRuns().then(() => loadRunDetail(event.runId, event.agentType));
        toast.success(`${AGENT_TYPE_LABELS[event.agentType]} scan completed.`);
        return;
      }

      if (event.type === "agent_failed") {
        endAgentScan(event.agentType);
        if (event.ollama) {
          setOllamaUnavailable(true);
          toast.error("Ollama is unavailable.");
          return;
        }
        toast.error(`${AGENT_TYPE_LABELS[event.agentType]} scan failed.`);
        if (event.runId) {
          void refreshRuns().then(async (latestRuns) => {
            const previousCompleted = latestRuns?.find(
              (run) =>
                run.agentType === event.agentType &&
                run.status === "COMPLETED" &&
                run.id !== event.runId,
            );
            await loadRunDetail(previousCompleted?.id ?? event.runId!, event.agentType);
          });
        } else {
          void refreshRuns();
        }
        return;
      }

      if (event.type === "consensus_started") {
        setActiveTab("CONSENSUS");
        return;
      }

      if (event.type === "consensus_completed") {
        setConsensus(event.data);
        void refreshConsensusHistory();
        toast.success("Consensus synthesis completed.");
        return;
      }

      if (event.type === "consensus_failed") {
        if (event.ollama) {
          setOllamaUnavailable(true);
          toast.error("Ollama is unavailable.");
        } else {
          toast.error("Consensus could not be completed.");
        }
        return;
      }

      if (event.type === "finished") {
        void refreshRuns();
        void refreshConsensusHistory();
        router.refresh();
        for (const [agentType, runId] of Object.entries(snapshot.completedRuns) as Array<
          [AgentType, string]
        >) {
          void loadRunDetail(runId, agentType);
        }
        if (snapshot.consensus) {
          setConsensus(snapshot.consensus);
        }
      }
    };

    const unsubscribe = subscribeBackgroundAnalysis(projectId, onUpdate);
    // Initial sync after subscribe (must not run inside subscribe — breaks useSyncExternalStore).
    onUpdate(getBackgroundAnalysisSnapshot(projectId), null);
    return unsubscribe;
  }, [
    projectId,
    beginAgentScan,
    endAgentScan,
    refreshRuns,
    loadRunDetail,
    refreshConsensusHistory,
    router,
  ]);

  useEffect(() => {
    const fullAnalysis = searchParams.get("fullAnalysis");
    if (fullAnalysis === "1" && !fullAnalysisTriggeredRef.current) {
      fullAnalysisTriggeredRef.current = true;
      router.replace(`/dashboard/projects/${projectId}/intelligence`);
      runFullAnalysis();
      return;
    }

    const runAll = searchParams.get("runAll");
    if (runAll !== "1" || runAllTriggeredRef.current) return;
    runAllTriggeredRef.current = true;
    router.replace(`/dashboard/projects/${projectId}/intelligence`);
    runAllAgents();
  }, [searchParams, runAllAgents, runFullAnalysis, router, projectId]);

  useEffect(() => {
    const runId = searchParams.get("run");
    if (!runId) return;
    const run = runs.find((item) => item.id === runId);
    if (run) {
      setActiveTab(run.agentType === "EXECUTIVE" ? "EXECUTIVE" : run.agentType);
      void loadRunDetail(run.id, run.agentType);
    }
  }, [searchParams, runs, loadRunDetail]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "consensus") setActiveTab("CONSENSUS");
    if (tab === "executive") setActiveTab("EXECUTIVE");
    const consensusId = searchParams.get("consensus");
    if (consensusId) {
      setActiveTab("CONSENSUS");
      void loadConsensusDetail(consensusId);
    }
  }, [searchParams, loadConsensusDetail]);

  const anyScanInProgress =
    scanningAgents.size > 0 ||
    backgroundAnalysis.scanningAgents.length > 0 ||
    runningAll ||
    runningFullAnalysis ||
    consensusRunning;

  const riskSummary = useMemo(() => {
    const detailList = INTELLIGENCE_AGENT_TYPES.map((agent) => details[agent]);
    const hasAnyDetail = detailList.some(Boolean);

    // During a re-run, never fall back to the stale server snapshot from page load.
    // Aggregate only from details present in client state (often empty at batch start).
    if (anyScanInProgress) {
      return aggregateOpenFindingsBySeverity(detailList);
    }

    return hasAnyDetail ? aggregateOpenFindingsBySeverity(detailList) : initialRiskSummary;
  }, [details, initialRiskSummary, anyScanInProgress]);

  const showResults =
    activeAgent !== null &&
    !isActiveAgentScanning &&
    !isWaitingInFullScan &&
    Boolean(activeDetail) &&
    activeDetail?.status === "COMPLETED";
  const showFailedResult =
    activeAgent !== null &&
    !isActiveAgentScanning &&
    !isWaitingInFullScan &&
    activeDetail?.status === "FAILED";
  const currentFindings = showResults ? (activeDetail?.findings ?? []) : [];
  const currentCitations = showResults ? (activeDetail?.citations ?? []) : [];
  const currentOutput = showResults ? (activeDetail?.output ?? null) : null;
  const currentScore = showResults ? (activeDetail?.score ?? null) : null;
  const currentConfidence = showResults ? (activeDetail?.confidence ?? null) : null;

  const fullAnalysisStepLabel = useMemo(() => {
    if (runningFullAnalysis && backgroundAnalysis.currentStepLabel) {
      return backgroundAnalysis.currentStepLabel;
    }
    if (fullAnalysisProgress < SPECIALIST_AGENT_TYPES.length) {
      return AGENT_TYPE_LABELS[
        SPECIALIST_AGENT_TYPES[Math.min(fullAnalysisProgress, SPECIALIST_AGENT_TYPES.length - 1)] ??
          "FINANCIAL"
      ];
    }
    if (fullAnalysisProgress === SPECIALIST_AGENT_TYPES.length) return "Consensus";
    return "Executive";
  }, [fullAnalysisProgress, runningFullAnalysis, backgroundAnalysis.currentStepLabel]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold tracking-tight">Intelligence Agents</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Run specialist scans, executive synthesis, and explainable consensus on {projectName}.
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
          <Button
            type="button"
            disabled={anyScanInProgress}
            onClick={() => void runFullAnalysis()}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Full analysis
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowHistory((value) => !value)}>
            <History className="h-4 w-4" aria-hidden="true" />
            Run history
          </Button>
        </div>
      </div>

      <ProjectRiskSummary counts={riskSummary} refreshing={anyScanInProgress} />

      {runningAll ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <AgentThinking label={`Running specialist scan (${runAllProgress}/${INTELLIGENCE_AGENT_TYPES.length})`} />
            <span className="text-sm text-muted-foreground">
              {
                AGENT_TYPE_LABELS[
                  INTELLIGENCE_AGENT_TYPES[
                    Math.min(runAllProgress, INTELLIGENCE_AGENT_TYPES.length - 1)
                  ] ?? "FINANCIAL"
                ]
              }
            </span>
          </CardContent>
        </Card>
      ) : null}

      {runningFullAnalysis ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <AgentThinking
              label={`Step ${Math.min(fullAnalysisProgress + (anyScanInProgress ? 1 : 0), FULL_ANALYSIS_TOTAL_STEPS)}/${FULL_ANALYSIS_TOTAL_STEPS}: ${fullAnalysisStepLabel}`}
            />
          </CardContent>
        </Card>
      ) : null}

      {ollamaUnavailable ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            Ollama is unavailable. Intelligence synthesis requires a reachable Ollama endpoint configured on the
            server.
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Intelligence agents">
        {INTELLIGENCE_AGENT_TYPES.map((agent) => {
          const scanning = isAgentScanning(agent);
          const agentDetail = details[agent];
          const waitingInFullScan = batchRunning && !scanning && agentDetail === undefined;
          const latest =
            !batchRunning && !scanning
              ? runs.find((run) => run.agentType === agent && run.status === "COMPLETED")
              : undefined;
          const tabScore =
            agentDetail?.score !== null && agentDetail?.score !== undefined
              ? agentDetail.score
              : !batchRunning && latest?.score !== null && latest?.score !== undefined
                ? latest.score
                : null;

          return (
            <button
              key={agent}
              type="button"
              role="tab"
              aria-selected={activeTab === agent}
              aria-busy={scanning || waitingInFullScan}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                activeTab === agent
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
                (scanning || waitingInFullScan) && "border-primary/40",
              )}
              onClick={() => setActiveTab(agent)}
            >
              {AGENT_TYPE_LABELS[agent]}
              {scanning ? (
                <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-primary" aria-hidden="true" />
              ) : tabScore !== null ? (
                <span className="tabular-nums text-xs text-muted-foreground">{Math.round(tabScore)}</span>
              ) : null}
            </button>
          );
        })}

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "EXECUTIVE"}
          aria-busy={isAgentScanning("EXECUTIVE")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
            activeTab === "EXECUTIVE"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border/60 text-muted-foreground hover:text-foreground",
            isAgentScanning("EXECUTIVE") && "border-primary/40",
          )}
          onClick={() => setActiveTab("EXECUTIVE")}
        >
          Executive
          {isAgentScanning("EXECUTIVE") ? (
            <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-primary" aria-hidden="true" />
          ) : null}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "CONSENSUS"}
          aria-busy={consensusRunning}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
            activeTab === "CONSENSUS"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border/60 text-muted-foreground hover:text-foreground",
            consensusRunning && "border-primary/40",
          )}
          onClick={() => setActiveTab("CONSENSUS")}
        >
          Consensus
          {consensusRunning ? (
            <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-primary" aria-hidden="true" />
          ) : null}
        </button>
      </div>

      {activeTab === "CONSENSUS" ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Consensus</CardTitle>
              <CardDescription>
                {consensus
                  ? `Last synthesis ${new Date(
                      consensusHistory.find((item) => item.id === consensus.consensusRunId)?.createdAt ??
                        Date.now(),
                    ).toLocaleString()}`
                  : "Explainable multi-agent recommendation"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {consensusHistory.length > 0 ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  History
                  <select
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                    aria-label="Consensus run history"
                    value={consensus?.consensusRunId ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value) void loadConsensusDetail(value);
                    }}
                  >
                    {consensusHistory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {new Date(item.createdAt).toLocaleString()} · {item.decisionConfidence}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Button
                type="button"
                disabled={consensusRunning || batchRunning || completedSpecialists.size < 3}
                onClick={() => void runConsensus(true)}
              >
                {consensusRunning ? (
                  <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )}
                {consensusRunning ? "Running consensus…" : consensus ? "Re-run consensus" : "Run consensus"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {completedSpecialists.size < 3 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
                Run at least 3 specialist agents before consensus
                {missingSpecialists.length > 0
                  ? ` (still needed: ${missingSpecialists.map((agent) => AGENT_TYPE_LABELS[agent]).join(", ")})`
                  : ""}
                .
              </div>
            ) : null}

            {consensusRunning ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                <AgentThinking label="Synthesizing consensus across specialist opinions" />
              </div>
            ) : null}

            {!consensusRunning && !consensus ? (
              <p className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                No consensus yet. Complete specialist scans, then run consensus to see per-agent opinions before the
                final recommendation.
              </p>
            ) : null}

            {!consensusRunning && consensus ? (
              <>
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">Agent opinions</h3>
                  <ConsensusOpinionGrid opinions={consensus.agentOpinions} />
                </div>

                <ConsensusConflictMatrix
                  agreements={consensus.agreements}
                  conflicts={consensus.conflicts}
                />

                <ConsensusRecommendation
                  projectId={projectId}
                  finalRecommendation={consensus.finalRecommendation}
                  decisionConfidence={consensus.decisionConfidence}
                  resolutionRationale={consensus.resolutionRationale}
                  citations={consensus.citations}
                />
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>
                {activeAgent ? `${AGENT_TYPE_LABELS[activeAgent]} agent` : "Agent"}
              </CardTitle>
              <CardDescription>
                {isActiveAgentScanning
                  ? "Assessment in progress…"
                  : isWaitingInFullScan
                    ? "Queued in full scan…"
                    : showFailedResult
                      ? `Failed ${new Date(activeDetail!.completedAt ?? activeDetail!.startedAt).toLocaleString()}`
                      : activeDetail?.status === "COMPLETED"
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
              {activeAgent ? (
                <Button
                  type="button"
                  disabled={isActiveAgentScanning || batchRunning}
                  onClick={() => void runAgent(activeAgent, true)}
                >
                  {isActiveAgentScanning ? (
                    <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isActiveAgentScanning
                    ? "Running…"
                    : activeAgent === "EXECUTIVE"
                      ? activeRun
                        ? "Re-run executive package"
                        : "Run executive package"
                      : activeRun
                        ? "Re-run scan"
                        : "Run scan"}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isActiveAgentScanning ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
                <AgentThinking
                  label={
                    activeAgent === "EXECUTIVE"
                      ? "Preparing executive decision package"
                      : `Running ${AGENT_TYPE_LABELS[activeAgent!].toLowerCase()} assessment`
                  }
                />
                <p className="mt-3 text-sm text-muted-foreground">
                  Previous results are hidden until this scan completes.
                </p>
              </div>
            ) : null}

            {isWaitingInFullScan ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                This agent is queued in the full analysis. Results will appear here when its turn completes.
              </div>
            ) : null}

            {showFailedResult ? (
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  {AGENT_TYPE_LABELS[activeAgent!]} scan failed
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeDetail?.error?.trim() ||
                    "The model returned an invalid response. Re-run the scan to try again."}
                </p>
                {activeRun ? (
                  <p className="text-xs text-muted-foreground">
                    A previous completed run is still available in history — switch away and back after a
                    successful re-run, or open Run history.
                  </p>
                ) : null}
              </div>
            ) : null}

            {!isActiveAgentScanning && !isWaitingInFullScan && !activeDetail && !activeRun ? (
              <p className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                {activeAgent === "EXECUTIVE"
                  ? "No executive package yet. Run the executive agent to synthesize a Markdown decision report."
                  : `No scans yet. Run the ${AGENT_TYPE_LABELS[activeAgent!].toLowerCase()} agent to generate a score and findings.`}
              </p>
            ) : null}

            {!isActiveAgentScanning &&
            !isWaitingInFullScan &&
            (activeDetail ?? activeRun) &&
            currentConfidence === "INSUFFICIENT" ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
                Insufficient evidence in the data room for a confident{" "}
                {AGENT_TYPE_LABELS[activeAgent!].toLowerCase()} package. Upload and process more documents, then
                re-run.
              </p>
            ) : null}

            {showResults && activeAgent === "EXECUTIVE" ? (
              <>
                <AgentScoreGauge
                  score={currentScore}
                  label="Executive composite score"
                  description={
                    typeof currentOutput?.recommendation === "string"
                      ? currentOutput.recommendation
                      : undefined
                  }
                />
                <ExecutiveReportView
                  projectId={projectId}
                  markdown={
                    typeof currentOutput?.markdown === "string"
                      ? currentOutput.markdown
                      : typeof currentOutput?.executiveSummary === "string"
                        ? currentOutput.executiveSummary
                        : ""
                  }
                  citations={currentCitations}
                  specialistRunIds={
                    Array.isArray(currentOutput?.specialistRunIds)
                      ? (currentOutput?.specialistRunIds as string[])
                      : []
                  }
                  specialistContext={
                    Array.isArray(currentOutput?.specialistContext)
                      ? (currentOutput.specialistContext as Array<{
                          agentType: string;
                          runId: string;
                          score: number | null;
                          confidence: string;
                          recommendation: string;
                        }>)
                      : []
                  }
                />
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">Priority actions</h3>
                  <FindingsTable
                    projectId={projectId}
                    findings={currentFindings}
                    citations={currentCitations}
                  />
                </div>
              </>
            ) : null}

            {showResults && activeAgent && activeAgent !== "EXECUTIVE" ? (
              <>
                <AgentScoreGauge
                  score={currentScore}
                  label={`${AGENT_TYPE_LABELS[activeAgent]} score`}
                  description={
                    typeof currentOutput?.recommendation === "string"
                      ? currentOutput.recommendation
                      : undefined
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
      )}

      {showHistory && activeAgent ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run history</CardTitle>
            <CardDescription>
              Past {AGENT_TYPE_LABELS[activeAgent].toLowerCase()} scans for this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentRunHistory projectId={projectId} runs={runs} activeAgent={activeAgent} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
