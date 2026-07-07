import { prisma } from "@/lib/db";

import { hashPassword } from "./password";
import type { RegisterInput } from "../schemas";

export async function createUser(input: Pick<RegisterInput, "name" | "email" | "password">) {
  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      theme: "dark",
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function updateUserProfile(userId: string, data: { name: string; image?: string }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  });
}

export async function updateUserPassword(email: string, password: string) {
  const passwordHash = await hashPassword(password);

  return prisma.user.update({
    where: { email },
    data: { passwordHash },
    select: {
      id: true,
      email: true,
    },
  });
}
