import Link from "next/link";
import { Bell } from "lucide-react";

import type { DashboardActivityItem } from "@/features/projects/lib/dashboard";
import { DASHBOARD_PANEL_HEIGHT_CLASS } from "@/features/projects/lib/dashboard-panels";
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
    <Card className={`flex ${DASHBOARD_PANEL_HEIGHT_CLASS} flex-col border-border/60 bg-card/40`}>
      <CardHeader className="shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest notifications and events across your organization</CardDescription>
          </div>
          {items.length > 0 ? (
            <p className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-right">
              <span className="text-lg font-semibold tabular-nums leading-none">{items.length}</span>
              <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                Events
              </span>
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
              <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">No recent activity</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Activity from uploads, agent runs, and reports will appear here.
            </p>
          </div>
        ) : (
          <ul
            className="scrollbar-premium h-full space-y-3 overflow-y-auto px-6 pb-6"
            aria-label="Recent activity"
          >
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
