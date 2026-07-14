import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  icon?: LucideIcon;
}

export function PageHeader({ title, description, className, children, icon: Icon }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
          ) : null}
          <h1 className="text-h1 text-gradient">{title}</h1>
        </div>
        {description && <p className="max-w-2xl text-body-lg">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
    </div>
  );
}
