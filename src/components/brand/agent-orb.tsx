"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface AgentOrbProps {
  name: string;
  score: number;
  icon: LucideIcon;
  color: string;
  ringColor: string;
  tags: string[];
  description: string;
  focus: string;
  className?: string;
  delay?: number;
}

export function AgentOrb({
  name,
  score,
  icon: Icon,
  color,
  ringColor,
  tags,
  description,
  focus,
  className,
  delay = 0,
}: AgentOrbProps) {
  const reduceMotion = useReducedMotion();
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  const content = (
    <article
      className={cn(
        "surface-elevated group relative flex h-full min-h-[380px] flex-col items-center gap-4 p-6 text-center transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow",
        className,
      )}
    >
      <div className="relative shrink-0">
        <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="6"
            opacity="0.5"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduceMotion ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: offset }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div
          className={cn(
            "absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br shadow-inner-soft transition-transform duration-300 group-hover:scale-105",
            color,
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-card px-2 py-0.5 text-[11px] font-semibold tabular-nums">
          {score}
        </span>
      </div>

      <div className="flex flex-1 flex-col space-y-3">
        <h3 className="text-h3">{name}</h3>
        <p className="text-xs font-medium text-primary/80">{focus}</p>
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:bg-primary/5"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );

  if (reduceMotion) return content;

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
    </motion.div>
  );
}
