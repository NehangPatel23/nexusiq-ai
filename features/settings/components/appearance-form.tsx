"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateThemeAction } from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AppearanceForm({ initialTheme }: { initialTheme: string }) {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">(
    initialTheme === "light" ? "light" : "dark",
  );
  const [isPending, startTransition] = useTransition();

  function applyThemeClass(next: "dark" | "light") {
    const root = document.documentElement;
    if (next === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateThemeAction({ theme });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      applyThemeClass(theme);
      toast.success(`Theme set to ${theme}`);
      router.refresh();
    });
  }

  return (
    <div className="surface-elevated space-y-6 p-8">
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground">Choose dark or light theme for the dashboard.</p>
      </div>
      <fieldset className="space-y-3">
        <Legend className="sr-only">Theme</Legend>
        {(["dark", "light"] as const).map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-4 py-3"
          >
            <input
              type="radio"
              name="theme"
              value={option}
              checked={theme === option}
              onChange={() => {
                setTheme(option);
                applyThemeClass(option);
              }}
              className="accent-primary"
            />
            <Label className="cursor-pointer capitalize">{option}</Label>
          </label>
        ))}
      </fieldset>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save theme"}
      </Button>
    </div>
  );
}

function Legend({ children, className }: { children: React.ReactNode; className?: string }) {
  return <legend className={className}>{children}</legend>;
}
