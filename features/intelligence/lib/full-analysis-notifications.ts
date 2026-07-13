import { createNotification } from "@/features/organizations/lib/notifications";

export function buildIntelligenceNotificationLink(
  projectId: string,
  tab?: "consensus" | "executive",
) {
  const base = `/dashboard/projects/${projectId}/intelligence`;
  return tab ? `${base}?tab=${tab}` : base;
}

export async function notifyBackgroundAnalysisCompleted(input: {
  userId: string;
  projectId: string;
  title: string;
  body: string;
  tab?: "consensus" | "executive";
}) {
  return createNotification({
    userId: input.userId,
    type: "SYSTEM",
    title: input.title,
    body: input.body,
    link: buildIntelligenceNotificationLink(input.projectId, input.tab),
  });
}
