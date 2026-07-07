import Link from "next/link";

import { Logo } from "@/components/brand/logo";

interface LegalPageProps {
  title: string;
  description: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, description, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/20">
        <div className="page-container flex h-[4.5rem] items-center justify-between px-6 md:px-10 lg:px-16">
          <Link href="/" className="transition-opacity hover:opacity-90">
            <Logo glow />
          </Link>
          <nav className="flex items-center gap-4 text-sm" aria-label="Legal navigation">
            <Link href="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/login" className="text-primary transition-colors hover:text-primary/80">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="page-container px-6 py-16 md:px-10 md:py-20 lg:px-16">
        <article className="mx-auto max-w-3xl">
          <header className="mb-12 border-b border-border/40 pb-8">
            <p className="text-label mb-3 text-primary">Legal</p>
            <h1 className="text-h1 mb-4">{title}</h1>
            <p className="text-body-lg">{description}</p>
            <p className="mt-4 text-caption">Last updated: {lastUpdated}</p>
          </header>

          <div className="prose-legal space-y-8">{children}</div>

          <footer className="mt-16 flex flex-wrap gap-4 border-t border-border/40 pt-8 text-sm text-muted-foreground">
            <Link href="/" className="transition-colors hover:text-foreground">
              ← Back to home
            </Link>
            <Link href="/register" className="transition-colors hover:text-foreground">
              Create account
            </Link>
          </footer>
        </article>
      </main>
    </div>
  );
}

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section>
      <h2 className="text-h3 mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
