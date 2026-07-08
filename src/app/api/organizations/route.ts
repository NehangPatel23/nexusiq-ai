import { requireSession } from "@/features/organizations/lib/authorization";
import {
  createOrganization,
  listUserOrganizations,
} from "@/features/organizations/lib/organizations";
import { createOrganizationSchema } from "@/features/organizations/schemas";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireSession();
    const organizations = await listUserOrganizations(session.userId);
    return apiSuccess({ items: organizations, total: organizations.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = createOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid organization data",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }

    const organization = await createOrganization(session.userId, parsed.data);
    return apiSuccess(organization, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
