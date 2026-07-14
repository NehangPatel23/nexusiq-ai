import {
  getOllamaHostOnly,
  healthCheck,
  isOllamaConfigured,
  resetOllamaClient,
} from "@/lib/ai/ollama-client";
import { prisma } from "@/lib/db";
import { getEffectiveOllamaConfig } from "@/features/settings/lib/system-settings";
import { isSupabaseStorageConfigured } from "@/lib/storage";

import { getDiskHealth, type DiskHealth } from "./disk";
import { getQueueSummary, type QueueSummary } from "./queue";
import { documentsInOrgWhere } from "./org-scope";

export type AdminHealthPayload = {
  ok: boolean;
  db: "connected" | "error";
  ollama: "connected" | "unreachable" | "not_configured";
  ollamaUrl: string;
  ollamaModels?: string[];
  ollamaConfigSource: {
    baseUrl: "env" | "settings" | "default";
    chatModel: "env" | "settings" | "default";
    embedModel: "env" | "settings" | "default";
  };
  apiKeyConfigured: boolean;
  disk?: DiskHealth;
  storage: { documentsBytes: number; documentCount: number };
  queue: QueueSummary;
  environment: { vercel: boolean; nodeEnv: string };
  /** Deferred until OCI worker is provisioned — queue counts are DB-only. */
  workerNote: string;
};

export async function getAdminHealth(organizationId: string): Promise<AdminHealthPayload> {
  resetOllamaClient();
  const effective = await getEffectiveOllamaConfig();
  const ollamaUrl = getOllamaHostOnly(effective.baseUrl.value);

  let db: "connected" | "error" = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }

  let ollama: AdminHealthPayload["ollama"] = "not_configured";
  let ollamaModels: string[] | undefined;

  if (!isOllamaConfigured()) {
    ollama = "not_configured";
  } else {
    const health = await healthCheck();
    if (health.ok) {
      ollama = "connected";
      ollamaModels = health.models;
    } else {
      ollama = "unreachable";
    }
  }

  const [disk, storageAgg, queue] = await Promise.all([
    getDiskHealth(),
    prisma.document.aggregate({
      where: documentsInOrgWhere(organizationId),
      _sum: { fileSize: true },
      _count: { _all: true },
    }),
    getQueueSummary(organizationId),
  ]);

  // When using remote object storage, local disk stats are less meaningful.
  const diskPayload: DiskHealth | undefined = isSupabaseStorageConfigured()
    ? {
        note: "Documents use Supabase Storage — local disk N/A. See storage aggregate from Postgres.",
        path: disk && "path" in disk ? disk.path : undefined,
      }
    : disk;

  const ok = db === "connected";

  return {
    ok,
    db,
    ollama,
    ollamaUrl,
    ollamaModels,
    ollamaConfigSource: {
      baseUrl: effective.baseUrl.source,
      chatModel: effective.chatModel.source,
      embedModel: effective.embedModel.source,
    },
    apiKeyConfigured: effective.apiKeyConfigured,
    disk: diskPayload,
    storage: {
      documentsBytes: storageAgg._sum.fileSize ?? 0,
      documentCount: storageAgg._count._all,
    },
    queue,
    environment: {
      vercel: Boolean(process.env.VERCEL),
      nodeEnv: process.env.NODE_ENV ?? "development",
    },
    workerNote:
      "Processing queue metrics are from Postgres document status (PENDING/PROCESSING/FAILED/READY). Live OCI worker health is deferred — see tasks/00-oci-worker-vps.md.",
  };
}
