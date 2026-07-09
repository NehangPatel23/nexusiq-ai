"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function WorkspacesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center"
    >
      <h2 className="text-lg font-semibold text-destructive">Unable to load workspaces</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {error.message || "Something went wrong while loading workspaces."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/organizations">Back to organizations</Link>
        </Button>
      </div>
    </div>
  );
}
