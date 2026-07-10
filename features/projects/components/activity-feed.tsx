import Link from "next/link";
import { Bell } from "lucide-react";

import type { DashboardActivityItem } from "@/features/projects/lib/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityFeedProps {
  items: DashboardActivityItem[];
}

function formatActivityDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card className="h-full border-border/60 bg-card/40">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest notifications and events across your organization</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
              <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">No recent activity</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Activity from uploads, agent runs, and reports will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Recent activity">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-border/50 bg-card/30 p-3">
                {item.link ? (
                  <Link href={item.link} className="block hover:text-primary">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatActivityDate(item.createdAt)}
                    </p>
                  </Link>
                ) : (
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatActivityDate(item.createdAt)}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
