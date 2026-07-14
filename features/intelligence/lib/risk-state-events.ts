export const RISK_STATE_CHANGED_EVENT = "nexusiq:risk-state-changed";

export type RiskStateChangedDetail = {
  projectId: string;
  entity: "finding" | "contradiction" | "missing";
  id: string;
  status?: string | null;
  severity?: string | null;
};

export function dispatchRiskStateChanged(detail: RiskStateChangedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RISK_STATE_CHANGED_EVENT, { detail }));
}

export function subscribeRiskStateChanged(
  listener: (detail: RiskStateChangedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<RiskStateChangedDetail>;
    if (custom.detail) listener(custom.detail);
  };
  window.addEventListener(RISK_STATE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(RISK_STATE_CHANGED_EVENT, handler);
}
