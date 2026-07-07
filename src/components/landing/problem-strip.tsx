"use client";

import { Calendar, CheckCircle2, Clock, FileText, Users, Zap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { easeOut } from "@/lib/motion";

const traditionalSteps = [
  { icon: FileText, label: "Manual doc triage", time: "5–7 days" },
  { icon: Users, label: "Cross-functional review", time: "1–2 weeks" },
  { icon: Calendar, label: "Report compilation", time: "3–5 days" },
];

const nexusSteps = [
  { icon: FileText, label: "Ingest & OCR", time: "~30 min" },
  { icon: Zap, label: "Parallel agent analysis", time: "2–3 hrs" },
  { icon: CheckCircle2, label: "Consensus report", time: "~1 hr" },
];

function BridgeConnector({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-2 py-4 lg:py-0">
      {/* Mobile: horizontal line */}
      <div className="relative h-2.5 w-full max-w-[140px] lg:hidden">
        <div
          className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-destructive/30 via-primary to-success/50"
          aria-hidden="true"
        />
        {!reduceMotion && (
          <motion.div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-glow"
            animate={{ left: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* Desktop: vertical line */}
      <div className="relative hidden h-[280px] w-2.5 lg:block">
        <div
          className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-destructive/30 via-primary to-success/50"
          aria-hidden="true"
        />
        {!reduceMotion && (
          <motion.div
            className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-glow"
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
    </div>
  );
}

export function ProblemStrip() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="border-y border-border/50 bg-card/20 py-16 md:py-24"
      aria-labelledby="problem-heading"
    >
      <div className="page-container px-6 md:px-10 lg:px-16">
        <ScrollReveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-label mb-3 text-primary">The difference</p>
          <h2 id="problem-heading" className="text-h2">
            First-pass diligence, dramatically faster
          </h2>
          <p className="mt-4 text-body-lg">
            Based on typical mid-market M&A workflows — initial data room review across financial,
            legal, and operational workstreams.
          </p>
        </ScrollReveal>

        <ScrollReveal className="mx-auto max-w-5xl">
          <div className="grid items-stretch gap-8 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
            <div className="surface-card flex flex-col gap-6 p-6 md:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive/70">
                  <Calendar className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-label">Traditional process</p>
                  <p className="font-display text-3xl font-medium text-muted-foreground/60 line-through decoration-destructive/40 md:text-4xl">
                    <AnimatedNumber value={21} suffix=" days" />
                  </p>
                  <p className="text-caption">~3 weeks avg. for initial review</p>
                </div>
              </div>

              <ul className="space-y-3" aria-label="Traditional diligence steps">
                {traditionalSteps.map(({ icon: Icon, label, time }) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1 text-sm text-muted-foreground">{label}</span>
                    <span className="font-mono text-xs text-muted-foreground/70">{time}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-auto text-caption">
                Requires coordinating analysts, legal, and finance across multiple review cycles.
              </p>
            </div>

            <BridgeConnector reduceMotion={reduceMotion} />

            <div className="surface-card flex flex-col gap-6 border-primary/20 p-6 md:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  <Clock className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-label text-primary">With NexusIQ</p>
                  <p className="font-display text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                    <AnimatedNumber value={5} suffix=" hours" />
                  </p>
                  <p className="text-caption text-primary/80">First-pass full-room scan</p>
                </div>
              </div>

              <ul className="space-y-3" aria-label="NexusIQ diligence steps">
                {nexusSteps.map(({ icon: Icon, label, time }) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="flex-1 text-sm">{label}</span>
                    <span className="font-mono text-xs text-primary/80">{time}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-muted/40">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-success"
                    initial={reduceMotion ? { width: "85%" } : { width: 0 }}
                    whileInView={{ width: "85%" }}
                    viewport={{ once: true }}
                    transition={{ ...easeOut, delay: 0.3, duration: 1 }}
                  />
                </div>
                <p className="text-caption">
                  Five agents run in parallel — every finding linked to source documents.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
