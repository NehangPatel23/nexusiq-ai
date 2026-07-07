"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { ConfirmPasswordField, PasswordField } from "@/features/auth/components/password-field";
import { register } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [shakeFields, setShakeFields] = useState({ password: false, confirmPassword: false });
  const [isPending, startTransition] = useTransition();

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

    const formData = new FormData(event.currentTarget);
    const input = {
      name: formData.get("name"),
      email: formData.get("email"),
      password,
      confirmPassword,
      terms: termsAccepted,
    };

    startTransition(async () => {
      try {
        const result = await register(input);
        if (!result.success) {
          if (result.error.fieldErrors) {
            setFieldErrors(result.error.fieldErrors);
            if (result.error.fieldErrors.password) triggerShake("password");
            if (result.error.fieldErrors.confirmPassword) triggerShake("confirmPassword");
          } else {
            setError(result.error.message);
          }
        }
      } catch {
        // Redirect on success
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Create account</h2>
        <p className="text-sm text-muted-foreground">Start your enterprise diligence workspace</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate method="post">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            aria-invalid={!!fieldErrors.name}
          />
          {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
        </div>

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

        <PasswordField
          id="password"
          name="password"
          label="Password"
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

        <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              aria-invalid={!!fieldErrors.terms}
              aria-describedby="terms-description"
            />
            <p id="terms-description" className="text-sm leading-relaxed text-muted-foreground">
              <label htmlFor="terms" className="cursor-pointer">
                I agree to the{" "}
              </label>
              <Link href="/terms" className="font-medium text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
        {fieldErrors.terms && (
          <p className="text-sm text-destructive">
            You must accept the Terms of Service and Privacy Policy
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
