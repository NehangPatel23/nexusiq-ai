import type { AgentType, ConfidenceLevel } from "@prisma/client";
import { toast } from "sonner";

import type { ConsensusRunApiResponse } from "@/features/intelligence/lib/consensus-runs";
import type { ChatCitation } from "@/lib/ai/citations";
import {
  AGENT_TYPE_LABELS,
  INTELLIGENCE_AGENT_TYPES,
  SPECIALIST_AGENT_TYPES,
  type SpecialistAgentType,
} from "@/lib/ai/agents/types";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type RunResponse = {
  runId: string;
  agentType: AgentType;
  status: "completed" | "failed";
  score?: number;
  confidence: ConfidenceLevel;
  findings: unknown[];
  citations: ChatCitation[];
  output: Record<string, unknown> | null;
  error?: string;
};

export type BackgroundAnalysisMode = "full" | "specialists";

export type BackgroundAnalysisTab = SpecialistAgentType | "EXECUTIVE" | "CONSENSUS";

export type BackgroundAnalysisEvent =
  | { type: "started"; mode: BackgroundAnalysisMode }
  | { type: "agent_started"; agentType: AgentType }
  | {
      type: "agent_completed";
      agentType: AgentType;
      runId: string;
      restoredPrevious?: boolean;
    }
  | { type: "agent_failed"; agentType: AgentType; runId?: string; ollama?: boolean }
  | { type: "consensus_started" }
  | { type: "consensus_completed"; data: ConsensusRunApiResponse }
  | { type: "consensus_failed"; ollama?: boolean }
  | {
      type: "finished";
      mode: BackgroundAnalysisMode;
      outcome: "success" | "partial" | "ollama" | "failed";
      message: string;
      intelligenceHref: string;
      toastTone: "success" | "error" | "message";
    };

export type BackgroundAnalysisSnapshot = {
  projectId: string;
  mode: BackgroundAnalysisMode | null;
  status: "idle" | "running";
  progress: number;
  totalSteps: number;
  currentStepLabel: string;
  currentAgent: AgentType | "CONSENSUS" | null;
  scanningAgents: AgentType[];
  consensusRunning: boolean;
  ollamaUnavailable: boolean;
  suggestedTab: BackgroundAnalysisTab | null;
  completedRuns: Partial<Record<AgentType, string>>;
  consensus: ConsensusRunApiResponse | null;
  lastEvent: BackgroundAnalysisEvent | null;
};

const API_SEGMENTS: Record<AgentType, string> = {
  FINANCIAL: "financial",
  LEGAL: "legal",
  COMPLIANCE: "compliance",
  RISK: "risk",
  FRAUD: "fraud",
  EXECUTIVE: "executive",
};

const FULL_ANALYSIS_TOTAL_STEPS = SPECIALIST_AGENT_TYPES.length + 2;
const SPECIALISTS_TOTAL_STEPS = INTELLIGENCE_AGENT_TYPES.length;

type JobState = {
  generation: number;
  /** Stable reference for useSyncExternalStore — replaced only when state changes. */
  snapshot: BackgroundAnalysisSnapshot;
};

type Listener = (snapshot: BackgroundAnalysisSnapshot, event: BackgroundAnalysisEvent | null) => void;

const jobs = new Map<string, JobState>();
const listeners = new Map<string, Set<Listener>>();

function idleSnapshot(projectId: string): BackgroundAnalysisSnapshot {
  return {
    projectId,
    mode: null,
    status: "idle",
    progress: 0,
    totalSteps: 0,
    currentStepLabel: "",
    currentAgent: null,
    scanningAgents: [],
    consensusRunning: false,
    ollamaUnavailable: false,
    suggestedTab: null,
    completedRuns: {},
    consensus: null,
    lastEvent: null,
  };
}

function getOrCreateJob(projectId: string): JobState {
  const existing = jobs.get(projectId);
  if (existing) return existing;
  const created: JobState = { generation: 0, snapshot: idleSnapshot(projectId) };
  jobs.set(projectId, created);
  return created;
}

function emit(projectId: string, event: BackgroundAnalysisEvent | null) {
  const job = getOrCreateJob(projectId);
  if (event) {
    job.snapshot = { ...job.snapshot, lastEvent: event };
  }
  const snapshot = job.snapshot;
  const projectListeners = listeners.get(projectId);
  if (!projectListeners) return;
  for (const listener of projectListeners) {
    listener(snapshot, event);
  }
}

