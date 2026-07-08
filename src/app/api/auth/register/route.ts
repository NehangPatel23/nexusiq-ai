import { NextResponse } from "next/server";

import { createUser, findUserByEmail } from "@/features/auth/lib/users";
import { registerSchema } from "@/features/auth/schemas";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "CONFIG_ERROR", message: "DATABASE_URL is not configured" },
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid registration data",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }

    const existing = await findUserByEmail(parsed.data.email);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONFLICT", message: "An account with this email already exists" },
        },
        { status: 409 },
      );
    }

    const user = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });

    return NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("[register] failed", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "AUTH_ERROR", message: "Registration failed" },
      },
      { status: 500 },
    );
  }
}
