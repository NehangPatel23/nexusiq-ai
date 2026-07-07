import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-sm gap-0",
  md: "text-base gap-0",
  lg: "text-xl gap-0",
};

export function Wordmark({ className, size = "md" }: WordmarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-display font-semibold tracking-[-0.03em]",
        sizeClasses[size],
        className,
      )}
    >
      <span className="text-foreground">Nexus</span>
      <span className="bg-gradient-to-r from-primary via-[hsl(230,90%,68%)] to-accent bg-clip-text text-transparent">
        IQ
      </span>
    </span>
  );
}
