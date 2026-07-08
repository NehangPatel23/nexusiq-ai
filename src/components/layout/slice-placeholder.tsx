import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import type { SlicePlaceholderConfig } from "@/lib/slice-placeholders";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SlicePlaceholderProps {
  config: SlicePlaceholderConfig;
}

export function SlicePlaceholder({ config }: SlicePlaceholderProps) {
  const Icon = config.icon;

  return (
    <div className="space-y-8">
      <PageHeader title={config.title} description={config.description} />

      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-card/70 to-primary/5 p-8 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                  Slice {config.slice} — Coming soon
                </Badge>
                <span className="text-xs text-muted-foreground">{config.sliceLabel}</span>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                This module is part of the enterprise MVP roadmap. Auth and organizations are
                live — this slice is next in the build sequence.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </div>

      {config.highlights && config.highlights.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {config.highlights.map((highlight) => (
            <Card key={highlight} className="border-border/60 bg-card/40">
              <CardContent className="p-5">
                <p className="text-sm font-medium">{highlight}</p>
                <p className="mt-1 text-xs text-muted-foreground">Planned capability</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
