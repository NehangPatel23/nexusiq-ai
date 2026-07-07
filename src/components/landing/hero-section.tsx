"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, Play, Scale, TrendingUp, Users } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { BrandBadgeWithMark } from "@/components/brand/brand-badge";
import { ProductPreview } from "@/components/brand/product-preview";
import { FloatingOrbs } from "@/components/motion/floating-orbs";
import { Button } from "@/components/ui/button";
import { easeOut, fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

const audiences: {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
}[] = [
  {
    icon: Briefcase,
    label: "Analysts",
    description: "Model deals & validate assumptions with cited evidence",
    href: "#features",
  },
  {
    icon: TrendingUp,
    label: "CFOs",
    description: "Surface financial risks and red flags in hours, not weeks",
    href: "#agents",
  },
  {
    icon: Scale,
    label: "Legal",
    description: "Review contracts, IP, and litigation exposure at scale",
    href: "#agents",
  },
  {
    icon: Users,
    label: "Executives",
    description: "Get board-ready consensus reports with full audit trail",
    href: "#trust",
  },
];

function AudienceChip({
  icon: Icon,
  label,
  description,
  href,
}: (typeof audiences)[0]) {
  const [active, setActive] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <a
      href={href}
      className="group relative flex flex-col items-center"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      aria-label={`${label}: ${description}`}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-card/60 text-muted-foreground",
          "transition-all duration-300",
          "group-hover:scale-110 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary group-hover:shadow-glow",
          "group-focus-visible:scale-110 group-focus-visible:border-primary/40 group-focus-visible:bg-primary/10 group-focus-visible:text-primary group-focus-visible:shadow-glow group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-ring",
          active && "scale-110 border-primary/40 bg-primary/10 text-primary shadow-glow",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <span
        className={cn(
          "mt-2.5 text-xs font-medium transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {label}
      </span>

      <AnimatePresence>
        {active && !reduceMotion && (
          <motion.div
            className="absolute top-full z-20 mt-3 w-52 rounded-xl border border-border/60 bg-card/95 p-3 text-center shadow-soft backdrop-blur-md"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            role="tooltip"
          >
            <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            <p className="mt-2 text-[11px] font-medium text-primary">Explore →</p>
          </motion.div>
        )}
      </AnimatePresence>
    </a>
  );
}

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden section-padding pb-16 md:pb-24" aria-labelledby="hero-heading">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" aria-hidden="true" />
      <FloatingOrbs />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/15 via-accent/5 to-transparent blur-3xl"
        aria-hidden="true"
      />

      <div className="page-container relative">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          variants={reduceMotion ? undefined : staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="mb-8 flex justify-center" variants={fadeUp} transition={easeOut}>
            <BrandBadgeWithMark>Enterprise decision intelligence</BrandBadgeWithMark>
          </motion.div>

          <motion.h1
            id="hero-heading"
            className="text-display text-gradient"
            variants={fadeUp}
            transition={{ ...easeOut, delay: 0.05 }}
          >
            Enterprise decisions in minutes, not weeks
          </motion.h1>

          <motion.p
            className="mx-auto mt-8 max-w-2xl text-body-lg"
            variants={fadeUp}
            transition={{ ...easeOut, delay: 0.1 }}
          >
            Upload your data room. Multi-agent AI performs due diligence with evidence-backed
            insights, explainable consensus, and local-first security.
          </motion.p>

          <motion.div
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            variants={fadeUp}
            transition={{ ...easeOut, delay: 0.15 }}
          >
            <Button size="lg" asChild className="min-w-[180px]">
              <Link href="/register">
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="min-w-[180px]">
              <Link href="/dashboard">
                <Play className="h-4 w-4" aria-hidden="true" />
                View demo
              </Link>
            </Button>
          </motion.div>

          <motion.div
            className="mt-12"
            variants={fadeUp}
            transition={{ ...easeOut, delay: 0.2 }}
          >
            <p className="mb-5 text-label">Built for every stakeholder</p>
            <div
              className="flex flex-wrap items-start justify-center gap-6 sm:gap-8"
              role="list"
              aria-label="Built for analysts, CFOs, legal teams, and executives"
            >
              {audiences.map((audience) => (
                <div key={audience.label} role="listitem">
                  <AudienceChip {...audience} />
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative mx-auto mt-16 max-w-5xl"
          initial={reduceMotion ? false : { opacity: 0, y: 40 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ ...easeOut, delay: 0.35 }}
        >
          <motion.div
            className="absolute -inset-4 rounded-[2rem] bg-gradient-to-b from-primary/10 via-transparent to-transparent blur-2xl"
            animate={reduceMotion ? undefined : { opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ProductPreview variant="hero" className="relative" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
