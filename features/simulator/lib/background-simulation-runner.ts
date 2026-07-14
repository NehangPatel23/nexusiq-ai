import { toast } from "sonner";

import type { ScenarioName, SimulationParameters } from "@/features/simulator/schemas";
import type { SimulationRunView } from "@/lib/ai/simulator";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export type BackgroundSimulationSnapshot = {
  projectId: string;
  status: "idle" | "running";
  scenarioName: ScenarioName | null;
  ollamaUnavailable: boolean;
  prerequisite: boolean;
  errorMessage: string | null;
  result: SimulationRunView | null;
  generation: number;
};

type Listener = (snapshot: BackgroundSimulationSnapshot) => void;

type JobState = {
  snapshot: BackgroundSimulationSnapshot;
  generation: number;
};

const jobs = new Map<string, JobState>();
const listeners = new Map<string, Set<Listener>>();

function idleSnapshot(projectId: string, generation = 0): BackgroundSimulationSnapshot {
  return {
    projectId,
    status: "idle",
    scenarioName: null,
    ollamaUnavailable: false,
    prerequisite: false,
    errorMessage: null,
    result: null,
    generation,
  };
}

function getJob(projectId: string): JobState {
  const existing = jobs.get(projectId);
  if (existing) return existing;
  const created: JobState = {
    generation: 0,
    snapshot: idleSnapshot(projectId, 0),
  };
  jobs.set(projectId, created);
  return created;
}

function emit(projectId: string) {
  const job = jobs.get(projectId);
  if (!job) return;
  const set = listeners.get(projectId);
  if (!set) return;
  for (const listener of set) {
    listener(job.snapshot);
  }
}

function patch(projectId: string, updates: Partial<BackgroundSimulationSnapshot>) {
  const job = getJob(projectId);
  job.snapshot = { ...job.snapshot, ...updates, projectId };
  emit(projectId);
}

function href(projectId: string) {
  return `/dashboard/projects/${projectId}/simulator`;
}

function finishToast(params: {
  tone: "success" | "error" | "message";
  message: string;
  projectId: string;
}) {
  const action = {
    label: "View Simulator",
    onClick: () => {
      window.location.assign(href(params.projectId));
    },
  };
  if (params.tone === "success") toast.success(params.message, { action });
  else if (params.tone === "error") toast.error(params.message, { action });
  else toast.message(params.message, { action });
}

export function getBackgroundSimulationSnapshot(
  projectId: string,
): BackgroundSimulationSnapshot {
  return getJob(projectId).snapshot;
}

export function isBackgroundSimulationRunning(projectId: string): boolean {
  return getJob(projectId).snapshot.status === "running";
}

export function subscribeBackgroundSimulation(
  projectId: string,
  listener: Listener,
): () => void {
  const set = listeners.get(projectId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(projectId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(projectId);
  };
}

export function startBackgroundSimulation(params: {
  projectId: string;
  scenarioName: ScenarioName;
  parameters: SimulationParameters;
}): boolean {
  const { projectId, scenarioName, parameters } = params;
  const job = getJob(projectId);
  if (job.snapshot.status === "running") {
    toast.message("A risk simulation is already running");
    return false;
  }

  const generation = job.generation + 1;
  job.generation = generation;
  patch(projectId, {
    status: "running",
    scenarioName,
    ollamaUnavailable: false,
    prerequisite: false,
    errorMessage: null,
    result: null,
    generation,
  });

  void (async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/simulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioName, parameters }),
      });

      if (getJob(projectId).generation !== generation) return;

      const payload = (await response.json()) as ApiEnvelope<SimulationRunView>;
      if (!payload.success) {
        const ollama = payload.error.code === "OLLAMA_UNAVAILABLE";
        const prerequisite = payload.error.code === "SIMULATION_PREREQUISITE";
        patch(projectId, {
          status: "idle",
          ollamaUnavailable: ollama,
          prerequisite,
          errorMessage: payload.error.message,
          result: null,
        });
        finishToast({
          tone: "error",
          message: payload.error.message,
          projectId,
        });
        return;
      }

      patch(projectId, {
        status: "idle",
        ollamaUnavailable: false,
        prerequisite: false,
        errorMessage: null,
        result: payload.data,
      });

      const label = payload.data.scenarioName.replace(/_/g, " ");
      finishToast({
        tone: "success",
        message: `Simulation complete · ${label}`,
        projectId,
      });
    } catch {
      if (getJob(projectId).generation !== generation) return;
      const message = "Risk simulation failed";
      patch(projectId, {
        status: "idle",
        errorMessage: message,
        result: null,
      });
      finishToast({ tone: "error", message, projectId });
    }
  })();

  return true;
}
