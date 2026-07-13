import { runAgent } from "./run-agent";

export function runFinancialAgent(projectId: string) {
  return runAgent(projectId, "FINANCIAL");
}
