import { NextResponse } from "next/server";

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

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      checks,
      db: "connected",
    });
  } catch (error) {
    console.error("[health] database check failed", error);
    return NextResponse.json(
      {
        ok: false,
        checks,
        db: "error",
        error: error instanceof Error ? error.message : "Database connection failed",
      },
      { status: 503 },
    );
  }
}
