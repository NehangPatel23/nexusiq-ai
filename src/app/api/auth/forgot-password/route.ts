import { NextResponse } from "next/server";

import { requestPasswordReset } from "@/features/auth/actions";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await requestPasswordReset(body);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      message: "If an account exists for that email, a reset link has been sent.",
    },
  });
}
