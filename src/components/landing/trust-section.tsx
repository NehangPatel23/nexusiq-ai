import { BookOpen, Cpu, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const trustPoints = [
  {
    icon: BookOpen,
    title: "Citations on every claim",
    description:
      "Every factual assertion links to source documents with page references and confidence levels.",
  },
  {
    icon: Cpu,
    title: "Local AI — your data stays yours",
    description:
      "Powered by Ollama. No documents sent to paid APIs. Full control over your data room.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence-first recommendations",
    description:
      "See source excerpts before conclusions. Agent opinions preserved in consensus views.",
  },
];

export function TrustSection() {
  return (
    <section className="px-4 py-20 md:px-6" aria-labelledby="trust-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 id="trust-heading" className="text-h2">
            Built for trust and transparency
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {trustPoints.map((point) => {
            const Icon = point.icon;
            return (
              <Card key={point.title} className="glass-panel border-border/50 text-center">
                <CardHeader className="items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{point.title}</CardTitle>
                  <CardDescription>{point.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
