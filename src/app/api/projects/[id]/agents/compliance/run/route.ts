export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { handleAgentRunPost } from "@/features/intelligence/lib/run-route";
import { API_TYPE_TO_AGENT } from "@/features/intelligence/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAgentRunPost(id, API_TYPE_TO_AGENT.compliance, request);
}