function patch(
  projectId: string,
  updates: Partial<BackgroundAnalysisSnapshot>,
  event: BackgroundAnalysisEvent | null = null,
) {
  const job = getOrCreateJob(projectId);
  job.snapshot = {
    ...job.snapshot,
    ...updates,
    ...(event ? { lastEvent: event } : {}),
  };
  emit(projectId, event);
}

function stepLabelFor(mode: BackgroundAnalysisMode, progress: number, current: AgentType | "CONSENSUS" | null) {
  if (current === "CONSENSUS") return "Consensus";
  if (current) return AGENT_TYPE_LABELS[current];
  if (mode === "full") {
    if (progress < SPECIALIST_AGENT_TYPES.length) {
      const agent = SPECIALIST_AGENT_TYPES[Math.min(progress, SPECIALIST_AGENT_TYPES.length - 1)];
      return AGENT_TYPE_LABELS[agent];
    }
    if (progress === SPECIALIST_AGENT_TYPES.length) return "Consensus";
    return "Executive";
  }
  const agent = INTELLIGENCE_AGENT_TYPES[Math.min(progress, INTELLIGENCE_AGENT_TYPES.length - 1)];
  return AGENT_TYPE_LABELS[agent];
}

async function postAgentRun(
  projectId: string,
  agentType: AgentType,
  force: boolean,
): Promise<
  | { kind: "completed"; runId: string }
  | { kind: "failed"; runId?: string; message?: string }
  | { kind: "ollama" }
  | { kind: "error"; message: string }
