import Link from "next/link";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { AuthCard, AuthLayout } from "@/components/layout/auth-layout";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll send a secure link if an account exists. In development, the link appears on screen instead of email."
      footer={
        <Link href="/login" className="transition-colors hover:text-foreground">
          ← Back to sign in
        </Link>
      }
    >
      <AuthCard>
        <ForgotPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
