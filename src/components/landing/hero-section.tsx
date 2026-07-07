import Link from "next/link";

import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 py-24 md:px-6 md:py-32" aria-labelledby="hero-heading">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
          Enterprise Decision Intelligence
        </p>
        <h1 id="hero-heading" className="text-display text-foreground">
          Enterprise decisions in minutes, not weeks
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload your data room. AI performs due diligence with evidence-backed insights.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dashboard">View Demo</Link>
          </Button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Built for analysts, CFOs, legal teams, and executives
        </p>
      </div>
    </section>
  );
}
