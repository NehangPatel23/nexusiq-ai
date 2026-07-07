"use client";

import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface InfiniteMarqueeProps {
  children: ReactNode;
  className?: string;
  /** Seconds for one full loop */
  speed?: number;
  gap?: string;
}

export function InfiniteMarquee({
  children,
  className,
  speed = 45,
  gap = "1rem",
}: InfiniteMarqueeProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-3 px-6", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background via-background/80 to-transparent sm:w-32"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background via-background/80 to-transparent sm:w-32"
        aria-hidden="true"
      />
      <div
        className="flex w-max animate-marquee"
        style={{ gap, animationDuration: `${speed}s` }}
      >
        <div className="flex shrink-0 items-center" style={{ gap }}>
          {children}
        </div>
        <div className="flex shrink-0 items-center" style={{ gap }} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
