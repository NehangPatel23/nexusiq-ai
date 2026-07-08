"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { acceptInviteAction } from "@/features/organizations/actions";
import { Button } from "@/components/ui/button";

interface AcceptInviteButtonProps {
  token: string;
  organizationName: string;
}

export function AcceptInviteButton({ token, organizationName }: AcceptInviteButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInviteAction(token);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      toast.success(`You joined ${organizationName}`);
      router.push(`/dashboard/organizations/${result.data?.organizationId}/settings`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <Button onClick={handleAccept} disabled={isPending} className="w-full" size="lg">
        {isPending ? "Joining…" : `Join ${organizationName}`}
      </Button>
    </div>
  );
}
