import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const accountStatus =
        (auth?.user as { accountStatus?: string } | undefined)?.accountStatus ?? "active";
      const isPendingDeletion = accountStatus === "pending_deletion";

      const isAuthRoute =
        nextUrl.pathname === "/login" ||
        nextUrl.pathname === "/register" ||
        nextUrl.pathname === "/forgot-password" ||
        nextUrl.pathname === "/reset-password";

      const isRecoverRoute = nextUrl.pathname.startsWith("/account/recover");

      const isProtectedRoute =
        nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname === "/onboarding";

      if (isRecoverRoute) {
        if (!isLoggedIn) {
          const loginUrl = new URL("/login", nextUrl);
          loginUrl.searchParams.set("callbackUrl", "/account/recover");
          return NextResponse.redirect(loginUrl);
        }
        return true;
      }

      if (isLoggedIn && isPendingDeletion) {
        if (!isRecoverRoute) {
          return NextResponse.redirect(new URL("/account/recover", nextUrl));
        }
        return true;
      }

      if (isProtectedRoute && !isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }

      const isInviteRoute = nextUrl.pathname.startsWith("/invite/");

      if (isAuthRoute && isLoggedIn) {
        if (isPendingDeletion) {
          return NextResponse.redirect(new URL("/account/recover", nextUrl));
        }
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }

      if (isInviteRoute && isLoggedIn) {
        return true;
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.accountStatus = user.accountStatus ?? "active";
      }
      if (trigger === "update" && session && typeof session === "object") {
        const userUpdate = (session as { user?: { accountStatus?: string } }).user;
        const nextStatus = userUpdate?.accountStatus;
        if (nextStatus === "active" || nextStatus === "pending_deletion") {
          token.accountStatus = nextStatus;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null | undefined;
        session.user.image = token.picture as string | null | undefined;
        session.user.accountStatus =
          (token.accountStatus as "active" | "pending_deletion" | undefined) ?? "active";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
