import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProjectTabPlaceholderProps {
  title: string;
  description: string;
  slice: number;
  sliceLabel: string;
  projectId: string;
  highlights?: string[];
}

export function ProjectTabPlaceholder({
  title,
  description,
  slice,
  sliceLabel,
  projectId,
  highlights,
}: ProjectTabPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-card/70 to-primary/5 p-8">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
              Coming in slice {slice}
            </Badge>
            <span className="text-xs text-muted-foreground">{sliceLabel}</span>
          </div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {highlights && highlights.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((highlight) => (
            <Card key={highlight} className="border-border/60 bg-card/40">
              <CardContent className="p-5">
                <p className="text-sm font-medium">{highlight}</p>
                <p className="mt-1 text-xs text-muted-foreground">Planned capability</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" asChild>
        <Link href={`/dashboard/projects/${projectId}`}>Back to overview</Link>
      </Button>
    </div>
  );
}
