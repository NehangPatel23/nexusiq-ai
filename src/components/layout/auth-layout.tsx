"use client";

import { BookOpen, Cpu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { Logo } from "@/components/brand/logo";
import { ProductPreview } from "@/components/brand/product-preview";
import { FloatingOrbs } from "@/components/motion/floating-orbs";
import { easeOut, fadeUp, slideFromLeft } from "@/lib/motion";
import { cn } from "@/lib/utils";

const trustIcons = [
  { icon: BookOpen, label: "Citations" },
  { icon: Cpu, label: "Local AI" },
  { icon: ShieldCheck, label: "Consensus" },
];

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}

export function AuthLayout({ children, title, subtitle, footer }: AuthLayoutProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" aria-hidden="true" />
      <FloatingOrbs />

      <div className="relative lg:grid lg:h-screen lg:grid-cols-2">
        <motion.aside
          className="hidden flex-col justify-between border-r border-border/50 bg-card/30 p-12 lg:flex lg:h-screen lg:overflow-hidden xl:p-16"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={slideFromLeft}
          transition={easeOut}
        >
          <Link href="/" className="w-fit transition-opacity hover:opacity-90">
            <Logo size="lg" glow />
          </Link>

          <div className="max-w-lg space-y-8">
            <div className="space-y-4">
              <p className="text-label text-primary">Enterprise Decision Intelligence</p>
              <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-[-0.03em] xl:text-5xl">
                {title}
              </h1>
              <p className="text-body-lg">{subtitle}</p>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ ...easeOut, delay: 0.2 }}
            >
              <ProductPreview className="opacity-90" />
            </motion.div>
          </div>

          <div
            className="flex items-center gap-6"
            aria-label="Evidence-backed insights, Local AI, Explainable consensus"
          >
            {trustIcons.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-muted-foreground">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-card/60">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                </div>
                <span className="text-caption">{label}</span>
              </div>
            ))}
          </div>
        </motion.aside>

        <div className="flex min-h-screen flex-col items-center justify-start px-6 py-12 md:px-10 lg:h-screen lg:overflow-y-auto lg:py-16">
          <div className="mb-8 w-full max-w-md lg:hidden">
            <Link href="/" className="inline-block transition-opacity hover:opacity-90">
              <Logo glow />
            </Link>
          </div>

          <motion.div
            className="w-full max-w-md"
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "visible"}
            variants={fadeUp}
            transition={{ ...easeOut, delay: 0.1 }}
          >
            {children}
          </motion.div>

          {footer && (
            <motion.div
              className="mt-8 text-center text-sm text-muted-foreground"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={reduceMotion ? undefined : { opacity: 1 }}
              transition={{ ...easeOut, delay: 0.25 }}
            >
              {footer}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "surface-elevated relative overflow-hidden p-8 md:p-10",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent",
        className,
      )}
    >
      {children}
    </div>
  );
}
