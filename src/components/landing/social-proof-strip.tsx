"use client";

import {
  Briefcase,
  Building,
  FileSearch,
  Scale,
  Shield,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { InfiniteMarquee } from "@/components/motion/infinite-marquee";

const roles: { label: string; icon: LucideIcon; useCase: string }[] = [
  { label: "M&A Advisory", icon: TrendingUp, useCase: "Deal screening & LOI support" },
  { label: "Legal Operations", icon: Scale, useCase: "Contract & IP diligence" },
  { label: "CFO Office", icon: Building, useCase: "Financial risk assessment" },
  { label: "Due Diligence", icon: FileSearch, useCase: "Full data room review" },
  { label: "Corp Dev", icon: Briefcase, useCase: "Target evaluation & integration" },
  { label: "Risk & Compliance", icon: Shield, useCase: "Regulatory & policy gaps" },
  { label: "Private Equity", icon: TrendingUp, useCase: "Portfolio company audits" },
  { label: "Investment Banking", icon: Building, useCase: "Sell-side preparation" },
];

function RolePill({ label, icon: Icon, useCase }: (typeof roles)[0]) {
  return (
    <div className="group flex w-56 shrink-0 flex-col gap-1 rounded-2xl border border-border/50 bg-card/60 px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 hover:shadow-glow">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-background/50 text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
      </div>
      <p className="pl-[2.625rem] text-[11px] leading-snug text-muted-foreground">{useCase}</p>
    </div>
  );
}

export function SocialProofStrip() {
  return (
    <section
      className="overflow-hidden border-y border-border/40 bg-card/20 py-10"
      aria-label="Built for enterprise teams"
    >
      <p className="mb-6 text-center text-label">Built for enterprise teams</p>

      <InfiniteMarquee speed={50} gap="1rem">
        {roles.map((role) => (
          <RolePill key={role.label} {...role} />
        ))}
      </InfiniteMarquee>
    </section>
  );
}
