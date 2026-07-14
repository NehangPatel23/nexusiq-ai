"use client";

import { startTransition, useEffect, useState } from "react";

import {
  getBackgroundTasksSnapshot,
  subscribeBackgroundTasks,
  type BackgroundTasksSnapshot,
} from "@/features/actions/lib/background-tasks-runner";

export function useBackgroundTasks(projectId: string): BackgroundTasksSnapshot {
  const [snapshot, setSnapshot] = useState(() => getBackgroundTasksSnapshot(projectId));

  useEffect(() => {
    let cancelled = false;
    setSnapshot(getBackgroundTasksSnapshot(projectId));
    const unsubscribe = subscribeBackgroundTasks(projectId, (next) => {
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
