"use client";

import { Bell } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateNotificationPrefsAction } from "@/features/settings/actions";
import type { NotificationPrefs } from "@/features/settings/lib/notification-prefs";
import { SettingsPanel } from "@/features/settings/components/settings-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const LABELS: Record<keyof NotificationPrefs, { title: string; description: string }> = {
  processingComplete: {
    title: "Processing complete",
    description: "When a document finishes processing in the data room.",
  },
  riskFound: {
    title: "Risk found",
    description: "When agents surface a high or critical risk finding.",
  },
  taskAssigned: {
    title: "Task assigned",
    description: "When an action item is assigned to you.",
  },
};

export function NotificationsForm({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateNotificationPrefsAction(prefs);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Notification preferences saved");
    });
  }

  return (
    <SettingsPanel
      icon={Bell}
      title="Notifications"
      description="Choose which in-app alerts you want to receive."
    >
      <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
        {(Object.keys(LABELS) as Array<keyof NotificationPrefs>).map((key) => (
          <li
            key={key}
            className="flex items-start justify-between gap-4 bg-card/30 px-4 py-4"
          >
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor={key} className="text-sm font-medium">
                {LABELS[key].title}
              </Label>
              <p className="text-caption">{LABELS[key].description}</p>
            </div>
            <button
              id={key}
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              onClick={() => toggle(key)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                prefs[key] ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background transition-transform",
                  prefs[key] && "translate-x-5",
                )}
              />
            </button>
          </li>
        ))}
      </ul>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save preferences"}
      </Button>
    </SettingsPanel>
  );
}
