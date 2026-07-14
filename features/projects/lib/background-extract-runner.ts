import { toast } from "sonner";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export type BackgroundExtractKind = "timeline" | "graph";

export type TimelineExtractResult = {
  created: number;
  skipped: number;
  message?: string;
};

export type GraphExtractResult = {
  entitiesUpserted: number;
  relationsCreated: number;
  skippedRelations: number;
  message?: string;
};

export type BackgroundExtractSnapshot = {
  projectId: string;
  kind: BackgroundExtractKind;
  status: "idle" | "running";
  force: boolean;
  ollamaUnavailable: boolean;
  errorMessage: string | null;
  result: TimelineExtractResult | GraphExtractResult | null;
  generation: number;
};

type Listener = (snapshot: BackgroundExtractSnapshot) => void;

type JobState = {
  snapshot: BackgroundExtractSnapshot;
  generation: number;
};

const jobs = new Map<string, JobState>();
const listeners = new Map<string, Set<Listener>>();

function jobKey(projectId: string, kind: BackgroundExtractKind): string {
  return `${projectId}:${kind}`;
}

function idleSnapshot(
  projectId: string,
  kind: BackgroundExtractKind,
  generation = 0,
): BackgroundExtractSnapshot {
  return {
    projectId,
    kind,
    status: "idle",
    force: false,
    ollamaUnavailable: false,
    errorMessage: null,
    result: null,
    generation,
  };
}

function getJob(projectId: string, kind: BackgroundExtractKind): JobState {
  const key = jobKey(projectId, kind);
  const existing = jobs.get(key);
  if (existing) return existing;
  const created: JobState = {
    generation: 0,
    snapshot: idleSnapshot(projectId, kind, 0),
  };
  jobs.set(key, created);
  return created;
}

function emit(projectId: string, kind: BackgroundExtractKind) {
  const key = jobKey(projectId, kind);
  const job = jobs.get(key);
  if (!job) return;
  const set = listeners.get(key);
  if (!set) return;
  for (const listener of set) {
    listener(job.snapshot);
  }
}

function patch(
  projectId: string,
  kind: BackgroundExtractKind,
  updates: Partial<BackgroundExtractSnapshot>,
) {
  const job = getJob(projectId, kind);
  job.snapshot = { ...job.snapshot, ...updates, projectId, kind };
  emit(projectId, kind);
}

function kindLabel(kind: BackgroundExtractKind): string {
  return kind === "timeline" ? "Timeline extraction" : "Graph extraction";
}

function finishToast(params: {
  kind: BackgroundExtractKind;
  tone: "success" | "error" | "message";
  message: string;
  href: string;
}) {
  const action = {
    label: params.kind === "timeline" ? "View Timeline" : "View Graph",
    onClick: () => {
      window.location.assign(params.href);
    },
  };
  if (params.tone === "success") toast.success(params.message, { action });
  else if (params.tone === "error") toast.error(params.message, { action });
  else toast.message(params.message, { action });
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json()) as ApiEnvelope<T>;
}

export function getBackgroundExtractSnapshot(
  projectId: string,
  kind: BackgroundExtractKind,
): BackgroundExtractSnapshot {
  return getJob(projectId, kind).snapshot;
}

export function isBackgroundExtractRunning(
  projectId: string,
  kind: BackgroundExtractKind,
): boolean {
  return getJob(projectId, kind).snapshot.status === "running";
}

export function listRunningBackgroundExtracts(
  projectId: string,
): BackgroundExtractSnapshot[] {
  return (["timeline", "graph"] as const)
    .map((kind) => getBackgroundExtractSnapshot(projectId, kind))
    .filter((snap) => snap.status === "running");
}

export function subscribeBackgroundExtract(
  projectId: string,
  kind: BackgroundExtractKind,
  listener: Listener,
): () => void {
  const key = jobKey(projectId, kind);
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

/** Subscribe to both timeline and graph jobs for project-shell banners. */
export function subscribeAllBackgroundExtracts(
  projectId: string,
  listener: (running: BackgroundExtractSnapshot[]) => void,
): () => void {
  const notify = () => listener(listRunningBackgroundExtracts(projectId));
  const unsubs = (["timeline", "graph"] as const).map((kind) =>
    subscribeBackgroundExtract(projectId, kind, () => notify()),
  );
  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export function startBackgroundExtract(params: {
  projectId: string;
  kind: BackgroundExtractKind;
  force?: boolean;
  all?: boolean;
}): boolean {
  const { projectId, kind } = params;
  const force = params.force ?? false;
  const all = params.all ?? false;
  const job = getJob(projectId, kind);
  if (job.snapshot.status === "running") {
    toast.message(`${kindLabel(kind)} is already running`);
    return false;
  }

  const generation = job.generation + 1;
  job.generation = generation;
  patch(projectId, kind, {
    status: "running",
    force,
    ollamaUnavailable: false,
    errorMessage: null,
    result: null,
    generation,
  });

  const href =
    kind === "timeline"
      ? `/dashboard/projects/${projectId}/timeline`
      : `/dashboard/projects/${projectId}/graph`;

  void (async () => {
    try {
      const path =
        kind === "timeline"
          ? `/api/projects/${projectId}/timeline/extract`
          : `/api/projects/${projectId}/graph/extract`;
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force, all }),
      });

      if (getJob(projectId, kind).generation !== generation) return;

      if (kind === "timeline") {
        const payload = await readJson<TimelineExtractResult>(response);
        if (!payload.success) {
          const ollama = payload.error.code === "OLLAMA_UNAVAILABLE";
          patch(projectId, kind, {
            status: "idle",
            ollamaUnavailable: ollama,
            errorMessage: payload.error.message,
            result: null,
          });
          finishToast({
            kind,
            tone: "error",
            message: payload.error.message,
            href,
          });
          return;
        }
        patch(projectId, kind, {
          status: "idle",
          ollamaUnavailable: false,
          errorMessage: null,
          result: payload.data,
        });
        if (payload.data.message) {
          finishToast({ kind, tone: "message", message: payload.data.message, href });
        } else {
          finishToast({
            kind,
            tone: "success",
            message:
              `Extracted ${payload.data.created} event${payload.data.created === 1 ? "" : "s"}` +
              (payload.data.skipped ? ` (${payload.data.skipped} skipped)` : ""),
            href,
          });
        }
        return;
      }

      const payload = await readJson<GraphExtractResult>(response);
      if (!payload.success) {
        const ollama = payload.error.code === "OLLAMA_UNAVAILABLE";
        patch(projectId, kind, {
          status: "idle",
          ollamaUnavailable: ollama,
          errorMessage: payload.error.message,
          result: null,
        });
        finishToast({
          kind,
          tone: "error",
          message: payload.error.message,
          href,
        });
        return;
      }
      patch(projectId, kind, {
        status: "idle",
        ollamaUnavailable: false,
        errorMessage: null,
        result: payload.data,
      });
      if (payload.data.message) {
        finishToast({ kind, tone: "message", message: payload.data.message, href });
      } else {
        finishToast({
          kind,
          tone: "success",
          message: `Upserted entities and created ${payload.data.relationsCreated} relation${
            payload.data.relationsCreated === 1 ? "" : "s"
          }`,
          href,
        });
      }
    } catch {
      if (getJob(projectId, kind).generation !== generation) return;
      const message = `${kindLabel(kind)} failed`;
      patch(projectId, kind, {
        status: "idle",
        errorMessage: message,
        result: null,
      });
      finishToast({ kind, tone: "error", message, href });
    }
  })();

  return true;
}
