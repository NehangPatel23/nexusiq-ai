import Link from "next/link";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { AuthCard, AuthLayout } from "@/components/layout/auth-layout";

function ResetPasswordFallback() {
  return (
    <div className="space-y-4 text-center lg:text-left">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/40" />
      <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-muted/30" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter a new password to regain access to your workspace."
      footer={
        <Link href="/login" className="transition-colors hover:text-foreground">
          ← Back to sign in
        </Link>
      }
    >
      <AuthCard>
        <Suspense fallback={<ResetPasswordFallback />}>
          <ResetPasswordForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
