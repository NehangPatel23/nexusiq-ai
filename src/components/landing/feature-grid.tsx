import { Bot, FileSearch, FileText, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: FileSearch,
    title: "Data Room",
    description:
      "Upload folders, bulk documents, and versions. Full OCR and classification with local processing.",
  },
  {
    icon: Bot,
    title: "Multi-Agent AI",
    description:
      "Financial, Legal, Compliance, Risk, and Fraud agents analyze your documents with citations.",
  },
  {
    icon: Users,
    title: "Consensus",
    description:
      "Explainable multi-agent synthesis — see every opinion, conflict, and resolution rationale.",
  },
  {
    icon: FileText,
    title: "Reports",
    description:
      "Executive summaries, board memos, risk registers, and exportable action plans.",
  },
];

export function FeatureGrid() {
  return (
    <section className="px-4 py-20 md:px-6" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 id="features-heading" className="text-h2">
            Everything you need for enterprise diligence
          </h2>
          <p className="mt-4 text-muted-foreground">
            Full data room support with citations, local AI, and evidence-first intelligence.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="glass-panel border-border/50">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-h3">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
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
