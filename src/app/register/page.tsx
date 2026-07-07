import Link from "next/link";

import { RegisterForm } from "@/features/auth/components/register-form";
import { AuthCard, AuthLayout } from "@/components/layout/auth-layout";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Start your diligence workspace"
      subtitle="Create an account to upload data rooms, deploy AI agents, and generate evidence-backed reports."
      footer={
        <Link href="/" className="transition-colors hover:text-foreground">
          ← Back to home
        </Link>
      }
    >
      <AuthCard>
        <RegisterForm />
      </AuthCard>
    </AuthLayout>
  );
}
