"use client";

import { motion, useReducedMotion } from "framer-motion";

import { NexusMark } from "@/components/brand/nexus-mark";
import { cn } from "@/lib/utils";

interface ProductPreviewProps {
  className?: string;
  variant?: "default" | "hero";
  animated?: boolean;
}

const barWidths = [72, 58, 84, 45, 67];

export function ProductPreview({
  className,
  variant = "default",
  animated = true,
}: ProductPreviewProps) {
  const isHero = variant === "hero";
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animated && !reduceMotion;

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-[hsl(228,26%,7%)] shadow-soft",
        isHero ? "rounded-3xl" : "rounded-xl",
        className,
      )}
      aria-hidden="true"
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-2 border-b border-border/50 bg-card/80 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-md bg-muted/40 px-3 py-1">
          <NexusMark size={14} />
          <div className="h-2 w-20 rounded bg-muted/60" />
        </div>
      </div>

      <div className={cn("flex", isHero ? "min-h-[300px]" : "min-h-[200px]")}>
        <div className="w-[22%] shrink-0 border-r border-border/40 bg-card/40 p-3">
          <div className="mb-4 flex items-center gap-1.5">
            <NexusMark size={16} />
            <div className="h-2 w-10 rounded bg-muted/50" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className={cn("h-7 rounded-lg", i === 1 ? "bg-primary/20" : "bg-muted/30")}
                initial={shouldAnimate ? { opacity: 0, x: -8 } : false}
                animate={shouldAnimate ? { opacity: 1, x: 0 } : undefined}
                transition={{ delay: 0.1 + i * 0.06 }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="grid grid-cols-4 gap-2">
            {[12, 847, 3, 5].map((val, i) => (
              <motion.div
                key={i}
                className="rounded-lg border border-border/40 bg-card/50 p-2.5"
                initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <div className="mb-2 h-2 w-8 rounded bg-muted/40" />
                <div className="font-mono text-xs font-medium text-foreground/80">{val}</div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-1 gap-3">
            <div className="flex-1 rounded-xl border border-border/40 bg-card/40 p-3">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <div className="h-2.5 w-24 rounded bg-muted/40" />
              </div>
              <div className="space-y-2.5">
                {barWidths.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/30">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary/50 to-accent/40"
                        initial={shouldAnimate ? { width: 0 } : { width: `${w}%` }}
                        animate={{ width: `${w}%` }}
                        transition={{
                          duration: 1,
                          delay: 0.5 + i * 0.12,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              className="relative w-[38%] overflow-hidden rounded-xl border border-primary/25 bg-primary/5 p-3"
              animate={
                shouldAnimate
                  ? { boxShadow: ["0 0 0px hsl(var(--primary)/0)", "0 0 24px hsl(var(--primary)/0.15)", "0 0 0px hsl(var(--primary)/0)"] }
                  : undefined
              }
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <NexusMark size={14} glow />
                <div className="h-2 w-12 rounded bg-primary/30" />
              </div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                <span className="text-[10px] font-bold text-white">87%</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded bg-primary/25" />
                <div className="h-2 w-4/5 rounded bg-primary/15" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-16 left-1/2 h-32 w-2/3 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
    </motion.div>
  );
}
