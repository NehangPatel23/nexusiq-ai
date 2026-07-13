import { runAgent } from "./run-agent";

export function runRiskAgent(projectId: string) {
  return runAgent(projectId, "RISK");
}
