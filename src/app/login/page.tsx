import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/login-form";
import { AuthCard, AuthLayout } from "@/components/layout/auth-layout";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Decisions backed by evidence"
      subtitle="Sign in to access your workspace, run intelligence agents, and review cited findings."
      footer={
        <Link href="/" className="transition-colors hover:text-foreground">
          ← Back to home
        </Link>
      }
    >
      <AuthCard>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
