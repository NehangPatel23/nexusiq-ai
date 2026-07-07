import { Clock, Zap } from "lucide-react";

export function ProblemStrip() {
  return (
    <section className="border-y border-border bg-card/50 px-4 py-12 md:px-6" aria-labelledby="problem-heading">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center md:flex-row md:justify-center md:gap-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Clock className="h-8 w-8 text-warning" aria-hidden="true" />
          <span className="text-2xl font-semibold line-through decoration-destructive/60">
            Weeks
          </span>
        </div>
        <div className="text-2xl font-bold text-muted-foreground" aria-hidden="true">
          →
        </div>
        <div className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-success" aria-hidden="true" />
          <span id="problem-heading" className="text-2xl font-bold text-foreground">
            Minutes
          </span>
        </div>
        <p className="sr-only">
          Transform weeks of manual due diligence into minutes with AI-powered analysis
        </p>
      </div>
    </section>
  );
}
