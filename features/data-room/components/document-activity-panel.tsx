"use client";

import { Clock, FileUp, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import type { DataRoomDocument } from "../lib/types";

type ActivityEvent = {
  id: string;
  type: "uploaded" | "version" | "updated";
  label: string;
  detail: string;
  at: string;
};

interface DocumentActivityPanelProps {
  document: DataRoomDocument | null;
  className?: string;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function EventIcon({ type }: { type: ActivityEvent["type"] }) {
  if (type === "version") return <RefreshCw className="size-3.5" aria-hidden />;
  if (type === "updated") return <Clock className="size-3.5" aria-hidden />;
  return <FileUp className="size-3.5" aria-hidden />;
}

export function DocumentActivityPanel({ document, className }: DocumentActivityPanelProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);
    void fetch(`/api/documents/${document.id}/activity`)
      .then(async (res) => {
        const json = (await res.json()) as {
          success: boolean;
          data?: { events: ActivityEvent[] };
          error?: { message: string };
        };
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message ?? "Failed to load activity");
        }
        setEvents(json.data?.events ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      })
      .finally(() => setLoading(false));
  }, [document]);

  if (!document) return null;

  return (
    <section className={cn("space-y-2", className)} aria-label="Document activity">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Activity
      </h3>
      {loading && (
        <p className="text-xs text-muted-foreground" aria-busy="true">
          Loading activity…
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && (
        <ul className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex gap-2 rounded-lg border border-border/40 bg-background/40 px-2.5 py-2 text-xs"
            >
              <span className="mt-0.5 text-muted-foreground">
                <EventIcon type={event.type} />
              </span>
              <div className="min-w-0">
                <p className="font-medium">{event.label}</p>
                <p className="text-muted-foreground">{event.detail}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/80">{formatWhen(event.at)}</p>
              </div>
            </li>
          ))}
          {events.length === 0 && (
            <li className="text-xs text-muted-foreground">No activity recorded.</li>
          )}
        </ul>
      )}
    </section>
  );
}
