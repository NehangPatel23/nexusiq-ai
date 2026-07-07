"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, trend, className, delay = 0 }: StatCardProps) {
  const reduceMotion = useReducedMotion();

  const card = (
    <div className={cn("surface-card group p-6 transition-colors hover:border-primary/20", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-label">{label}</p>
          <p className="font-display text-3xl font-semibold tracking-[-0.03em]">
            <AnimatedNumber value={value} />
          </p>
          {trend && <p className="text-caption">{trend}</p>}
        </div>
        {Icon && (
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:text-primary"
            whileHover={reduceMotion ? undefined : { scale: 1.08, rotate: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </motion.div>
        )}
      </div>
    </div>
  );

  if (reduceMotion) return card;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...easeOut, delay }}
    >
      {card}
    </motion.div>
  );
}
