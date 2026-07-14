"use client";

import { startTransition, useEffect, useState } from "react";

import {
  getBackgroundExtractSnapshot,
  subscribeBackgroundExtract,
  type BackgroundExtractKind,
  type BackgroundExtractSnapshot,
} from "@/features/projects/lib/background-extract-runner";

export function useBackgroundExtract(
  projectId: string,
  kind: BackgroundExtractKind,
): BackgroundExtractSnapshot {
  const [snapshot, setSnapshot] = useState(() => getBackgroundExtractSnapshot(projectId, kind));

  useEffect(() => {
    let cancelled = false;
    setSnapshot(getBackgroundExtractSnapshot(projectId, kind));
    const unsubscribe = subscribeBackgroundExtract(projectId, kind, (next) => {
      if (cancelled) return;
      startTransition(() => {
        if (!cancelled) setSnapshot(next);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [projectId, kind]);

  return snapshot;
}
