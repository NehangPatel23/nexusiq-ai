import { NextResponse } from "next/server";

import {
  getOllamaClient,
  getOllamaHostOnly,
  isOllamaConfigured,
} from "@/lib/ai/ollama-client";
import { prisma } from "@/lib/db";

export async function GET() {
  const checks = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.AUTH_SECRET),
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  if (!checks.databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        checks,
        error: "DATABASE_URL is not set",
      },
      { status: 503 },
    );
  }

  let dbStatus: "connected" | "error" = "connected";
  let dbError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = "error";
    dbError = error instanceof Error ? error.message : "Database connection failed";
    console.error("[health] database check failed", error);
    return NextResponse.json(
      {
        ok: false,
        checks,
        db: dbStatus,
        error: dbError,
      },
      { status: 503 },
    );
  }

  let ollamaPayload:
    | { ollama: "not_configured" }
    | { ollama: "connected"; ollamaUrl: string }
    | { ollama: "unreachable"; ollamaError: string };

  if (!isOllamaConfigured()) {
    ollamaPayload = { ollama: "not_configured" };
  } else {
    const client = getOllamaClient();
    const health = await client.healthCheck();
    const baseUrl = client.getConfig().baseUrl;
    if (health.ok) {
      ollamaPayload = {
        ollama: "connected",
        ollamaUrl: getOllamaHostOnly(baseUrl),
      };
    } else {
      ollamaPayload = {
        ollama: "unreachable",
        ollamaError: health.error,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    checks,
    db: dbStatus,
    ...ollamaPayload,
  });
}
