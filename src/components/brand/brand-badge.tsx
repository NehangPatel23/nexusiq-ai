import { cn } from "@/lib/utils";

import { NexusMark } from "./nexus-mark";

interface BrandBadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "primary" | "muted";
}

const variants = {
  default: "border-border/60 bg-card/70 text-muted-foreground",
  primary: "border-primary/25 bg-primary/10 text-primary",
  muted: "border-border/40 bg-muted/40 text-muted-foreground",
};

export function BrandBadge({ children, className, variant = "default" }: BrandBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium backdrop-blur-md",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function BrandBadgeWithMark({
  children,
  className,
  variant = "primary",
}: BrandBadgeProps) {
  return (
    <BrandBadge variant={variant} className={className}>
      <NexusMark size={14} />
      {children}
    </BrandBadge>
  );
}
