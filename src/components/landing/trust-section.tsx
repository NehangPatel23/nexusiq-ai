"use client";

import { BookOpen, ChevronDown, Cpu, Link2, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { ScrollReveal, StaggerItem, StaggerReveal } from "@/components/motion/scroll-reveal";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

const trustArtifacts: {
  icon: LucideIcon;
  title: string;
  visual: string;
  description: string;
  details: string[];
  accent: string;
}[] = [
  {
    icon: BookOpen,
    title: "Citations on every claim",
    visual: "[doc:12 p.4]",
    description:
      "Every insight links to the exact page, paragraph, and document in your data room.",
    details: [
      "Click-through to source PDFs",
      "Page-level references",
      "Confidence scores per citation",
    ],
    accent: "border-primary/25 bg-primary/10 text-primary",
  },
  {
    icon: Cpu,
    title: "Local AI only",
    visual: "Ollama · On-prem",
    description:
      "Models run on your infrastructure via Ollama — no data leaves your environment.",
    details: [
      "Zero cloud API calls",
      "Air-gapped deployment ready",
      "Full model control",
    ],
    accent: "border-accent/25 bg-accent/10 text-accent",
  },
  {
    icon: ShieldCheck,
    title: "Evidence-first output",
    visual: "Source → Insight",
    description:
      "Agents retrieve before they reason — no hallucinated facts, only evidence-backed conclusions.",
    details: [
      "RAG over your documents",
      "Retrieval audit trail",
      "Unsupported claims flagged",
    ],
    accent: "border-success/25 bg-success/10 text-success",
  },
];

function TrustCard({ item, index }: { item: (typeof trustArtifacts)[0]; index: number }) {
  const Icon = item.icon;
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        "surface-card group relative flex h-full min-h-[300px] w-full flex-col items-center overflow-hidden p-8 text-center transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/25 hover:shadow-glow",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        expanded && "border-primary/25 shadow-glow",
      )}
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
    >
      <motion.div
        className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border ${item.accent}`}
        initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ ...easeOut, delay: index * 0.1 }}
        whileHover={reduceMotion ? undefined : { scale: 1.05 }}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </motion.div>

      <h3 className="text-h3 mb-2">{item.title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

      <div className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-3 font-mono text-xs text-muted-foreground transition-colors group-hover:border-primary/20 group-hover:bg-primary/5">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden="true" />
        <span>{item.visual}</span>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            className="w-full space-y-2 border-t border-border/40 pt-4 text-left"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {item.details.map((detail) => (
              <li key={detail} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1 w-1 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                {detail}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="mt-auto flex items-center gap-1 pt-4 text-xs font-medium text-primary">
        <span>{expanded ? "Show less" : "Learn more"}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

export function TrustSection() {
  return (
    <section className="section-padding" aria-labelledby="trust-heading" id="trust">
      <div className="page-container">
        <ScrollReveal className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-label mb-4">Trust</p>
          <h2 id="trust-heading" className="text-h2">
            Built for transparency
          </h2>
          <p className="mt-4 text-body-lg">
            Click any card to explore how NexusIQ keeps every decision auditable and evidence-backed.
          </p>
        </ScrollReveal>

        <StaggerReveal className="grid items-stretch gap-5 md:grid-cols-3">
          {trustArtifacts.map((item, index) => (
            <StaggerItem key={item.title} className="h-full">
              <TrustCard item={item} index={index} />
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
