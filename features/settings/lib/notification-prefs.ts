export type NotificationPrefs = {
  processingComplete: boolean;
  riskFound: boolean;
  taskAssigned: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  processingComplete: true,
  riskFound: true,
  taskAssigned: true,
};

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFICATION_PREFS };
  const obj = raw as Record<string, unknown>;
  return {
    processingComplete:
      typeof obj.processingComplete === "boolean"
        ? obj.processingComplete
        : DEFAULT_NOTIFICATION_PREFS.processingComplete,
    riskFound:
      typeof obj.riskFound === "boolean" ? obj.riskFound : DEFAULT_NOTIFICATION_PREFS.riskFound,
    taskAssigned:
      typeof obj.taskAssigned === "boolean"
        ? obj.taskAssigned
        : DEFAULT_NOTIFICATION_PREFS.taskAssigned,
  };
}
