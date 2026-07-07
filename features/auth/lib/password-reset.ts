import { randomBytes } from "crypto";

import { prisma } from "@/lib/db";

import { findUserByEmail } from "./users";

export function buildPasswordResetUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/reset-password?token=${token}`;
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({
    where: { email },
  });

  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function findValidPasswordResetToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record || record.expiresAt < new Date()) {
    return null;
  }

  return record;
}

export async function deletePasswordResetTokensForEmail(email: string) {
  await prisma.passwordResetToken.deleteMany({
    where: { email },
  });
}

export function logPasswordResetLink(email: string, token: string) {
  const resetUrl = buildPasswordResetUrl(token);
  if (process.env.NODE_ENV === "development") {
    console.log(`[dev] Password reset link for ${email}: ${resetUrl}`);
  }
}
