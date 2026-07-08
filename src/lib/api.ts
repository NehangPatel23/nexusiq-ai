import { NextResponse } from "next/server";

import { AuthError } from "@/features/organizations/lib/authorization";

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, { status });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
    } satisfies ApiResponse<never>,
    { status },
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "NOT_FOUND" ? 404 : 403;
    return apiError(error.code, error.message, status);
  }

  console.error(error);
  return apiError("PROCESSING_ERROR", "An unexpected error occurred", 500);
}
