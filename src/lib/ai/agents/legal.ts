import { runAgent } from "./run-agent";

export function runLegalAgent(projectId: string) {
  return runAgent(projectId, "LEGAL");
}
