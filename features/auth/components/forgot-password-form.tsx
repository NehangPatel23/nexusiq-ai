"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { requestPasswordReset } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setDevResetUrl(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await requestPasswordReset({
        email: formData.get("email"),
      });

      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setError(result.error.message);
        }
        return;
      }

      setDevResetUrl(result.data?.devResetUrl ?? null);
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="space-y-6 text-center lg:text-left">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Check your email</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If an account exists for that email, a password reset link has been sent.
          </p>
        </div>

        {devResetUrl ? (
          <div
            className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-4 text-left"
            role="status"
          >
            <p className="text-sm font-medium text-primary">Development mode</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Email delivery is not configured locally. Use this link to reset your password:
            </p>
            <a
              href={devResetUrl}
              className="mt-3 block break-all text-sm font-medium text-primary hover:underline"
            >
              {devResetUrl}
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            In production, reset links are sent via email. In development, links only appear when
            the account exists.
          </p>
        )}

        <Link href="/login" className="inline-block text-sm font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Forgot password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "Sending…" : "Send reset link"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
