"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createOrganizationAction } from "@/features/organizations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const input = {
      name: formData.get("name"),
      description: formData.get("description") || undefined,
    };

    startTransition(async () => {
      const result = await createOrganizationAction(input);
      if (!result.success) {
        if (result.error.fieldErrors) {
          setFieldErrors(result.error.fieldErrors);
        } else {
          setError(result.error.message);
        }
        return;
      }

      toast.success("Organization created");
      router.push("/dashboard");
      router.refresh();
    });
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-h1 text-gradient">Welcome to NexusIQ</h1>
        <p className="text-body-lg text-muted-foreground">
          Create your first organization to get started. You can skip and do this later.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-6"
        noValidate
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="onboarding-org-name">Organization name</Label>
          <Input
            id="onboarding-org-name"
            name="name"
            required
            placeholder="Your company or team name"
            aria-invalid={!!fieldErrors.name}
          />
          {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding-org-description">Description (optional)</Label>
          <textarea
            id="onboarding-org-description"
            name="description"
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create organization"}
          </Button>
        </div>
      </form>
    </div>
  );
}
