import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createPasswordResetToken,
  deletePasswordResetTokensForEmail,
  findValidPasswordResetToken,
} from "../lib/password-reset";
import { verifyPassword } from "../lib/password";
import { createUser, findUserByEmail, updateUserPassword } from "../lib/users";
import { prisma } from "@/lib/db";

const testEmail = `auth-integration-${Date.now()}@example.com`;
const testPassword = "IntegrationTest123";

describe("auth integration", () => {
  beforeAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it("creates a user with a bcrypt password hash", async () => {
    const user = await createUser({
      name: "Integration User",
      email: testEmail,
      password: testPassword,
    });

    expect(user.email).toBe(testEmail);

    const stored = await findUserByEmail(testEmail);
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe(testPassword);
    expect(await verifyPassword(testPassword, stored!.passwordHash)).toBe(true);
  });

  it("creates a password reset token for existing users", async () => {
    const token = await createPasswordResetToken(testEmail);
    expect(token).not.toBeNull();

    const stored = await prisma.passwordResetToken.findFirst({
      where: { email: testEmail },
    });
    expect(stored).not.toBeNull();
    expect(stored?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns null reset token when user does not exist", async () => {
    const token = await createPasswordResetToken("missing-user@example.com");
    expect(token).toBeNull();
  });

  it("resets a user password with a valid token", async () => {
    const token = await createPasswordResetToken(testEmail);
    expect(token).not.toBeNull();

    const record = await findValidPasswordResetToken(token!);
    expect(record?.email).toBe(testEmail);

    const newPassword = "UpdatedPassword123";
    await updateUserPassword(testEmail, newPassword);
    await deletePasswordResetTokensForEmail(testEmail);

    const stored = await findUserByEmail(testEmail);
    expect(await verifyPassword(newPassword, stored!.passwordHash)).toBe(true);
    expect(await verifyPassword(testPassword, stored!.passwordHash)).toBe(false);
  });
});
