import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "danger";
}

/** Shared elevated panel used across Settings sections. */
export function SettingsPanel({
  icon: Icon,
  title,
  description,
  children,
  className,
  tone = "default",
}: SettingsPanelProps) {
  return (
    <section
      className={cn(
        "surface-elevated space-y-6 p-6 md:p-8",
        tone === "danger" && "border-destructive/30",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              tone === "danger"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-primary/25 bg-primary/10 text-primary",
            )}
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0 space-y-1">
          <h2 className="text-h3 text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
