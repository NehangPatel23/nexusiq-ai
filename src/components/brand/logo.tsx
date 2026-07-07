import { cn } from "@/lib/utils";

import { NexusMark } from "./nexus-mark";
import { Wordmark } from "./wordmark";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}

const markSizes = {
  sm: 28,
  md: 32,
  lg: 40,
};

const containerSizes = {
  sm: "gap-2.5",
  md: "gap-3",
  lg: "gap-3.5",
};

export function Logo({
  className,
  showWordmark = true,
  size = "md",
  glow = false,
}: LogoProps) {
  return (
    <div className={cn("flex items-center", containerSizes[size], className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-[hsl(228,26%,9%)] to-[hsl(228,32%,6%)] p-1.5 shadow-soft",
          size === "sm" && "rounded-lg p-1",
          size === "lg" && "rounded-2xl p-2",
        )}
      >
        <NexusMark size={markSizes[size]} glow={glow} />
      </div>
      {showWordmark && <Wordmark size={size} />}
    </div>
  );
}
