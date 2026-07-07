"use client";

import { ArrowUpRight, Bot, FileSearch, FileText, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { ScrollReveal, StaggerItem, StaggerReveal } from "@/components/motion/scroll-reveal";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

const features: {
  icon: LucideIcon;
  title: string;
  description: string;
  highlights: string[];
  tags: string[];
  accent: string;
  metric: string;
  href: string;
}[] = [
  {
    icon: FileSearch,
    title: "Data Room",
    description:
      "Upload, organize, and version-control your entire deal room with OCR and full-text search.",
    highlights: ["Drag-and-drop folders", "PDF & Office OCR", "Version history"],
    tags: ["OCR", "Versions", "Folders"],
    accent: "from-primary/20 to-primary/5",
    metric: "10k+ docs",
    href: "#features",
  },
  {
    icon: Bot,
    title: "Multi-Agent AI",
    description:
      "Five specialized agents analyze financials, legal, compliance, risk, and fraud in parallel.",
    highlights: ["Local Ollama models", "RAG over your docs", "Per-agent scoring"],
    tags: ["5 agents", "Citations", "RAG"],
    accent: "from-accent/20 to-accent/5",
    metric: "6 modules",
    href: "#agents",
  },
  {
    icon: Users,
    title: "Consensus",
    description:
      "See how agents agree or conflict — every resolution shows votes, rationale, and sources.",
    highlights: ["Conflict detection", "Vote breakdown", "Resolution trail"],
    tags: ["Transparent", "Conflicts", "Votes"],
    accent: "from-[hsl(230,90%,68%)]/20 to-transparent",
    metric: "100% visible",
    href: "#trust",
  },
  {
    icon: FileText,
    title: "Reports",
    description:
      "Generate board-ready diligence summaries, risk registers, and exportable workpapers.",
    highlights: ["PDF & Excel export", "Board one-pagers", "Audit trail"],
    tags: ["PDF", "Board", "Excel"],
    accent: "from-success/20 to-success/5",
    metric: "7 formats",
    href: "#trust",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const Icon = feature.icon;
  const reduceMotion = useReducedMotion();

  const card = (
    <a
      href={feature.href}
      className="surface-card group relative flex h-full min-h-[320px] flex-col overflow-hidden p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />

      <div className="relative flex flex-1 flex-col">
        <div className="mb-5 flex items-start justify-between">
          <motion.div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 bg-gradient-to-br text-primary",
              feature.accent,
            )}
            whileHover={reduceMotion ? undefined : { scale: 1.08, rotate: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </motion.div>
          <span className="rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {feature.metric}
          </span>
        </div>

        <h3 className="text-h3 mb-2">{feature.title}</h3>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
          {feature.description}
        </p>

        <ul className="mb-4 space-y-1.5" aria-label={`${feature.title} highlights`}>
          {feature.highlights.map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1 w-1 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {feature.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border/40 bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
            aria-hidden="true"
          />
        </div>
      </div>
    </a>
  );

  if (reduceMotion) return card;

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...easeOut, delay: index * 0.08 }}
    >
      {card}
    </motion.div>
  );
}

export function FeatureGrid() {
  return (
    <section className="section-padding" aria-labelledby="features-heading" id="features">
      <div className="page-container">
        <ScrollReveal className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-label mb-4 text-primary">Platform</p>
          <h2 id="features-heading" className="text-h2">
            Everything for enterprise diligence
          </h2>
          <p className="mt-5 text-body-lg">
            Full data room support with citations, local AI, and evidence-first intelligence.
          </p>
        </ScrollReveal>

        <StaggerReveal className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => (
            <StaggerItem key={feature.title} className="h-full">
              <FeatureCard feature={feature} index={index} />
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
