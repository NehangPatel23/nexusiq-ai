"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { recoverAccountAction } from "@/features/settings/actions";
import { signOutUser } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function AccountRecoverPanel({
  email,
  purgeAfterIso,
}: {
  email: string;
  purgeAfterIso: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const purgeLabel = purgeAfterIso
    ? new Date(purgeAfterIso).toLocaleString()
    : "within 24 hours";

  function handleRecover() {
    startTransition(async () => {
      const result = await recoverAccountAction();
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Account recovered");
      router.push("/dashboard");
      router.refresh();
    });
  }

  function handleContinue() {
    startTransition(async () => {
      await signOutUser();
    });
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-8 px-4">
      <div className="space-y-3 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Account recovery</h1>
        <p className="text-muted-foreground">
          <span className="text-foreground">{email}</span> is scheduled for permanent deletion.
          You can restore it until {purgeLabel}, or continue deletion and sign out.
        </p>
      </div>
      <div className="surface-elevated space-y-4 p-8">
        <Button className="w-full" disabled={isPending} onClick={handleRecover}>
          {isPending ? "Working…" : "Restore my account"}
        </Button>
        <Button className="w-full" variant="outline" disabled={isPending} onClick={handleContinue}>
          Continue deletion & sign out
        </Button>
      </div>
    </div>
  );
}
