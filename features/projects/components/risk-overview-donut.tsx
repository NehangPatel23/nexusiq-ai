"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskOverviewDonutProps {
  data: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export function RiskOverviewDonut({ data }: RiskOverviewDonutProps) {
  const chartData = [
    { name: "Critical", value: data.critical, fill: COLORS.critical },
    { name: "High", value: data.high, fill: COLORS.high },
    { name: "Medium", value: data.medium, fill: COLORS.medium },
    { name: "Low", value: data.low, fill: COLORS.low },
  ];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;

  return (
    <Card className="h-full border-border/60 bg-card/40">
      <CardHeader>
        <CardTitle>Risk overview</CardTitle>
        <CardDescription>Open risks by severity across your projects</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-48 w-48" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 text-sm" aria-label="Risk severity breakdown">
              {chartData.map((item) => (
                <li key={item.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                    aria-hidden="true"
                  />
                  <span>
                    {item.name}: {item.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div
              className="mb-4 flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-border/60"
              aria-hidden="true"
            >
              <span className="text-2xl font-semibold text-muted-foreground">—</span>
            </div>
            <p className="text-sm font-medium">No risk data yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Run intelligence agents on your projects to populate the risk overview.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
