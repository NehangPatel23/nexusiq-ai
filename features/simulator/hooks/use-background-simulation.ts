"use client";

import { startTransition, useEffect, useState } from "react";

import {
  getBackgroundSimulationSnapshot,
  subscribeBackgroundSimulation,
  type BackgroundSimulationSnapshot,
} from "@/features/simulator/lib/background-simulation-runner";

export function useBackgroundSimulation(projectId: string): BackgroundSimulationSnapshot {
  const [snapshot, setSnapshot] = useState(() => getBackgroundSimulationSnapshot(projectId));

  useEffect(() => {
    let cancelled = false;
    setSnapshot(getBackgroundSimulationSnapshot(projectId));
    const unsubscribe = subscribeBackgroundSimulation(projectId, (next) => {
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
