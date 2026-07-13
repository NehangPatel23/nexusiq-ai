import { runAgent } from "./run-agent";

export function runComplianceAgent(projectId: string) {
  return runAgent(projectId, "COMPLIANCE");
}
