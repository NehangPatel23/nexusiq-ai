"use client";

import { ArrowRight, Bot, Cpu, FileSearch, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { Logo } from "@/components/brand/logo";
import { NexusMark } from "@/components/brand/nexus-mark";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { Button } from "@/components/ui/button";
import { easeOut } from "@/lib/motion";

const stats = [
  { value: "5", label: "AI agents", icon: Bot },
  { value: "100%", label: "Cited output", icon: FileSearch },
  { value: "0", label: "Cloud API calls", icon: Shield },
  { value: "<5h", label: "First-pass scan", icon: Zap },
];

const badges = [
  { icon: Cpu, label: "Local AI", detail: "Ollama on-prem" },
  { icon: Shield, label: "Zero API cost", detail: "No vendor lock-in" },
  { icon: FileSearch, label: "Evidence-backed", detail: "Source-linked insights" },
];

const productLinks = [
  { href: "#features", label: "Platform" },
  { href: "#agents", label: "Agents" },
  { href: "#trust", label: "Trust" },
  { href: "/register", label: "Get started" },
];

const accountLinks = [
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Register" },
  { href: "/forgot-password", label: "Reset password" },
];

const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

const steps = [
  "Upload your data room",
  "Five agents analyze in parallel",
  "Review consensus with citations",
];

function FooterNavColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={`${title} links`} className="text-center md:text-left">
      <p className="mb-4 text-label">{title}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            {link.href.startsWith("#") ? (
              <a
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LandingFooter() {
  const reduceMotion = useReducedMotion();

  return (
    <footer className="border-t border-border/50 bg-card/20">
      <div className="border-b border-border/40 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="page-container px-6 py-14 md:px-10 lg:px-16">
          <ScrollReveal>
            <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
              <div className="flex flex-col items-center gap-6 sm:flex-row lg:items-center">
                <motion.div
                  animate={reduceMotion ? undefined : { rotate: [0, 360] }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                  className="hidden sm:block"
                >
                  <NexusMark size={56} glow />
                </motion.div>
                <div>
                  <h2 className="text-h2">Ready to accelerate diligence?</h2>
                  <p className="mt-2 max-w-md text-body-lg">
                    Start with a free workspace — upload your data room and get your first
                    evidence-backed report in hours.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-3">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Get started free
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/dashboard">View demo</Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  className="surface-card flex items-center gap-4 p-5 transition-colors hover:border-primary/20"
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...easeOut, delay: i * 0.06 }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-display text-2xl font-semibold tracking-[-0.03em]">
                      {stat.value}
                    </p>
                    <p className="text-caption">{stat.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="page-container px-6 py-16 md:px-10 lg:px-16">
        <ScrollReveal className="mx-auto max-w-3xl space-y-10 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <Logo glow />
            </div>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
              Enterprise decision intelligence with multi-agent AI, explainable consensus, and
              evidence-first diligence.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 sm:gap-8 sm:text-left lg:grid-cols-4">
            <FooterNavColumn title="Product" links={productLinks} />
            <FooterNavColumn title="Account" links={accountLinks} />
            <FooterNavColumn title="Legal" links={legalLinks} />

            <div className="text-center sm:text-left">
              <p className="mb-4 text-label">How it works</p>
              <ol className="space-y-3 text-sm text-muted-foreground">
                {steps.map((step, i) => (
                  <li key={step} className="flex items-start justify-center gap-3 sm:justify-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-left">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {badges.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-full border border-border/40 bg-background/40 px-4 py-2 transition-colors hover:border-primary/20 hover:bg-primary/5"
              >
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <div className="text-left">
                  <p className="text-xs font-medium">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <div className="mt-12 flex flex-col items-center gap-2 border-t border-border/40 pt-8 text-center">
          <p className="text-caption">
            © {new Date().getFullYear()} NexusIQ. All rights reserved.
          </p>
          <p className="text-caption">Built for enterprise teams · WCAG 2.2 AA · Local-first AI</p>
        </div>
      </div>
    </footer>
  );
}
