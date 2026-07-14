import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary",
        secondary: "border-border bg-secondary/80 text-secondary-foreground",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        outline: "border-border/80 text-foreground",
        accent: "border-accent/20 bg-accent/10 text-accent",
        success: "border-success/20 bg-success/10 text-success",
        warning: "border-warning/20 bg-warning/10 text-warning",
        orange:
          "border-risk-high/40 bg-risk-high/15 text-orange-900 dark:border-risk-high/30 dark:bg-risk-high/10 dark:text-risk-high",
        yellow:
          "border-amber-600/35 bg-amber-500/15 text-amber-950 dark:border-risk-medium/30 dark:bg-risk-medium/10 dark:text-risk-medium",
        info: "border-sky-600/30 bg-sky-500/12 text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
