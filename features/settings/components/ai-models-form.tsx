"use client";

import { Server } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  testOllamaConnectionAction,
  updateAiSettingsAction,
} from "@/features/settings/actions";
import type { ConfigSource } from "@/features/settings/lib/ollama-config";
import { SettingsPanel } from "@/features/settings/components/settings-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AiFormProps = {
  initial: {
    baseUrl: string;
    chatModel: string;
    embedModel: string;
    sources: {
      baseUrl: ConfigSource;
      chatModel: ConfigSource;
      embedModel: ConfigSource;
    };
    apiKeyConfigured: boolean;
  };
};

function sourceBadge(source: ConfigSource) {
  const label = source === "env" ? "env" : source === "settings" ? "settings" : "default";
  return (
    <span className="ml-2 rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

export function AiModelsForm({ initial }: AiFormProps) {
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [chatModel, setChatModel] = useState(initial.chatModel);
  const [embedModel, setEmbedModel] = useState(initial.embedModel);
  const [sources, setSources] = useState(initial.sources);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateAiSettingsAction({ baseUrl, chatModel, embedModel });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("AI settings saved");
      try {
        const res = await fetch("/api/settings/ai");
        const json = (await res.json()) as {
          success: boolean;
          data?: typeof initial;
        };
        if (json.success && json.data) {
          setSources(json.data.sources);
          setBaseUrl(json.data.baseUrl);
          setChatModel(json.data.chatModel);
          setEmbedModel(json.data.embedModel);
        }
      } catch {
        /* ignore */
      }
    });
  }

  function handleTest() {
    startTestTransition(async () => {
      const result = await testOllamaConnectionAction();
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      const data = result.data!;
      if (data.status === "connected") {
        setTestStatus(`Connected to ${data.host}`);
        toast.success(`Connected to ${data.host}`);
      } else {
        setTestStatus(`Unreachable (${data.host}): ${data.error ?? "unknown error"}`);
        toast.error(`Unreachable: ${data.error ?? "unknown"}`);
      }
    });
  }

  return (
    <SettingsPanel
      icon={Server}
      title="AI Models"
      description="Configure Ollama used by chat, agents, and the simulator. Environment variables always win when set."
    >
      <div className="space-y-3 rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Localhost:</strong>{" "}
          <code className="rounded bg-muted/50 px-1.5 py-0.5 text-xs">http://localhost:11434</code>
        </p>
        <p>
          <strong className="text-foreground">Vercel:</strong> HTTPS Ollama URL +{" "}
          <code className="rounded bg-muted/50 px-1.5 py-0.5 text-xs">OLLAMA_API_KEY</code> in env
          (never shown in the browser)
        </p>
        <p>
          API key configured:{" "}
          <strong className="text-foreground">{initial.apiKeyConfigured ? "yes" : "no"}</strong>
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-4">
        <div className="space-y-2">
          <Label htmlFor="baseUrl">
            Base URL
            {sourceBadge(sources.baseUrl)}
          </Label>
          <Input
            id="baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434"
          />
          {sources.baseUrl === "env" ? (
            <p className="text-caption">Currently overridden by OLLAMA_BASE_URL env var.</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="chatModel">
              Chat model
              {sourceBadge(sources.chatModel)}
            </Label>
            <Input
              id="chatModel"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              placeholder="llama3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="embedModel">
              Embed model
              {sourceBadge(sources.embedModel)}
            </Label>
            <Input
              id="embedModel"
              value={embedModel}
              onChange={(e) => setEmbedModel(e.target.value)}
              placeholder="nomic-embed-text"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save settings"}
          </Button>
          <Button type="button" variant="outline" disabled={isTesting} onClick={handleTest}>
            {isTesting ? "Testing…" : "Test connection"}
          </Button>
        </div>
        {testStatus ? <p className="text-sm text-muted-foreground">{testStatus}</p> : null}
      </form>
    </SettingsPanel>
  );
}
