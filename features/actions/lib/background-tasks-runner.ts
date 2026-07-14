import { toast } from "sonner";

import type { TaskView } from "@/features/actions/lib/tasks";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export type BackgroundTasksKind = "suggest" | "from-findings";

export type BackgroundTasksResult = {
  created: number;
  tasks: TaskView[];
};

export type BackgroundTasksSnapshot = {
  projectId: string;
  kind: BackgroundTasksKind | null;
  status: "idle" | "running";
  errorMessage: string | null;
  result: BackgroundTasksResult | null;
  generation: number;
};

type Listener = (snapshot: BackgroundTasksSnapshot) => void;

type JobState = {
  snapshot: BackgroundTasksSnapshot;
  generation: number;
};

const jobs = new Map<string, JobState>();
const listeners = new Map<string, Set<Listener>>();

function idleSnapshot(projectId: string, generation = 0): BackgroundTasksSnapshot {
  return {
    projectId,
    kind: null,
    status: "idle",
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

function patch(projectId: string, updates: Partial<BackgroundTasksSnapshot>) {
  const job = getJob(projectId);
  job.snapshot = { ...job.snapshot, ...updates, projectId };
  emit(projectId);
}

function href(projectId: string) {
  return `/dashboard/projects/${projectId}/actions`;
}

function kindLabel(kind: BackgroundTasksKind): string {
  return kind === "suggest" ? "Suggest from intelligence" : "Add from findings";
}

function finishToast(params: {
  tone: "success" | "error" | "message";
  message: string;
  projectId: string;
}) {
  const action = {
    label: "View Action Plan",
    onClick: () => {
      window.location.assign(href(params.projectId));
    },
  };
  if (params.tone === "success") toast.success(params.message, { action });
  else if (params.tone === "error") toast.error(params.message, { action });
  else toast.message(params.message, { action });
}

export function getBackgroundTasksSnapshot(projectId: string): BackgroundTasksSnapshot {
  return getJob(projectId).snapshot;
}

export function isBackgroundTasksRunning(projectId: string): boolean {
  return getJob(projectId).snapshot.status === "running";
}

export function subscribeBackgroundTasks(projectId: string, listener: Listener): () => void {
  const set = listeners.get(projectId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(projectId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(projectId);
  };
}

function startJob(params: {
  projectId: string;
  kind: BackgroundTasksKind;
  body: Record<string, unknown>;
}): boolean {
  const { projectId, kind, body } = params;
  const job = getJob(projectId);
  if (job.snapshot.status === "running") {
    toast.message(`${kindLabel(job.snapshot.kind ?? kind)} is already running`);
    return false;
  }

  const generation = job.generation + 1;
  job.generation = generation;
  patch(projectId, {
    status: "running",
    kind,
    errorMessage: null,
    result: null,
    generation,
  });

  void (async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/from-findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (getJob(projectId).generation !== generation) return;

      const payload = (await response.json()) as ApiEnvelope<BackgroundTasksResult>;
      if (!payload.success) {
        patch(projectId, {
          status: "idle",
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
        errorMessage: null,
        result: payload.data,
      });

      if (payload.data.created === 0) {
        finishToast({
          tone: "message",
          message: "No new tasks to add (duplicates skipped)",
          projectId,
        });
      } else {
        finishToast({
          tone: "success",
          message: `Added ${payload.data.created} task${payload.data.created === 1 ? "" : "s"}`,
          projectId,
        });
      }
    } catch {
      if (getJob(projectId).generation !== generation) return;
      const message = `${kindLabel(kind)} failed`;
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

export function startBackgroundSuggest(projectId: string): boolean {
  return startJob({
    projectId,
    kind: "suggest",
    body: { includeExecutiveActions: true },
  });
}

export function startBackgroundFromFindings(
  projectId: string,
  findingIds: string[],
): boolean {
  return startJob({
    projectId,
    kind: "from-findings",
    body: {
      findingIds,
      includeExecutiveActions: false,
    },
  });
}

export { kindLabel };
