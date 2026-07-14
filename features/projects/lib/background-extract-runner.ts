import { toast } from "sonner";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export type BackgroundExtractKind = "timeline" | "graph" | "contradictions" | "missing";

export const BACKGROUND_EXTRACT_KINDS: BackgroundExtractKind[] = [
  "timeline",
  "graph",
  "contradictions",
  "missing",
];

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

export type ContradictionScanResult = {
  created: number;
  skipped: number;
  dismissedStale?: number;
  message?: string;
};

export type MissingScanResult = {
  created: number;
  skipped: number;
  closedResolved?: number;
  message?: string;
};

export type BackgroundExtractResult =
  | TimelineExtractResult
  | GraphExtractResult
  | ContradictionScanResult
  | MissingScanResult;

export type BackgroundExtractSnapshot = {
  projectId: string;
  kind: BackgroundExtractKind;
  status: "idle" | "running";
  force: boolean;
  ollamaUnavailable: boolean;
  errorMessage: string | null;
  result: BackgroundExtractResult | null;
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
  switch (kind) {
    case "timeline":
      return "Timeline extraction";
    case "graph":
      return "Graph extraction";
    case "contradictions":
      return "Contradiction scan";
    case "missing":
      return "Missing-info scan";
  }
}

function kindHref(projectId: string, kind: BackgroundExtractKind): string {
  switch (kind) {
    case "timeline":
      return `/dashboard/projects/${projectId}/timeline`;
    case "graph":
      return `/dashboard/projects/${projectId}/graph`;
    case "contradictions":
      return `/dashboard/projects/${projectId}/contradictions`;
    case "missing":
      return `/dashboard/projects/${projectId}/missing`;
  }
}

function viewLabel(kind: BackgroundExtractKind): string {
  switch (kind) {
    case "timeline":
      return "View Timeline";
    case "graph":
      return "View Graph";
    case "contradictions":
      return "View Contradictions";
    case "missing":
      return "View Missing Info";
  }
}

function finishToast(params: {
  kind: BackgroundExtractKind;
  tone: "success" | "error" | "message";
  message: string;
  href: string;
}) {
  const action = {
    label: viewLabel(params.kind),
    onClick: () => {
      window.location.assign(params.href);
    },
  };
  if (params.tone === "success") toast.success(params.message, { action });
  else if (params.tone === "error") toast.error(params.message, { action });
  else toast.message(params.message, { action });
}

function extractPath(projectId: string, kind: BackgroundExtractKind): string {
  switch (kind) {
    case "timeline":
      return `/api/projects/${projectId}/timeline/extract`;
    case "graph":
      return `/api/projects/${projectId}/graph/extract`;
    case "contradictions":
      return `/api/projects/${projectId}/contradictions/scan`;
    case "missing":
      return `/api/projects/${projectId}/missing/scan`;
  }
}

function successMessage(kind: BackgroundExtractKind, data: BackgroundExtractResult): string {
  if (kind === "timeline") {
    const d = data as TimelineExtractResult;
    return (
      `Extracted ${d.created} event${d.created === 1 ? "" : "s"}` +
      (d.skipped ? ` (${d.skipped} skipped)` : "")
    );
  }
  if (kind === "graph") {
    const d = data as GraphExtractResult;
    return `Upserted entities and created ${d.relationsCreated} relation${
      d.relationsCreated === 1 ? "" : "s"
    }`;
  }
  if (kind === "contradictions") {
    const d = data as ContradictionScanResult;
    return d.created > 0
      ? `Found ${d.created} contradiction${d.created === 1 ? "" : "s"}`
      : "Contradiction scan complete";
  }
  const d = data as MissingScanResult;
  return d.created > 0
    ? `Identified ${d.created} gap${d.created === 1 ? "" : "s"}`
    : "Missing-info scan complete";
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
  return BACKGROUND_EXTRACT_KINDS.map((kind) => getBackgroundExtractSnapshot(projectId, kind)).filter(
    (snap) => snap.status === "running",
  );
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

/** Subscribe to all background jobs for project-shell banners. */
export function subscribeAllBackgroundExtracts(
  projectId: string,
  listener: (running: BackgroundExtractSnapshot[]) => void,
): () => void {
  const notify = () => listener(listRunningBackgroundExtracts(projectId));
  const unsubs = BACKGROUND_EXTRACT_KINDS.map((kind) =>
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

  const href = kindHref(projectId, kind);

  void (async () => {
    try {
      const body =
        kind === "contradictions" || kind === "missing" ? { force } : { force, all };

      const response = await fetch(extractPath(projectId, kind), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (getJob(projectId, kind).generation !== generation) return;

      const payload = await readJson<BackgroundExtractResult>(response);
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

      if ("message" in payload.data && payload.data.message) {
        finishToast({ kind, tone: "message", message: payload.data.message, href });
      } else {
        finishToast({
          kind,
          tone: "success",
          message: successMessage(kind, payload.data),
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

export { kindLabel, kindHref, viewLabel };
