import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { verifyPassword } from "@/features/auth/lib/password";
import { findUserByEmail } from "@/features/auth/lib/users";
import { loginSchema } from "@/features/auth/schemas";
import { isWithinGrace } from "@/features/history/lib/constants";
import { prisma } from "@/lib/db";

import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  events: {
    async signIn({ user }) {
      if (!user?.id || user.accountStatus === "pending_deletion") return;
      try {
        const memberships = await prisma.organizationMember.findMany({
          where: { userId: user.id, organization: { deletedAt: null } },
          select: { organizationId: true },
          take: 5,
        });
        const { logAudit } = await import("@/features/history/lib/audit");
        await Promise.all(
          memberships.map((m) =>
            logAudit({
              organizationId: m.organizationId,
              userId: user.id,
              action: "LOGIN",
              entityType: "User",
              entityId: user.id,
            }),
          ),
        );
      } catch (error) {
        console.error("[auth] LOGIN audit failed", error);
      }
    },
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await findUserByEmail(parsed.data.email);
        if (!user) {
          return null;
        }

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        if (user.deletedAt) {
          if (!isWithinGrace(user.purgeAfter)) {
            // Expired tombstone — treat as invalid credentials for the provider;
            // signInWithCredentials surfaces a clearer message before calling signIn.
            return null;
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            accountStatus: "pending_deletion" as const,
          };
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          accountStatus: "active" as const,
        };
      },
    }),
  ],
});
