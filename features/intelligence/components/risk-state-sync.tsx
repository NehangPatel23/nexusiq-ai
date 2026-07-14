"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

import { subscribeRiskStateChanged } from "@/features/intelligence/lib/risk-state-events";

/**
 * Keeps server-rendered project UI (Risks summary, Intelligence counts,
 * dashboard caches via later navigation) fresh when severity/status change.
 */
export function RiskStateSync({ projectId }: { projectId: string }) {
  const router = useRouter();

  useEffect(() => {
    return subscribeRiskStateChanged((detail) => {
      if (detail.projectId !== projectId) return;
      startTransition(() => {
        router.refresh();
      });
    });
  }, [projectId, router]);

  return null;
}
