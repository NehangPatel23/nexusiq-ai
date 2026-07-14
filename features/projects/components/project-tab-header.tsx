import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ProjectTabHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Optional meta row under the description (badges, status chips). */
  meta?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Smart Search–style project tab header: glass card, icon badge, Title Case title.
 */
export function ProjectTabHeader({
  icon: Icon,
  title,
  description,
  meta,
  children,
  className,
}: ProjectTabHeaderProps) {
  return (
    <header
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-card/70 to-primary/5 p-6 md:p-8",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-8 left-1/4 h-32 w-32 rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {title}
            </h1>
          </div>
          {description ? (
            <div className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          ) : null}
          {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        {children ? (
          <div className="relative flex flex-wrap items-center gap-2">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
