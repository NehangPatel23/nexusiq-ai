import { runAgent } from "./run-agent";

export function runFraudAgent(projectId: string) {
  return runAgent(projectId, "FRAUD");
}
