"use client";

import {
  AlertTriangle,
  Building2,
  FileWarning,
  Scale,
  ShieldAlert,
} from "lucide-react";

import { AgentOrb } from "@/components/brand/agent-orb";
import { NexusMark } from "@/components/brand/nexus-mark";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { motion, useReducedMotion } from "framer-motion";

const agents = [
  {
    name: "Financial",
    score: 91,
    icon: Building2,
    color: "from-primary/20 to-primary/5 text-primary",
    ringColor: "hsl(213, 94%, 62%)",
    focus: "Revenue & capital structure",
    description:
      "Analyzes P&L trends, working capital, debt covenants, and EBITDA adjustments with cited financials.",
    tags: ["Revenue", "EBITDA", "Debt"],
  },
  {
    name: "Legal",
    score: 87,
    icon: Scale,
    color: "from-accent/20 to-accent/5 text-accent",
    ringColor: "hsl(252, 78%, 68%)",
    focus: "Contracts & liability",
    description:
      "Reviews MSAs, change-of-control clauses, IP assignments, and pending litigation exposure.",
    tags: ["Contracts", "IP", "Litigation"],
  },
  {
    name: "Compliance",
    score: 84,
    icon: ShieldAlert,
    color: "from-success/20 to-success/5 text-success",
    ringColor: "hsl(152, 68%, 46%)",
    focus: "Regulatory & policy",
    description:
      "Flags GDPR gaps, SOC 2 controls, industry-specific regulations, and audit findings.",
    tags: ["Policy", "Audit", "Regulatory"],
  },
  {
    name: "Risk",
    score: 79,
    icon: AlertTriangle,
    color: "from-warning/20 to-warning/5 text-warning",
    ringColor: "hsl(38, 92%, 55%)",
    focus: "Operational & market",
    description:
      "Evaluates customer concentration, supply chain dependencies, and competitive positioning.",
    tags: ["Market", "Ops", "Concentration"],
  },
  {
    name: "Fraud",
    score: 76,
    icon: FileWarning,
    color: "from-destructive/20 to-destructive/5 text-destructive",
    ringColor: "hsl(0, 72%, 58%)",
    focus: "Anomalies & red flags",
    description:
      "Detects related-party transactions, revenue recognition issues, and inconsistent disclosures.",
    tags: ["Anomalies", "Related-party", "Red flags"],
  },
];

export function AgentShowcase() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="section-padding bg-card/20" aria-labelledby="agents-heading" id="agents">
      <div className="page-container">
        <ScrollReveal className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-6 flex justify-center">
            <motion.div
              animate={reduceMotion ? undefined : { rotate: [0, 360] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
              <NexusMark size={48} glow />
            </motion.div>
          </div>
          <p className="text-label mb-4 text-accent">Intelligence</p>
          <h2 id="agents-heading" className="text-h2">
            Five specialized agents
          </h2>
          <p className="mt-5 text-body-lg">
            Each agent scores, cites, and reports independently — consensus synthesizes with full
            transparency and conflict resolution.
          </p>
        </ScrollReveal>

        <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {agents.map((agent, index) => (
            <AgentOrb key={agent.name} {...agent} delay={index * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}
