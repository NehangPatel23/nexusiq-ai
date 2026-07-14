export const dynamic = "force-dynamic";

import { requireProjectActionsAccess } from "@/features/actions/lib/authorization";
import { createTask, listTasks } from "@/features/actions/lib/tasks";
import { createTaskBodySchema, listTasksQuerySchema } from "@/features/actions/schemas";
import { listOrganizationMembers } from "@/features/organizations/lib/organizations";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { organizationId } = await requireProjectActionsAccess(id);

    const url = new URL(request.url);
    const parsed = listTasksQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      priority: url.searchParams.get("priority") ?? undefined,
    });
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const [tasks, members] = await Promise.all([
      listTasks(id, parsed.data),
      listOrganizationMembers(organizationId),
    ]);

    return apiSuccess({
      tasks,
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { organizationId, session } = await requireProjectActionsAccess(id);

    const parsed = createTaskBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid request body",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const task = await createTask({
      projectId: id,
      organizationId,
      actorId: session.userId,
      ...parsed.data,
    });

    return apiSuccess(task, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
