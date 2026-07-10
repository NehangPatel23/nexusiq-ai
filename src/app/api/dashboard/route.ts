import { requireSession } from "@/features/organizations/lib/authorization";
import { getDashboardData } from "@/features/projects/lib/dashboard";
import { apiSuccess, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireSession();
    const data = await getDashboardData(session.userId);
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
