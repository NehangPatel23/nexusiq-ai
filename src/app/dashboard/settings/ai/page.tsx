import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AiModelsForm } from "@/features/settings/components/ai-models-form";
import { getEffectiveOllamaConfig } from "@/features/settings/lib/system-settings";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "AI Models Settings" };

export default async function AiSettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const effective = await getEffectiveOllamaConfig();

  return (
    <AiModelsForm
      initial={{
        baseUrl: effective.baseUrl.value,
        chatModel: effective.chatModel.value,
        embedModel: effective.embedModel.value,
        sources: {
          baseUrl: effective.baseUrl.source,
          chatModel: effective.chatModel.source,
          embedModel: effective.embedModel.source,
        },
        apiKeyConfigured: effective.apiKeyConfigured,
      }}
    />
  );
}
