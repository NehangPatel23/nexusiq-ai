import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const agents = [
  {
    name: "Financial",
    description: "Revenue quality, EBITDA adjustments, working capital, and debt covenants.",
    color: "bg-primary/10 text-primary",
  },
  {
    name: "Legal",
    description: "Contract review, litigation exposure, IP ownership, and regulatory filings.",
    color: "bg-accent/10 text-accent",
  },
  {
    name: "Compliance",
    description: "Policy gaps, regulatory requirements, and audit trail completeness.",
    color: "bg-success/10 text-success",
  },
  {
    name: "Risk",
    description: "Operational, market, and concentration risks with severity scoring.",
    color: "bg-warning/10 text-warning",
  },
  {
    name: "Fraud",
    description: "Anomaly detection, related-party transactions, and red flag patterns.",
    color: "bg-destructive/10 text-destructive",
  },
];

export function AgentShowcase() {
  return (
    <section className="bg-card/30 px-4 py-20 md:px-6" aria-labelledby="agents-heading">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 id="agents-heading" className="text-h2">
            Five specialized intelligence agents
          </h2>
          <p className="mt-4 text-muted-foreground">
            Multi-agent intelligence with explainable consensus — never a black box.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.name} className="border-border/50">
              <CardHeader>
                <Badge variant="outline" className={agent.color}>
                  {agent.name}
                </Badge>
                <CardTitle className="text-lg">{agent.name} Agent</CardTitle>
                <CardDescription>{agent.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
