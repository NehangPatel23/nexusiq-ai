import { NextResponse } from "next/server";

import { purgeExpiredEntities } from "@/features/history/lib/purge";

/**
 * Vercel Cron (and manual) purge of expired tombstoned users/orgs.
 * Protect with CRON_SECRET: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = new URL(request.url).searchParams.get("secret");

  if (bearer !== secret && querySecret !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeExpiredEntities();
  return NextResponse.json({ ok: true, ...result });
}
