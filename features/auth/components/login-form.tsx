"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { PasswordField } from "@/features/auth/components/password-field";
import { signInWithCredentials } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [shakePassword, setShakePassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const input = {
      email: formData.get("email"),
      password,
    };

    startTransition(async () => {
      try {
        const result = await signInWithCredentials(input);
        if (!result.success) {
          if (result.error.fieldErrors) {
            setFieldErrors(result.error.fieldErrors);
            if (result.error.fieldErrors.password) {
              setShakePassword(true);
              window.setTimeout(() => setShakePassword(false), 450);
            }
          } else {
            setError(result.error.message);
            setShakePassword(true);
            window.setTimeout(() => setShakePassword(false), 450);
          }
        }
      } catch {
        // Redirect on success — Next.js throws
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Sign in</h2>
        <p className="text-sm text-muted-foreground">Access your decision intelligence workspace</p>
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
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {fieldErrors.email[0]}
            </p>
          )}
        </div>

        <PasswordField
          id="password"
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          mode="login"
          error={fieldErrors.password?.[0]}
          shake={shakePassword}
          labelAction={
            <Link
              href="/forgot-password"
              className="text-[13px] text-primary transition-colors hover:text-primary/80"
            >
              Forgot password?
            </Link>
          }
        />

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
