import { prisma } from "@/lib/db";

import { claimPendingDocuments, processClaimedDocument } from "../src/lib/ai/processing/worker-claim";

const POLL_INTERVAL_MS = Number.parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? "5000", 10);
const CONCURRENCY = Number.parseInt(process.env.WORKER_CONCURRENCY ?? "1", 10);

let shuttingDown = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processBatch() {
  const ids = await claimPendingDocuments(CONCURRENCY);
  if (ids.length === 0) return;

  console.info(`[worker] claimed ${ids.length} document(s): ${ids.join(", ")}`);

  await Promise.all(
    ids.map(async (id) => {
      const result = await processClaimedDocument(id);
      if (result.ok) {
        console.info(`[worker] READY ${id} (${result.chunkCount} chunks)`);
      } else {
        console.error(`[worker] FAILED ${id}: ${result.error}`);
      }
    }),
  );
}

async function loop() {
  while (!shuttingDown) {
    try {
      await processBatch();
    } catch (error) {
      console.error("[worker] batch error", error);
    }
    if (shuttingDown) break;
    await sleep(POLL_INTERVAL_MS);
  }
}

function shutdown(signal: string) {
  console.info(`[worker] received ${signal}, shutting down…`);
  shuttingDown = true;
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.info(
  `[worker] starting (poll=${POLL_INTERVAL_MS}ms, concurrency=${CONCURRENCY})`,
);

void loop().finally(async () => {
  await prisma.$disconnect();
  console.info("[worker] stopped");
  process.exit(0);
});
