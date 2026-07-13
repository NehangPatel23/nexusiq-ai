"use client";

import { useSyncExternalStore } from "react";

import {
  getBackgroundAnalysisSnapshot,
  subscribeBackgroundAnalysis,
  type BackgroundAnalysisSnapshot,
} from "@/features/intelligence/lib/background-analysis-runner";

export function useBackgroundAnalysis(projectId: string): BackgroundAnalysisSnapshot {
  return useSyncExternalStore(
    (onStoreChange) => subscribeBackgroundAnalysis(projectId, () => onStoreChange()),
    () => getBackgroundAnalysisSnapshot(projectId),
    () => getBackgroundAnalysisSnapshot(projectId),
  );
}
