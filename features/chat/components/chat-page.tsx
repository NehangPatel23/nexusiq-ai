"use client";

import type { ChatAgentType, ConfidenceLevel } from "@prisma/client";
import {
  Bot,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Pin,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppSelect } from "@/components/ui/app-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChatMessageContent } from "@/features/chat/components/chat-message-content";
import { ChatSourcePanel } from "@/features/chat/components/chat-source-panel";
import {
  dataRoomCitationHref,
  injectInlineCitationLinks,
  sourceIndexForCitation,
} from "@/features/chat/lib/citation-links";
import { formatAssistantContent } from "@/features/chat/lib/format-message";
import type {
  ChatDoneEvent,
  ChatMessageItem,
  ChatSessionItem,
  SourceChunk,
} from "@/features/chat/lib/types";
import { extractConfidenceLevel, scoreFromConfidenceLevel } from "@/lib/ai/confidence";
import { cn } from "@/lib/utils";

const AGENT_TYPES = [
  "GENERAL",
  "FINANCIAL",
  "LEGAL",
  "COMPLIANCE",
  "RISK",
  "FRAUD",
] as const satisfies readonly ChatAgentType[];

const CHAT_GROUP_ORDER = ["Pinned", "Today", "Yesterday", "Previous 7 days", "Older"] as const;

function formatAgentLabel(agent: ChatAgentType) {
  return agent.charAt(0) + agent.slice(1).toLowerCase();
}

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

interface ChatPageProps {
  projectId: string;
  projectName: string;
  initialChats: ChatSessionItem[];
}

function groupLabel(dateValue: string, pinned: boolean) {
  if (pinned) return "Pinned";
  const date = new Date(dateValue);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.floor((startToday - startDate) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  return "Older";
}

function confidenceVariant(confidence: ConfidenceLevel) {
  if (confidence === "HIGH") return "success" as const;
  if (confidence === "MEDIUM") return "warning" as const;
  if (confidence === "LOW") return "destructive" as const;
  return "outline" as const;
}

function ConfidenceBadge({
  confidence,
  score,
  reason,
  citationCount = 0,
}: {
  confidence: ConfidenceLevel;
  score?: number | null;
  reason?: string | null;
  citationCount?: number;
}) {
  const displayScore = score ?? scoreFromConfidenceLevel(confidence, citationCount);
  const label =
    confidence === "INSUFFICIENT"
      ? `Insufficient evidence · ${displayScore}%`
      : `${confidence.charAt(0) + confidence.slice(1).toLowerCase()} · ${displayScore}%`;

  return (
    <div className="flex max-w-full flex-col gap-1">
      <Badge
        variant={confidenceVariant(confidence)}
        aria-label={`Answer confidence: ${confidence.toLowerCase()}, ${displayScore} percent`}
      >
        {label}
      </Badge>
      {reason && (
        <span className="text-[11px] leading-4 text-muted-foreground">{reason}</span>
      )}
    </div>
  );
}

const MESSAGE_PAGE_SIZE = 50;

type SendMessageOptions = {
  regenerate?: boolean;
  replaceAssistantId?: string;
  editFromMessageId?: string;
  contextPrefix?: string;
};

function MessageActions({
  messageId,
  onCopy,
  onRetry,
  onEdit,
  showRetry,
  showEdit,
  retryAriaLabel = "Rerun query",
  copied,
}: {
  messageId: string;
  onCopy: () => void;
  onRetry?: () => void;
  onEdit?: () => void;
  showRetry?: boolean;
  showEdit?: boolean;
  retryAriaLabel?: string;
  copied: boolean;
}) {
  return (
    <div className="mt-2 flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy message"}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
      {showEdit && onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          aria-label="Edit message"
        >
          <Pencil aria-hidden="true" />
        </Button>
      )}
      {showRetry && onRetry && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onRetry}
          aria-label={retryAriaLabel}
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      )}
      <span className="sr-only" id={`message-actions-${messageId}`}>
        Message actions
      </span>
    </div>
  );
}

