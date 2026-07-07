"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Platform" },
  { href: "#agents", label: "Agents" },
  { href: "#trust", label: "Trust" },
];

export function LandingHeader() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const headerBg = useTransform(
    scrollY,
    [0, 80],
    ["hsla(228, 30%, 6%, 0.55)", "hsla(228, 30%, 6%, 0.92)"],
  );

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => setScrolled(v > 20));
    return unsub;
  }, [scrollY]);

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-50 border-b border-border/30 backdrop-blur-xl",
        reduceMotion && "bg-background/80",
      )}
      style={reduceMotion ? undefined : { backgroundColor: headerBg }}
      initial={reduceMotion ? false : { y: -20, opacity: 0 }}
      animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
      transition={easeOut}
    >
      <div className="page-container flex h-[4.5rem] items-center justify-between gap-6 px-6 md:px-10 lg:px-16">
        <Link href="/" className="shrink-0 transition-opacity hover:opacity-90">
          <Logo glow />
        </Link>

        <nav
          className={`hidden items-center gap-1 rounded-full border px-1 py-1 transition-colors duration-300 md:flex ${
            scrolled ? "border-border/60 bg-card/60" : "border-border/40 bg-card/40"
          }`}
          aria-label="Landing sections"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <nav className="flex shrink-0 items-center gap-2 md:gap-3" aria-label="Landing navigation">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}
