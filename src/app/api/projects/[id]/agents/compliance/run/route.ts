import { handleAgentRunPost } from "@/features/intelligence/lib/run-route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAgentRunPost(id, "COMPLIANCE", request);
}
