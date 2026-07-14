import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accountStatus?: "active" | "pending_deletion";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    accountStatus?: "active" | "pending_deletion";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accountStatus?: "active" | "pending_deletion";
  }
}
