"use client";

import { startTransition, useEffect, useState } from "react";

import {
  getBackgroundAnalysisSnapshot,
  subscribeBackgroundAnalysis,
  type BackgroundAnalysisSnapshot,
} from "@/features/intelligence/lib/background-analysis-runner";

/**
 * Prefer useState + startTransition over useSyncExternalStore.
 * External-store updates are high priority and can starve App Router navigations
 * while a long full-analysis job is emitting progress.
 */
export function useBackgroundAnalysis(projectId: string): BackgroundAnalysisSnapshot {
  const [snapshot, setSnapshot] = useState(() => getBackgroundAnalysisSnapshot(projectId));

  useEffect(() => {
    let cancelled = false;
    setSnapshot(getBackgroundAnalysisSnapshot(projectId));
    const unsubscribe = subscribeBackgroundAnalysis(projectId, (next) => {
      if (cancelled) return;
      startTransition(() => {
        if (!cancelled) setSnapshot(next);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [projectId]);

  return snapshot;
}
