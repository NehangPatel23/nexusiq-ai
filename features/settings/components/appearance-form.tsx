"use client";

import { Moon, Palette, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateThemeAction } from "@/features/settings/actions";
import { SettingsPanel } from "@/features/settings/components/settings-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    root.style.colorScheme = next;
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
    <SettingsPanel
      icon={Palette}
      title="Appearance"
      description="Choose dark or light theme for the dashboard. Preference is saved to your account."
    >
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Theme</legend>
        {(
          [
            {
              value: "dark" as const,
              label: "Dark",
              icon: Moon,
              hint: "Default premium look for long diligence sessions",
            },
            {
              value: "light" as const,
              label: "Light",
              icon: Sun,
              hint: "Cool daylight surfaces with the same blue accent",
            },
          ] as const
        ).map((option) => {
          const Icon = option.icon;
          const selected = theme === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-colors",
                selected
                  ? "border-primary/40 bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/60 bg-card/30 hover:border-border hover:bg-secondary/30",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={selected}
                onChange={() => {
                  setTheme(option.value);
                  applyThemeClass(option.value);
                }}
                className="sr-only"
              />
              <span className="flex items-center gap-2 font-medium">
                <Icon className="h-4 w-4 text-primary" aria-hidden />
                {option.label}
              </span>
              <span className="text-caption">{option.hint}</span>
              {/* Mini preview swatches */}
              <span
                className="mt-1 flex h-10 overflow-hidden rounded-lg border border-border/50"
                aria-hidden
              >
                {option.value === "dark" ? (
                  <>
                    <span className="w-1/3 bg-[#0b1220]" />
                    <span className="w-1/3 bg-[#141c2e]" />
                    <span className="w-1/3 bg-[#3b82f6]" />
                  </>
                ) : (
                  <>
                    <span className="w-1/3 bg-[#f4f6fa]" />
                    <span className="w-1/3 bg-white" />
                    <span className="w-1/3 bg-[#2563eb]" />
                  </>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save theme"}
      </Button>
    </SettingsPanel>
  );
}