export function ChatPage({ projectId, projectName, initialChats }: ChatPageProps) {
  const [chats, setChats] = useState(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChats[0]?.id ?? null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [sources, setSources] = useState<SourceChunk[]>([]);
  const [agentType, setAgentType] = useState<ChatAgentType>(
    initialChats[0]?.agentType ?? "GENERAL",
  );
  const [input, setInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(Boolean(initialChats[0]));
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ChatSessionItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<ChatSessionItem | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [readyDocumentCount, setReadyDocumentCount] = useState<number | null>(null);
  const [pendingDocumentCount, setPendingDocumentCount] = useState(0);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [mobileSourcesOpen, setMobileSourcesOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const contextPrefixRef = useRef<string | null>(null);
  const handoffSentRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const newChatStarted = useRef(false);
  const skipNextMessageLoad = useRef<string | null>(null);
  const searchParams = useSearchParams();

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;

  const groupedChats = useMemo(() => {
    const groups = new Map<string, ChatSessionItem[]>();
    for (const chat of chats) {
      const label = groupLabel(chat.updatedAt, chat.pinned);
      groups.set(label, [...(groups.get(label) ?? []), chat]);
    }
    return CHAT_GROUP_ORDER.filter((label) => groups.has(label)).map(
      (label) => [label, groups.get(label)!] as const,
    );
  }, [chats]);

  const refreshChats = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/chats`);
    if (!response.ok) return;
    const result = await readApi<{ items: ChatSessionItem[] }>(response);
    if (result.success) setChats(result.data.items);
  }, [projectId]);

  const readApi = useCallback(async <T,>(response: Response): Promise<ApiEnvelope<T>> => {
    return (await response.json()) as ApiEnvelope<T>;
  }, []);

  const loadLatestMessages = useCallback(
    async (chatId: string, signal?: AbortSignal) => {
      const metaResponse = await fetch(
        `/api/chats/${chatId}/messages?page=1&pageSize=${MESSAGE_PAGE_SIZE}`,
        { signal },
      );
      const metaResult = await readApi<{
        items: ChatMessageItem[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>(metaResponse);
      if (!metaResult.success) throw new Error(metaResult.error.message);

      const lastPage = Math.max(1, Math.ceil(metaResult.data.total / MESSAGE_PAGE_SIZE));
      if (lastPage === 1) {
        setMessagePage(1);
        setHasMoreOlder(false);
        return metaResult.data.items;
      }

      const response = await fetch(
        `/api/chats/${chatId}/messages?page=${lastPage}&pageSize=${MESSAGE_PAGE_SIZE}`,
        { signal },
      );
      const result = await readApi<{
        items: ChatMessageItem[];
        total: number;
        page: number;
      }>(response);
      if (!result.success) throw new Error(result.error.message);
      setMessagePage(lastPage);
      setHasMoreOlder(lastPage > 1);
      return result.data.items;
    },
    [readApi],
  );

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      setLoadingMessages(false);
      setHasMoreOlder(false);
      return;
    }
    if (skipNextMessageLoad.current === activeChatId) {
      skipNextMessageLoad.current = null;
      setLoadingMessages(false);
      return;
    }
    const controller = new AbortController();
    setLoadingMessages(true);
    setError(null);
    void loadLatestMessages(activeChatId, controller.signal)
      .then((items) => {
        setMessages(items);
        const cited = [...items].reverse().find((message) => message.citations.length);
        setSources(
          cited?.citations.map((citation) => ({
            ...citation,
            content: citation.excerpt,
            pageNumber: null,
            sectionTitle: null,
          })) ?? [],
        );
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      })
      .finally(() => setLoadingMessages(false));
    return () => controller.abort();
  }, [activeChatId, loadLatestMessages]);

  useEffect(() => {
    if (searchParams.get("new") !== "1" || newChatStarted.current) return;
    newChatStarted.current = true;
    void fetch(`/api/projects/${projectId}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentType }),
    })
      .then((response) => readApi<ChatSessionItem>(response))
      .then((result) => {
        if (!result.success) throw new Error(result.error.message);
        setChats((current) => [result.data, ...current]);
        skipNextMessageLoad.current = result.data.id;
        setActiveChatId(result.data.id);
        setMessages([]);
        setSources([]);
      })
      .catch((createError: unknown) => {
        toast.error(createError instanceof Error ? createError.message : "Could not create chat");
      });
  }, [agentType, projectId, searchParams]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/projects/${projectId}/chat/suggested-questions?agentType=${agentType}`, {
      signal: controller.signal,
    })
      .then((response) =>
        readApi<{
          questions: string[];
          readyDocumentCount: number;
          pendingDocumentCount: number;
        }>(response),
      )
      .then((result) => {
        if (!result.success) return;
        setSuggestedQuestions(result.data.questions);
        setReadyDocumentCount(result.data.readyDocumentCount);
        setPendingDocumentCount(result.data.pendingDocumentCount);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [agentType, projectId]);

  useEffect(() => {
    function onComposerKeys(event: KeyboardEvent) {
      if (event.key === "/" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        textareaRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && streaming) {
        event.preventDefault();
        stopGeneration();
        return;
      }
      if (
        event.key === "ArrowUp" &&
        !input.trim() &&
        document.activeElement === textareaRef.current &&
        !streaming
      ) {
        const lastUser = [...messages].reverse().find((message) => message.role === "USER");
        if (lastUser) {
          event.preventDefault();
          setInput(lastUser.content);
          setEditingMessageId(lastUser.id);
        }
      }
    }
    window.addEventListener("keydown", onComposerKeys);
    return () => window.removeEventListener("keydown", onComposerKeys);
  }, [input, messages, streaming]);

  async function createNewChat(selectedAgent = agentType) {
    const response = await fetch(`/api/projects/${projectId}/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentType: selectedAgent }),
    });
    const result = await readApi<ChatSessionItem>(response);
    if (!result.success) throw new Error(result.error.message);
    setChats((current) => [result.data, ...current]);
    skipNextMessageLoad.current = result.data.id;
    setActiveChatId(result.data.id);
    setMessages([]);
    setSources([]);
    return result.data.id;
  }

  async function copyMessage(messageId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      toast.success("Copied to clipboard");
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === messageId ? null : current));
      }, 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  function parseEvent(block: string): { event: string; data: unknown } | null {
    const event = block.match(/^event:\s*(.+)$/m)?.[1];
    const data = block.match(/^data:\s*(.+)$/m)?.[1];
    if (!event || !data) return null;
    return { event, data: JSON.parse(data) };
  }

  function stopGeneration() {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStreaming(false);
    toast.info("Generation stopped");
  }

  async function loadOlderMessages() {
    if (!activeChatId || loadingOlder || !hasMoreOlder || messagePage <= 1) return;
    setLoadingOlder(true);
    try {
      const previousPage = messagePage - 1;
      const response = await fetch(
        `/api/chats/${activeChatId}/messages?page=${previousPage}&pageSize=${MESSAGE_PAGE_SIZE}`,
      );
      const result = await readApi<{ items: ChatMessageItem[] }>(response);
      if (!result.success) throw new Error(result.error.message);
      setMessages((current) => [...result.data.items, ...current]);
      setMessagePage(previousPage);
      setHasMoreOlder(previousPage > 1);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Could not load earlier messages");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function exportChat() {
    if (!activeChatId) return;
    try {
      const response = await fetch(`/api/chats/${activeChatId}/export`);
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `chat-${activeChatId.slice(0, 8)}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Chat exported");
    } catch {
      toast.error("Could not export chat");
    }
  }

  async function sendMessage(question = input, options?: SendMessageOptions) {
    const content = question.trim();
    if (!content || streaming) return;

    setError(null);
    setLastQuestion(content);
    let chatId = activeChatId;
    try {
      if (!chatId) chatId = await createNewChat();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create chat");
      return;
    }

    const previousMessages = messages;
    const now = new Date().toISOString();
    let assistantId: string;
    const editFromMessageId = options?.editFromMessageId ?? editingMessageId ?? undefined;
    const contextPrefix =
      options?.contextPrefix ?? contextPrefixRef.current ?? undefined;

    if (options?.regenerate && options.replaceAssistantId) {
      assistantId = options.replaceAssistantId;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: "",
                citations: [],
                confidence: null,
                confidenceScore: null,
                confidenceReason: null,
              }
            : message,
        ),
      );
    } else {
      const userId = `pending-user-${Date.now()}`;
      assistantId = `pending-assistant-${Date.now()}`;
      setMessages((current) => {
        const base =
          editFromMessageId != null
            ? current.slice(
                0,
                Math.max(0, current.findIndex((message) => message.id === editFromMessageId)),
              )
            : current;
        return [
          ...base,
          {
            id: userId,
            role: "USER" as const,
            content,
            citations: [],
            confidence: null,
            createdAt: now,
          },
          {
            id: assistantId,
            role: "ASSISTANT" as const,
            content: "",
            citations: [],
            confidence: null,
            createdAt: now,
          },
        ];
      });
      setEditingMessageId(null);
    }

    setInput("");
    setStreaming(true);
    if (!options?.regenerate) setSources([]);

    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          regenerate: options?.regenerate ?? false,
          editFromMessageId,
          contextPrefix,
        }),
        signal: abortController.signal,
      });
      if (!response.ok) {
        const result = await readApi<never>(response);
        throw new Error(result.success ? "Chat request failed" : result.error.message);
      }
      if (!response.body) throw new Error("Chat stream did not start");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (true) {
        if (abortController.signal.aborted) break;
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const parsed = parseEvent(block);
          if (!parsed) continue;
          if (parsed.event === "token") {
            const { delta } = parsed.data as { delta: string };
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + delta }
                  : message,
              ),
            );
          } else if (parsed.event === "done") {
            completed = true;
            const doneEvent = parsed.data as ChatDoneEvent;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      id: doneEvent.messageId,
                      content: doneEvent.content,
                      citations: doneEvent.citations,
                      confidence: doneEvent.confidence,
                      confidenceScore: doneEvent.confidenceScore,
                      confidenceReason: doneEvent.confidenceReason ?? null,
                    }
                  : message,
              ),
            );
            setSources(doneEvent.retrievedChunks);
            if (
              doneEvent.confidence === "INSUFFICIENT" &&
              doneEvent.retrievedChunks.length === 0
            ) {
              toast.info("The data room did not contain enough relevant evidence.");
            }
          } else if (parsed.event === "error") {
            const streamError = parsed.data as { message: string };
            throw new Error(streamError.message);
          }
        }
        if (done) break;
      }

      if (!completed && !abortController.signal.aborted) {
        throw new Error("Chat stream ended before completion");
      }
      if (completed) await refreshChats();
    } catch (sendError) {
      if (sendError instanceof Error && sendError.name === "AbortError") {
        setMessages((current) =>
          current.filter((message) => message.id !== assistantId || message.content.trim()),
        );
      } else {
        setMessages(previousMessages);
        const message = sendError instanceof Error ? sendError.message : "Chat failed";
        setError(message);
        toast.error(message);
      }
    } finally {
      streamAbortRef.current = null;
      setStreaming(false);
      contextPrefixRef.current = null;
      textareaRef.current?.focus();
    }
  }

  function rerunQuery(userMessageId: string) {
    const index = messages.findIndex((message) => message.id === userMessageId);
    if (index < 0 || streaming) return;

    const userMessage = messages[index];
    if (userMessage?.role !== "USER" || userMessage.id.startsWith("pending-")) return;

    const assistant = messages[index + 1];
    const isLatestPair =
      assistant?.role === "ASSISTANT" &&
      !assistant.id.startsWith("pending-") &&
      index === messages.length - 2;

    if (isLatestPair) {
      void sendMessage(userMessage.content, {
        regenerate: true,
        replaceAssistantId: assistant.id,
      });
      return;
    }

    void sendMessage(userMessage.content, { editFromMessageId: userMessageId });
  }

  function rerunFromAssistant(assistantMessageId: string) {
    const index = messages.findIndex((message) => message.id === assistantMessageId);
    if (index <= 0 || streaming) return;
    const userMessage = messages[index - 1];
    if (userMessage?.role !== "USER") return;
    rerunQuery(userMessage.id);
  }

  async function patchChat(chat: ChatSessionItem, update: Partial<ChatSessionItem>) {
    const response = await fetch(`/api/chats/${chat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const result = await readApi<ChatSessionItem>(response);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setChats((current) => current.map((item) => (item.id === chat.id ? result.data : item)));
  }

  function openRenameDialog(chat: ChatSessionItem) {
    setRenameTarget(chat);
    setRenameTitle(chat.title ?? "New chat");
  }

  async function confirmRename() {
    if (!renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      toast.error("Chat title cannot be empty");
      return;
    }
    setRenaming(true);
    await patchChat(renameTarget, { title });
    setRenaming(false);
    setRenameTarget(null);
  }

  async function changeAgent(nextAgent: ChatAgentType) {
    setAgentType(nextAgent);
    if (activeChat) {
      await patchChat(activeChat, { agentType: nextAgent });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const response = await fetch(`/api/chats/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!response.ok) {
      const result = await readApi<never>(response);
      toast.error(result.success ? "Could not delete chat" : result.error.message);
      return;
    }
    const remaining = chats.filter((chat) => chat.id !== deleteTarget.id);
    setChats(remaining);
    if (activeChatId === deleteTarget.id) setActiveChatId(remaining[0]?.id ?? null);
    setDeleteTarget(null);
    toast.success("Chat deleted");
  }

  useEffect(() => {
    const question = searchParams.get("q");
    const context = searchParams.get("context");
    if (context) contextPrefixRef.current = context;
    if (question) setInput(question);
    if (question && searchParams.get("ask") === "1" && !handoffSentRef.current && !streaming) {
      handoffSentRef.current = true;
      void sendMessage(question, { contextPrefix: context ?? undefined });
    }
  }, [searchParams, streaming]);

  const showNoReadyDocs = readyDocumentCount === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Interactive Chat</h1>
          <p className="text-sm text-muted-foreground">
            Evidence-first answers across {projectName}&apos;s processed documents.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeChatId && (
            <Button variant="outline" size="sm" onClick={() => void exportChat()}>
              <Download aria-hidden="true" />
              Export
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => void createNewChat().catch((createError: Error) => toast.error(createError.message))}
          >
            <MessageSquarePlus aria-hidden="true" />
            New chat
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid h-[min(760px,calc(100vh-11rem))] min-h-[650px] overflow-hidden rounded-2xl border border-border/60 bg-card/30",
          sourcesOpen
            ? "lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_280px]"
            : "lg:grid-cols-[230px_minmax(0,1fr)]",
        )}
      >
        <aside className="min-h-0 max-h-56 overflow-y-auto border-b border-border/60 p-3 lg:max-h-none lg:border-b-0 lg:border-r">
          {chats.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">
              No chat history yet.
            </div>
          ) : (
            groupedChats.map(([label, items]) => (
              <section key={label} className="mb-4" aria-labelledby={`chat-group-${label}`}>
                <h2
                  id={`chat-group-${label}`}
                  className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {label}
                </h2>
                <ul className="space-y-1">
                  {items.map((chat) => (
                    <li key={chat.id} className="group flex items-center">
                      <button
                        type="button"
                        className={cn(
                          "min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          activeChatId === chat.id
                            ? "bg-primary/12 text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                        onClick={() => {
                          setActiveChatId(chat.id);
                          setAgentType(chat.agentType);
                        }}
                      >
                        <span className="flex items-center gap-2">
                          {chat.pinned && <Pin className="h-3 w-3 shrink-0" aria-label="Pinned" />}
                          <span className="truncate">{chat.title ?? "New chat"}</span>
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-70 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                            aria-label={`Actions for ${chat.title ?? "New chat"}`}
                          >
                            <MoreHorizontal aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openRenameDialog(chat)}>
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void patchChat(chat, { pinned: !chat.pinned })}>
                            {chat.pinned ? "Unpin" : "Pin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(chat)}
                          >
                            <Trash2 aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="truncate text-sm font-medium">{activeChat?.title ?? "New conversation"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 xl:hidden"
                onClick={() => setMobileSourcesOpen(true)}
                aria-label="Show source context"
              >
                <PanelRightOpen />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-8 w-8 xl:flex"
                onClick={() => setSourcesOpen((value) => !value)}
                aria-label={sourcesOpen ? "Hide source context" : "Show source context"}
              >
                {sourcesOpen ? <PanelRightClose /> : <PanelRightOpen />}
              </Button>
            </div>
          </div>

          <div
            className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6"
            aria-live="polite"
            aria-busy={streaming}
          >
            {showNoReadyDocs && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                No processed documents are ready in this data room yet.
                {pendingDocumentCount > 0
                  ? ` ${pendingDocumentCount} file${pendingDocumentCount === 1 ? " is" : "s are"} still processing.`
                  : " Upload and process files before expecting cited answers."}{" "}
                <Link
                  href={`/dashboard/projects/${projectId}/data-room`}
                  className="font-medium underline underline-offset-2"
                >
                  Open data room
                </Link>
              </div>
            )}
            {hasMoreOlder && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingOlder}
                  onClick={() => void loadOlderMessages()}
                >
                  {loadingOlder ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : null}
                  Load earlier messages
                </Button>
              </div>
            )}
            {loadingMessages ? (
              <div className="space-y-4" aria-label="Loading messages">
                <div className="h-20 w-3/4 animate-pulse rounded-2xl bg-muted/50" />
                <div className="ml-auto h-14 w-1/2 animate-pulse rounded-2xl bg-primary/10" />
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <Sparkles className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold">Ask your data room</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Answers use retrieved project evidence and include validated source citations.
                </p>
                <div className="mt-6 flex max-h-48 flex-wrap justify-center gap-2 overflow-y-auto px-1">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="rounded-full border border-border/80 bg-muted/30 px-3 py-2 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => void sendMessage(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const baseContent =
                  message.role === "ASSISTANT"
                    ? formatAssistantContent(message.content)
                    : message.content;
                const displayContent =
                  message.role === "ASSISTANT" && message.citations.length > 0
                    ? injectInlineCitationLinks(baseContent, projectId, message.citations)
                    : baseContent;
                const streamingConfidence =
                  message.role === "ASSISTANT" && !message.confidence
                    ? extractConfidenceLevel(message.content)
                    : null;
                const effectiveConfidence = message.confidence ?? streamingConfidence;
                const isStreamingAssistant =
                  message.role === "ASSISTANT" && !message.content && streaming;
                const canCopy = Boolean(displayContent.trim());
                const canRerunAssistant =
                  message.role === "ASSISTANT" &&
                  !streaming &&
                  !message.id.startsWith("pending-") &&
                  index > 0 &&
                  messages[index - 1]?.role === "USER";
                const canRerunUser =
                  message.role === "USER" &&
                  !streaming &&
                  !message.id.startsWith("pending-") &&
                  messages[index + 1]?.role === "ASSISTANT" &&
                  !messages[index + 1]?.id.startsWith("pending-");
                const canEdit =
                  message.role === "USER" &&
                  !streaming &&
                  !message.id.startsWith("pending-");

                return (
                  <article
                    key={message.id}
                    className={cn(
                      "group/message max-w-[88%] rounded-2xl border px-4 py-3",
                      message.role === "USER"
                        ? "ml-auto border-primary/20 bg-primary/12"
                        : "border-border/60 bg-background/50",
                    )}
                    aria-label={message.role === "USER" ? "Your message" : "Assistant response"}
                  >
                    {isStreamingAssistant ? (
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2
                          className="h-4 w-4 animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                        Retrieving evidence and analyzing…
                      </span>
                    ) : message.role === "ASSISTANT" ? (
                      <ChatMessageContent content={displayContent} />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-6">{displayContent}</p>
                    )}
                    {canCopy && (
                      <MessageActions
                        messageId={message.id}
                        copied={copiedMessageId === message.id}
                        onCopy={() => void copyMessage(message.id, baseContent)}
                        showEdit={canEdit}
                        onEdit={
                          canEdit
                            ? () => {
                                setInput(message.content);
                                setEditingMessageId(message.id);
                                textareaRef.current?.focus();
                              }
                            : undefined
                        }
                        showRetry={canRerunUser || canRerunAssistant}
                        retryAriaLabel={
                          message.role === "USER" ? "Rerun query" : "Rerun response"
                        }
                        onRetry={
                          canRerunUser
                            ? () => rerunQuery(message.id)
                            : canRerunAssistant
                              ? () => rerunFromAssistant(message.id)
                              : undefined
                        }
                      />
                    )}
                    {message.role === "ASSISTANT" &&
                      (effectiveConfidence || message.citations.length > 0) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                          {effectiveConfidence && (
                            <ConfidenceBadge
                              confidence={effectiveConfidence}
                              score={message.confidenceScore}
                              reason={message.confidenceReason}
                              citationCount={message.citations.length}
                            />
                          )}
                          {message.citations.map((citation, citationIndex) => (
                            <Link
                              key={`${citation.documentId}:${citation.chunkId}`}
                              href={dataRoomCitationHref(
                                projectId,
                                citation,
                                sourceIndexForCitation(citation, [], message.citations) ||
                                  citationIndex + 1,
                              )}
                              className="inline-flex items-center gap-1 rounded-full border border-border/80 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <FileText className="h-3 w-3" aria-hidden="true" />
                              {citation.documentName}
                            </Link>
                          ))}
                        </div>
                      )}
                  </article>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          <div className="border-t border-border/60 bg-background/40 p-3 sm:p-4">
            {error && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <span>{error}</span>
                {lastQuestion && (
                  <Button variant="ghost" size="sm" onClick={() => void sendMessage(lastQuestion)}>
                    Retry
                  </Button>
                )}
              </div>
            )}
            {editingMessageId && (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                <span>Editing a previous message — sending will replace later turns.</span>
                <Button variant="ghost" size="sm" onClick={() => setEditingMessageId(null)}>
                  Cancel
                </Button>
              </div>
            )}
            <div className="rounded-xl border border-border/70 bg-card/60 focus-within:ring-2 focus-within:ring-ring">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(undefined, {
                      editFromMessageId: editingMessageId ?? undefined,
                    });
                  }
                }}
                rows={3}
                maxLength={4000}
                disabled={streaming}
                placeholder="Ask a question about this project…"
                aria-label="Chat message"
                className="w-full resize-none bg-transparent px-3 pt-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Agent
                  <AppSelect
                    value={agentType}
                    disabled={streaming}
                    onValueChange={(value) => void changeAgent(value as ChatAgentType)}
                    triggerClassName="h-8 w-[8.5rem] text-xs"
                    aria-label="Chat agent"
                    options={AGENT_TYPES.map((agent) => ({
                      value: agent,
                      label: formatAgentLabel(agent),
                    }))}
                  />
                </label>
                <div className="flex items-center gap-2">
                  {streaming && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={stopGeneration}
                      aria-label="Stop generating"
                    >
                      <Square className="fill-current" aria-hidden="true" />
                      Stop
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={streaming || !input.trim()}
                    onClick={() =>
                      void sendMessage(undefined, {
                        editFromMessageId: editingMessageId ?? undefined,
                      })
                    }
                    aria-label="Send message"
                  >
                    {streaming ? (
                      <Loader2 className="animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Send />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Enter to send · Shift+Enter for a new line · ⌘/ to focus · Esc to stop · ↑ to edit
              last
            </p>
          </div>
        </main>

        {sourcesOpen && (
          <aside
            className="hidden min-h-0 flex-col overflow-hidden border-l border-border/60 p-4 xl:flex"
            aria-label="Source context"
          >
            <ChatSourcePanel projectId={projectId} sources={sources} className="flex min-h-0 flex-1 flex-col" />
          </aside>
        )}
      </div>

      <Dialog open={mobileSourcesOpen} onOpenChange={setMobileSourcesOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Source context</DialogTitle>
            <DialogDescription>Evidence used for the latest answer.</DialogDescription>
          </DialogHeader>
          <ChatSourcePanel projectId={projectId} sources={sources} className="min-h-0 flex-1 overflow-hidden" />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>Choose a title that helps you find this conversation later.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            maxLength={120}
            aria-label="Chat title"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void confirmRename();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRenameTarget(null)} disabled={renaming}>
              Cancel
            </Button>
            <Button onClick={() => void confirmRename()} disabled={renaming || !renameTitle.trim()}>
              {renaming ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this chat?"
        description="The conversation and all of its messages will be permanently deleted."
        confirmLabel="Delete chat"
        variant="destructive"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
