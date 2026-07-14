"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateNotificationPrefsAction } from "@/features/settings/actions";
import type { NotificationPrefs } from "@/features/settings/lib/notification-prefs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
  emailDigest: {
    title: "Email digest",
    description: "Optional daily summary (email delivery is not enabled in this MVP).",
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
    <div className="surface-elevated space-y-6 p-8">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">Choose which in-app alerts you want to receive.</p>
      </div>
      <ul className="space-y-4">
        {(Object.keys(LABELS) as Array<keyof NotificationPrefs>).map((key) => (
          <li key={key} className="flex items-start justify-between gap-4">
            <div>
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
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                prefs[key] ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-transform ${
                  prefs[key] ? "translate-x-5" : ""
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save preferences"}
      </Button>
    </div>
  );
}
