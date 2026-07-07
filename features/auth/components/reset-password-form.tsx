"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmPasswordField, PasswordField } from "@/features/auth/components/password-field";
import { resetPassword } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [shakeFields, setShakeFields] = useState({ password: false, confirmPassword: false });
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="space-y-6 text-center lg:text-left">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Invalid link</h2>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or malformed. Please request a new one.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  function triggerShake(field: "password" | "confirmPassword") {
    setShakeFields((prev) => ({ ...prev, [field]: true }));
    window.setTimeout(() => {
      setShakeFields((prev) => ({ ...prev, [field]: false }));
    }, 450);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await resetPassword({
        token,
        password,
        confirmPassword,
      });

      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
          if (result.error.fieldErrors.password) triggerShake("password");
          if (result.error.fieldErrors.confirmPassword) triggerShake("confirmPassword");
        } else {
          setError(result.error.message);
        }
        return;
      }

      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="space-y-6 text-center lg:text-left">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Password updated</h2>
          <p className="text-sm text-muted-foreground">
            Your password has been reset. You can now sign in with your new credentials.
          </p>
        </div>
        <Button asChild className="w-full" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Set a new password</h2>
        <p className="text-sm text-muted-foreground">
          Choose a strong password that meets all requirements below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
            {error.includes("expired") && (
              <p className="mt-2">
                <Link href="/forgot-password" className="font-medium underline">
                  Request a new link
                </Link>
              </p>
            )}
          </div>
        )}

        <PasswordField
          id="password"
          name="password"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          mode="create"
          showRequirements
          confirmPassword={confirmPassword}
          showMatch={confirmPassword.length > 0}
          error={fieldErrors.password?.[0]}
          shake={shakeFields.password}
        />

        <ConfirmPasswordField
          id="confirmPassword"
          name="confirmPassword"
          value={confirmPassword}
          onChange={setConfirmPassword}
          password={password}
          error={fieldErrors.confirmPassword?.[0]}
          shake={shakeFields.confirmPassword}
        />

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
