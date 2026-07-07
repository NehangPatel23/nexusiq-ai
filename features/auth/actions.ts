"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  deletePasswordResetTokensForEmail,
  findValidPasswordResetToken,
  logPasswordResetLink,
} from "@/features/auth/lib/password-reset";
import {
  createUser,
  findUserByEmail,
  updateUserPassword,
  updateUserProfile,
} from "@/features/auth/lib/users";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "@/features/auth/schemas";
import { auth, signIn, signOut } from "@/lib/auth";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };

function validationError(fieldErrors: Record<string, string[]>) {
  return {
    success: false as const,
    error: {
      code: "VALIDATION_ERROR",
      message: "Please fix the errors below",
      fieldErrors,
    },
  };
}

export async function register(input: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return {
      success: false,
      error: {
        code: "CONFLICT",
        message: "An account with this email already exists",
      },
    };
  }

  await createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Account created but sign-in failed. Please log in.",
      },
    };
  }

  return { success: true };
}

export async function signInWithCredentials(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      return {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        },
      };
    }
    throw error;
  }

  return { success: true };
}

export async function signOutUser(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function requestPasswordReset(
  input: unknown,
): Promise<ActionResult<{ devResetUrl?: string }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  let devResetUrl: string | undefined;

  const user = await findUserByEmail(parsed.data.email);
  if (user) {
    const token = await createPasswordResetToken(parsed.data.email);
    if (token) {
      logPasswordResetLink(parsed.data.email, token);
      if (process.env.NODE_ENV === "development") {
        devResetUrl = buildPasswordResetUrl(token);
      }
    }
  }

  return { success: true, data: devResetUrl ? { devResetUrl } : undefined };
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  const record = await findValidPasswordResetToken(parsed.data.token);
  if (!record) {
    return {
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "This reset link is invalid or has expired. Please request a new one.",
      },
    };
  }

  await updateUserPassword(record.email, parsed.data.password);
  await deletePasswordResetTokensForEmail(record.email);

  return { success: true };
}

export async function updateProfile(input: unknown): Promise<ActionResult<{ name: string; image: string | null }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in to update your profile",
      },
    };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.flatten().fieldErrors);
  }

  const user = await updateUserProfile(session.user.id, {
    name: parsed.data.name,
  });

  return {
    success: true,
    data: {
      name: user.name ?? "",
      image: user.image,
    },
  };
}

export async function uploadAvatar(formData: FormData): Promise<ActionResult<{ image: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "You must be signed in to upload an avatar",
      },
    };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please select an image file",
      },
    };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Avatar must be JPEG, PNG, WebP, or GIF",
      },
    };
  }

  if (file.size > 2 * 1024 * 1024) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Avatar must be smaller than 2MB",
      },
    };
  }

  const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const storagePath = process.env.STORAGE_PATH ?? "./storage";
  const avatarDir = path.join(storagePath, "avatars");
  await mkdir(avatarDir, { recursive: true });

  const filename = `${session.user.id}.${extension}`;
  const filePath = path.join(avatarDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const imageUrl = `/api/avatars/${filename}`;
  await updateUserProfile(session.user.id, {
    name: session.user.name ?? "User",
    image: imageUrl,
  });

  return {
    success: true,
    data: { image: imageUrl },
  };
}