> {
  try {
    const response = await fetch(`/api/projects/${projectId}/agents/${API_SEGMENTS[agentType]}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<RunResponse> | null;
    if (!payload || typeof payload !== "object") {
      return {
        kind: "error",
        message: `${AGENT_TYPE_LABELS[agentType]} scan failed (HTTP ${response.status}). The request may have timed out on the server.`,
      };
    }
    if (!payload.success) {
      if (payload.error.code === "OLLAMA_UNAVAILABLE") return { kind: "ollama" };
      return { kind: "error", message: payload.error.message };
    }
    if (payload.data.status === "failed") {
      return {
        kind: "failed",
        runId: payload.data.runId,
        message: payload.data.error ?? `${AGENT_TYPE_LABELS[agentType]} scan failed.`,
      };
    }
    return { kind: "completed", runId: payload.data.runId };
  } catch {
    return { kind: "error", message: "Agent scan could not be started." };
  }
}

async function postConsensusRun(
  projectId: string,
  force: boolean,
  agentRunIds?: string[],
): Promise<
  | { kind: "completed"; data: ConsensusRunApiResponse }
  | { kind: "failed"; message?: string }
  | { kind: "ollama" }
  | { kind: "error"; message: string }
> {
  try {
    const response = await fetch(`/api/projects/${projectId}/agents/consensus/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force, agentRunIds }),
    });
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<ConsensusRunApiResponse> | null;
    if (!payload || typeof payload !== "object") {
      return {
        kind: "error",
        message: `Consensus failed (HTTP ${response.status}). The request may have timed out on the server.`,
      };
    }
    if (!payload.success) {
      if (payload.error.code === "OLLAMA_UNAVAILABLE") return { kind: "ollama" };
      return { kind: "error", message: payload.error.message };
    }
    return { kind: "completed", data: payload.data };
  } catch {
    return { kind: "error", message: "Consensus could not be started." };
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postAgentRunWithRetry(
  projectId: string,
  agentType: AgentType,
  force: boolean,
): Promise<Awaited<ReturnType<typeof postAgentRun>>> {
  const first = await postAgentRun(projectId, agentType, force);
  if (first.kind === "completed" || first.kind === "ollama") return first;
  await sleep(1_500);
  return postAgentRun(projectId, agentType, force);
}

async function postConsensusRunWithRetry(
  projectId: string,
  force: boolean,
  agentRunIds?: string[],
): Promise<Awaited<ReturnType<typeof postConsensusRun>>> {
  const first = await postConsensusRun(projectId, force, agentRunIds);
  if (first.kind === "completed" || first.kind === "ollama") return first;
  await sleep(1_500);
  return postConsensusRun(projectId, force, agentRunIds);
}

async function notifyAnalysisFinished(input: {
  projectId: string;
  mode: BackgroundAnalysisMode;
  outcome: "success" | "partial" | "failed" | "ollama";
  title: string;
  body: string;
  tab?: "consensus" | "executive";
}) {
  try {
    await fetch(`/api/projects/${input.projectId}/agents/full-analysis/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: input.mode,
        outcome: input.outcome,
        title: input.title,
        body: input.body,
        tab: input.tab,
      }),
    });
    window.dispatchEvent(new CustomEvent("nexusiq:notifications-changed"));
  } catch {
    // Notification is best-effort; analysis results are already persisted.
  }
}

function intelligenceHref(projectId: string, tab?: "consensus" | "executive") {
  const base = `/dashboard/projects/${projectId}/intelligence`;
  return tab ? `${base}?tab=${tab}` : base;
}

export function getBackgroundAnalysisSnapshot(projectId: string): BackgroundAnalysisSnapshot {
  return getOrCreateJob(projectId).snapshot;
}

export function isBackgroundAnalysisRunning(projectId: string): boolean {
  return getOrCreateJob(projectId).snapshot.status === "running";
}

export function subscribeBackgroundAnalysis(projectId: string, listener: Listener): () => void {
  let set = listeners.get(projectId);
  if (!set) {
    set = new Set();
    listeners.set(projectId, set);
  }
  set.add(listener);
  // Do not call listener synchronously — useSyncExternalStore forbids that
  // and it causes "Maximum update depth exceeded" with unstable snapshots.
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) listeners.delete(projectId);
  };
}

export function startBackgroundSpecialistsScan(projectId: string): boolean {
  const job = getOrCreateJob(projectId);
  if (job.snapshot.status === "running") return false;

  job.generation += 1;
  const generation = job.generation;

  patch(
    projectId,
    {
      ...idleSnapshot(projectId),
      mode: "specialists",
      status: "running",
      progress: 0,
      totalSteps: SPECIALISTS_TOTAL_STEPS,
      currentStepLabel: AGENT_TYPE_LABELS.FINANCIAL,
      currentAgent: "FINANCIAL",
      suggestedTab: "FINANCIAL",
    },
    { type: "started", mode: "specialists" },
  );

  void (async () => {
    let completed = 0;

    for (let index = 0; index < INTELLIGENCE_AGENT_TYPES.length; index += 1) {
      if (getOrCreateJob(projectId).generation !== generation) return;

      const agentType = INTELLIGENCE_AGENT_TYPES[index];
      patch(
        projectId,
        {
          currentAgent: agentType,
          suggestedTab: agentType,
          currentStepLabel: AGENT_TYPE_LABELS[agentType],
          scanningAgents: [agentType],
          ollamaUnavailable: false,
        },
        { type: "agent_started", agentType },
      );

      const result = await postAgentRunWithRetry(projectId, agentType, true);
      if (getOrCreateJob(projectId).generation !== generation) return;

      if (result.kind === "completed") {
        completed += 1;
        const completedRuns = {
          ...getOrCreateJob(projectId).snapshot.completedRuns,
          [agentType]: result.runId,
        };
        patch(
          projectId,
          {
            progress: index + 1,
            scanningAgents: [],
            completedRuns,
            currentStepLabel: stepLabelFor("specialists", index + 1, null),
          },
          { type: "agent_completed", agentType, runId: result.runId },
        );
        continue;
      }

      if (result.kind === "ollama") {
        patch(
          projectId,
          { scanningAgents: [], ollamaUnavailable: true, progress: index + 1 },
          { type: "agent_failed", agentType, ollama: true },
        );
        // If we already have results, finish partial — otherwise stop hard.
        if (completed === 0) {
          await finishJob(projectId, generation, {
            mode: "specialists",
            outcome: "ollama",
            message: "Specialist scan stopped — Ollama is unavailable.",
            toastTone: "error",
            title: "Specialist scan stopped",
            body: "Ollama is unavailable. Open Intelligence to retry when the model server is back.",
            notifyOutcome: "ollama",
          });
          return;
        }
        break;
      }

      patch(
        projectId,
        { scanningAgents: [], progress: index + 1 },
        { type: "agent_failed", agentType, runId: result.kind === "failed" ? result.runId : undefined },
      );
      // Continue remaining specialists so one timeout does not abort the rest.
    }

    if (getOrCreateJob(projectId).generation !== generation) return;

    if (completed === INTELLIGENCE_AGENT_TYPES.length) {
      await finishJob(projectId, generation, {
        mode: "specialists",
        outcome: "success",
        message: "Specialist intelligence scan finished.",
        toastTone: "success",
        title: "Specialist scan ready",
        body: "All specialist agents finished. Open Intelligence to review scores and findings.",
        notifyOutcome: "success",
      });
      return;
    }

    if (completed > 0) {
      await finishJob(projectId, generation, {
        mode: "specialists",
        outcome: "partial",
        message: "Specialist scan stopped early. Completed agents were updated.",
        toastTone: "message",
        title: "Specialist scan partially finished",
        body: "Some specialist agents completed. Open Intelligence to review progress and re-run the rest.",
        notifyOutcome: "partial",
      });
      return;
    }

    await finishJob(projectId, generation, {
      mode: "specialists",
      outcome: "failed",
      message: "Specialist scan could not complete.",
      toastTone: "error",
      title: "Specialist scan failed",
      body: "Open Intelligence to retry the specialist agents.",
      notifyOutcome: "failed",
    });
  })();

  return true;
}

export function startBackgroundFullAnalysis(projectId: string): boolean {
  const job = getOrCreateJob(projectId);
  if (job.snapshot.status === "running") return false;

  job.generation += 1;
  const generation = job.generation;

  patch(
    projectId,
    {
      ...idleSnapshot(projectId),
      mode: "full",
      status: "running",
      progress: 0,
      totalSteps: FULL_ANALYSIS_TOTAL_STEPS,
      currentStepLabel: AGENT_TYPE_LABELS.FINANCIAL,
      currentAgent: "FINANCIAL",
      suggestedTab: "FINANCIAL",
    },
    { type: "started", mode: "full" },
  );

  void (async () => {
    let step = 0;
    let specialistsCompleted = 0;
    let stoppedForOllama = false;
    const failedAgents: string[] = [];

    for (const agentType of SPECIALIST_AGENT_TYPES) {
      if (getOrCreateJob(projectId).generation !== generation) return;

      patch(
        projectId,
        {
          currentAgent: agentType,
          suggestedTab: agentType,
          currentStepLabel: AGENT_TYPE_LABELS[agentType],
          scanningAgents: [agentType],
          ollamaUnavailable: false,
        },
        { type: "agent_started", agentType },
      );

      const result = await postAgentRunWithRetry(projectId, agentType, true);
      if (getOrCreateJob(projectId).generation !== generation) return;

      step += 1;

      if (result.kind === "completed") {
        specialistsCompleted += 1;
        const completedRuns = {
          ...getOrCreateJob(projectId).snapshot.completedRuns,
          [agentType]: result.runId,
        };
        patch(
          projectId,
          {
            progress: step,
            scanningAgents: [],
            completedRuns,
            currentStepLabel: stepLabelFor("full", step, null),
          },
          { type: "agent_completed", agentType, runId: result.runId },
        );
        continue;
      }

      if (result.kind === "ollama") {
        failedAgents.push(AGENT_TYPE_LABELS[agentType]);
        patch(
          projectId,
          { scanningAgents: [], ollamaUnavailable: true, progress: step },
          { type: "agent_failed", agentType, ollama: true },
        );
        // Already have enough specialists for consensus — stop calling Ollama for more
        // specialists but still proceed to consensus/executive with completed runs.
        if (specialistsCompleted >= 3) {
          break;
        }
        stoppedForOllama = true;
        break;
      }

      failedAgents.push(AGENT_TYPE_LABELS[agentType]);
      patch(
        projectId,
        { scanningAgents: [], progress: step },
        { type: "agent_failed", agentType, runId: result.kind === "failed" ? result.runId : undefined },
      );
    }

    if (getOrCreateJob(projectId).generation !== generation) return;

    let consensusOk = false;
    let executiveOk = false;
    let consensusFailed = false;
    let executiveFailed = false;
    let finishTab: "consensus" | "executive" | undefined;
    let consensusErrorMessage: string | undefined;
    let executiveErrorMessage: string | undefined;

    // Prefer completing the pipeline whenever we meet the ≥3 specialist prerequisite,
    // even if a later specialist hit an Ollama blip.
    if (specialistsCompleted >= 3) {
      const specialistRunIds = SPECIALIST_AGENT_TYPES.map(
        (agentType) => getOrCreateJob(projectId).snapshot.completedRuns[agentType],
      ).filter((id): id is string => Boolean(id));

      patch(
        projectId,
        {
          currentAgent: "CONSENSUS",
          suggestedTab: "CONSENSUS",
          currentStepLabel: "Consensus",
          consensusRunning: true,
          scanningAgents: [],
          ollamaUnavailable: false,
        },
        { type: "consensus_started" },
      );

      const consensusResult = await postConsensusRunWithRetry(projectId, true, specialistRunIds);
      if (getOrCreateJob(projectId).generation !== generation) return;

      step += 1;

      if (consensusResult.kind === "completed") {
        consensusOk = true;
        finishTab = "consensus";
        stoppedForOllama = false;
        patch(
          projectId,
          {
            progress: step,
            consensusRunning: false,
            consensus: consensusResult.data,
            currentStepLabel: "Executive",
          },
          { type: "consensus_completed", data: consensusResult.data },
        );

        patch(
          projectId,
          {
            currentAgent: "EXECUTIVE",
            suggestedTab: "EXECUTIVE",
            currentStepLabel: AGENT_TYPE_LABELS.EXECUTIVE,
            scanningAgents: ["EXECUTIVE"],
          },
          { type: "agent_started", agentType: "EXECUTIVE" },
        );

        const executiveResult = await postAgentRunWithRetry(projectId, "EXECUTIVE", true);
        if (getOrCreateJob(projectId).generation !== generation) return;

        step += 1;

        if (executiveResult.kind === "completed") {
          executiveOk = true;
          finishTab = "executive";
          const completedRuns = {
            ...getOrCreateJob(projectId).snapshot.completedRuns,
            EXECUTIVE: executiveResult.runId,
          };
          patch(
            projectId,
            {
              progress: step,
              scanningAgents: [],
              completedRuns,
              currentStepLabel: "Executive",
            },
            { type: "agent_completed", agentType: "EXECUTIVE", runId: executiveResult.runId },
          );
        } else if (executiveResult.kind === "ollama") {
          stoppedForOllama = true;
          patch(
            projectId,
            { scanningAgents: [], ollamaUnavailable: true, progress: step },
            { type: "agent_failed", agentType: "EXECUTIVE", ollama: true },
          );
        } else {
          executiveFailed = true;
          executiveErrorMessage =
            executiveResult.kind === "error"
              ? executiveResult.message
              : executiveResult.message ?? "Executive package failed.";
          patch(
            projectId,
            { scanningAgents: [], progress: step },
            {
              type: "agent_failed",
              agentType: "EXECUTIVE",
              runId: executiveResult.kind === "failed" ? executiveResult.runId : undefined,
            },
          );
        }
      } else if (consensusResult.kind === "ollama") {
        stoppedForOllama = true;
        patch(
          projectId,
          { consensusRunning: false, ollamaUnavailable: true, progress: step },
          { type: "consensus_failed", ollama: true },
        );
      } else {
        consensusFailed = true;
        consensusErrorMessage =
          consensusResult.kind === "error"
            ? consensusResult.message
            : consensusResult.message ?? "Consensus could not be completed.";
        patch(
          projectId,
          { consensusRunning: false, progress: step },
          { type: "consensus_failed" },
        );
      }
    } else if (stoppedForOllama) {
      // Fall through to ollama finish below.
    }

    if (getOrCreateJob(projectId).generation !== generation) return;

    if (consensusOk && executiveOk) {
      await finishJob(projectId, generation, {
        mode: "full",
        outcome: "success",
        message:
          specialistsCompleted === SPECIALIST_AGENT_TYPES.length
            ? "Full analysis finished."
            : `Full analysis finished (${specialistsCompleted}/${SPECIALIST_AGENT_TYPES.length} specialists + consensus + executive).`,
        toastTone: "success",
        title: "Full analysis ready",
        body: "Consensus and executive package are ready. Open Intelligence to review.",
        tab: "executive",
        notifyOutcome: "success",
      });
      return;
    }

    // Prefer step-specific failures over a blanket Ollama stop when consensus already ran.
    if (consensusFailed) {
      await finishJob(projectId, generation, {
        mode: "full",
        outcome: "partial",
        message:
          consensusErrorMessage ??
          `Specialists finished, but consensus failed${
            failedAgents.length ? ` (also failed: ${failedAgents.join(", ")})` : ""
          }. Re-run Consensus from its tab.`,
        toastTone: "message",
        title: "Full analysis partially finished",
        body:
          consensusErrorMessage ??
          "Specialists completed, but consensus failed. Open Intelligence to re-run Consensus.",
        notifyOutcome: "partial",
      });
      return;
    }

    if (executiveFailed) {
      await finishJob(projectId, generation, {
        mode: "full",
        outcome: "partial",
        message:
          executiveErrorMessage ??
          "Consensus completed, but the executive package failed. Re-run Executive from its tab.",
        toastTone: "message",
        title: "Executive package failed",
        body:
          executiveErrorMessage ??
          "Consensus is ready, but the executive package failed. Open Intelligence to re-run Executive.",
        tab: "consensus",
        notifyOutcome: "partial",
      });
      return;
    }

    if (stoppedForOllama) {
      await finishJob(projectId, generation, {
        mode: "full",
        outcome: "ollama",
        message: "Full analysis stopped — Ollama is unavailable.",
        toastTone: "error",
        title: "Full analysis stopped",
        body: "Ollama is unavailable. Open Intelligence to retry when the model server is back.",
        tab: finishTab,
        notifyOutcome: "ollama",
      });
      return;
    }

    if (specialistsCompleted > 0 && specialistsCompleted < 3) {
      await finishJob(projectId, generation, {
        mode: "full",
        outcome: "partial",
        message: `Only ${specialistsCompleted} specialist scan(s) completed${
          failedAgents.length ? ` (failed: ${failedAgents.join(", ")})` : ""
        }. Consensus needs at least 3 — re-run failed agents, then Full analysis or Consensus.`,
        toastTone: "message",
        title: "Full analysis needs more specialists",
        body: "Fewer than 3 specialists completed. Open Intelligence to re-run failed agents, then continue.",
        notifyOutcome: "partial",
      });
      return;
    }

    if (step > 0 && (consensusOk || specialistsCompleted > 0)) {
      await finishJob(projectId, generation, {
        mode: "full",
        outcome: "partial",
        message: `Full analysis finished with some steps skipped or failed${
          failedAgents.length ? ` (${failedAgents.join(", ")})` : ""
        }. Completed work was saved.`,
        toastTone: "message",
        title: "Full analysis partially finished",
        body: "Some analysis steps finished. Open Intelligence to review what completed and re-run the rest.",
        tab: finishTab,
        notifyOutcome: "partial",
      });
      return;
    }

    await finishJob(projectId, generation, {
      mode: "full",
      outcome: "failed",
      message: "Full analysis could not complete.",
      toastTone: "error",
      title: "Full analysis failed",
      body: "Open Intelligence to retry the analysis.",
      notifyOutcome: "failed",
    });
  })();

  return true;
}

async function finishJob(
  projectId: string,
  generation: number,
  input: {
    mode: BackgroundAnalysisMode;
    outcome: "success" | "partial" | "failed" | "ollama";
    message: string;
    toastTone: "success" | "error" | "message";
    title: string;
    body: string;
    tab?: "consensus" | "executive";
    notifyOutcome: "success" | "partial" | "failed" | "ollama";
  },
) {
  const job = getOrCreateJob(projectId);
  if (job.generation !== generation) return;

  const href = intelligenceHref(projectId, input.tab);

  await notifyAnalysisFinished({
    projectId,
    mode: input.mode,
    outcome: input.notifyOutcome,
    title: input.title,
    body: input.body,
    tab: input.tab,
  });

  if (getOrCreateJob(projectId).generation !== generation) return;

  if (input.toastTone === "success") toast.success(input.message);
  else if (input.toastTone === "error") toast.error(input.message);
  else toast.message(input.message);

  patch(
    projectId,
    {
      status: "idle",
      mode: input.mode,
      currentAgent: null,
      scanningAgents: [],
      consensusRunning: false,
      currentStepLabel: "",
      suggestedTab: input.tab === "executive" ? "EXECUTIVE" : input.tab === "consensus" ? "CONSENSUS" : job.snapshot.suggestedTab,
    },
    {
      type: "finished",
      mode: input.mode,
      outcome: input.outcome,
      message: input.message,
      intelligenceHref: href,
      toastTone: input.toastTone,
    },
  );
}

export const BACKGROUND_FULL_ANALYSIS_STEPS = FULL_ANALYSIS_TOTAL_STEPS;
