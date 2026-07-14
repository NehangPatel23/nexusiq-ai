"use client";

import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  GripVertical,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectTabHeader } from "@/features/projects/components/project-tab-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBackgroundTasks } from "@/features/actions/hooks/use-background-tasks";
import {
  startBackgroundFromFindings,
  startBackgroundSuggest,
} from "@/features/actions/lib/background-tasks-runner";
import type { TaskView } from "@/features/actions/lib/tasks";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type MemberOption = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
};

type FindingOption = {
  id: string;
  title: string;
  description: string;
  severity: string | null;
  agentType: string;
  documentId: string | null;
};

type ActionsPageProps = {
  projectId: string;
  projectName: string;
  initialTasks: TaskView[];
  initialMembers: MemberOption[];
};

const KANBAN_COLUMNS: Array<{
  status: TaskStatus;
  label: string;
  hint: string;
  accent: string;
}> = [
  {
    status: "TODO",
    label: "Todo",
    hint: "Queued follow-ups",
    accent: "border-t-sky-400/70",
  },
  {
    status: "IN_PROGRESS",
    label: "In Progress",
    hint: "Actively owned",
    accent: "border-t-amber-400/70",
  },
  {
    status: "DONE",
    label: "Done",
    hint: "Cleared items",
    accent: "border-t-emerald-400/70",
  },
];

const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"];

const PRIORITY_RANK: Record<TaskPriority, number> = {
  CRITICAL: 0,
  URGENT: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

function priorityBadgeClass(priority: TaskPriority) {
  switch (priority) {
    case "CRITICAL":
      return "border-rose-500/50 bg-rose-500/15 text-rose-100";
    case "URGENT":
      return "border-orange-500/50 bg-orange-500/15 text-orange-100";
    case "HIGH":
      return "border-amber-500/45 bg-amber-500/12 text-amber-100";
    case "MEDIUM":
      return "border-sky-500/35 bg-sky-500/10 text-sky-100";
    default:
      return "border-border/60 bg-muted/30 text-muted-foreground";
  }
}

function displayName(member: { name: string | null; email: string } | null | undefined) {
  if (!member) return "Unassigned";
  return member.name?.trim() || member.email;
}

function initials(member: { name: string | null; email: string } | null | undefined) {
  if (!member) return "?";
  const base = member.name?.trim() || member.email;
  const parts = base.split(/[\s@]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

function isOverdue(dueDate: string | null, status: TaskStatus) {
  if (!dueDate || status === "DONE") return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function ActionsPageClient({
  projectId,
  projectName,
  initialTasks,
  initialMembers,
}: ActionsPageProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [members] = useState(initialMembers);
  const [busy, setBusy] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const background = useBackgroundTasks(projectId);
  const prevTasksStatus = useRef(background.status);
  const bulkBusy = background.status === "running";

  const [addOpen, setAddOpen] = useState(false);
  const [findingOpen, setFindingOpen] = useState(false);
  const [findings, setFindings] = useState<FindingOption[]>([]);
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [impact, setImpact] = useState("");

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.status === "CANCELLED") return false;
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;
      if (assigneeFilter === "UNASSIGNED" && task.assigneeId) return false;
      if (
        assigneeFilter !== "ALL" &&
        assigneeFilter !== "UNASSIGNED" &&
        task.assigneeId !== assigneeFilter
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, priorityFilter, assigneeFilter]);

  const columns = useMemo(() => {
    const map: Record<string, TaskView[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const task of filteredTasks) {
      if (map[task.status]) map[task.status].push(task);
    }
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) =>
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          (a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY) -
            (b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY),
      );
    }
    return map;
  }, [filteredTasks]);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "CANCELLED");
    return {
      total: active.length,
      todo: active.filter((t) => t.status === "TODO").length,
      inProgress: active.filter((t) => t.status === "IN_PROGRESS").length,
      done: active.filter((t) => t.status === "DONE").length,
      unassigned: active.filter((t) => !t.assigneeId && t.status !== "DONE").length,
      overdue: active.filter((t) => isOverdue(t.dueDate, t.status)).length,
      linked: active.filter((t) => t.findingId).length,
    };
  }, [tasks]);

  useEffect(() => {
    if (prevTasksStatus.current === "running" && background.status === "idle") {
      if (background.result?.tasks.length) {
        setTasks((prev) => {
          const existing = new Set(prev.map((t) => t.id));
          const fresh = background.result!.tasks.filter((t) => !existing.has(t.id));
          return fresh.length ? [...fresh, ...prev] : prev;
        });
      }
    }
    prevTasksStatus.current = background.status;
  }, [background.status, background.result]);

  async function patchTask(taskId: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as ApiEnvelope<TaskView>;
    if (!json.success) {
      toast.error(json.error.message);
      return null;
    }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? json.data : t)));
    return json.data;
  }

  async function handleCreateTask() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          assigneeId: assigneeId || null,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          impact: impact.trim() || null,
        }),
      });
      const json = (await response.json()) as ApiEnvelope<TaskView>;
      if (!json.success) {
        toast.error(json.error.message);
        return;
      }
      setTasks((prev) => [json.data, ...prev]);
      setAddOpen(false);
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setPriority("MEDIUM");
      setDueDate("");
      setImpact("");
      toast.success("Task created");
    } finally {
      setBusy(false);
    }
  }

  async function openFindingPicker() {
    setFindingOpen(true);
    setLoadingFindings(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/from-findings`);
      const json = (await response.json()) as ApiEnvelope<{ findings: FindingOption[] }>;
      if (!json.success) {
        toast.error(json.error.message);
        return;
      }
      setFindings(json.data.findings);
      setSelectedFindingIds([]);
    } finally {
      setLoadingFindings(false);
    }
  }

  async function addFromFindings(includeExecutiveActions: boolean, findingIds?: string[]) {
    if (includeExecutiveActions) {
      startBackgroundSuggest(projectId);
      return;
    }
    if (!findingIds?.length) {
      toast.error("Select at least one finding");
      return;
    }
    const started = startBackgroundFromFindings(projectId, findingIds);
    if (started) setFindingOpen(false);
  }

  async function handleDelete(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    const json = (await response.json()) as ApiEnvelope<{ id: string; deleted: true }>;
    if (!json.success) {
      toast.error(json.error.message);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast.success("Task removed");
  }

  function onDropStatus(status: TaskStatus) {
    if (!dragTaskId) return;
    const task = tasks.find((t) => t.id === dragTaskId);
    setDragTaskId(null);
    setDragOverStatus(null);
    if (!task || task.status === status) return;
    void patchTask(task.id, { status });
  }

  return (
    <div className="space-y-6">
      <ProjectTabHeader
        icon={ClipboardList}
        title="Action Plan"
        description="Prioritize diligence follow-ups, assign owners, and keep a clear link back to findings. Suggest / add-from-finding keep running if you navigate away. Works fully offline from Ollama."
      >
          <Button variant="outline" onClick={() => void openFindingPicker()}>
            <Link2 className="mr-2 h-4 w-4" aria-hidden />
            Add from finding
          </Button>
          <Button
            variant="secondary"
            disabled={busy || bulkBusy}
            onClick={() => void addFromFindings(true)}
          >
            {bulkBusy && background.kind === "suggest" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            )}
            Suggest from intelligence
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add task
          </Button>
      </ProjectTabHeader>

      {tasks.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-card/40 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Pipeline
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.todo} todo · {stats.inProgress} active · {stats.done} done
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/40 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Unassigned
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.unassigned}</p>
            <p className="mt-1 text-xs text-muted-foreground">Open items without an owner</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/40 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Overdue
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                stats.overdue > 0 && "text-amber-200",
              )}
            >
              {stats.overdue}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Past due and still open</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/40 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Linked findings
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.linked}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link
                href={`/dashboard/projects/${projectId}/risks`}
                className="text-primary underline-offset-2 hover:underline"
              >
                Review risks overview
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/20 px-6 py-16 text-center">
          <ClipboardList className="mx-auto mb-3 h-9 w-9 text-muted-foreground/80" aria-hidden />
          <p className="text-lg font-medium">No action items yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Create a task manually, pull open findings into the board, or suggest items from
            executive priority actions.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Create first task
            </Button>
            <Button variant="outline" onClick={() => void openFindingPicker()}>
              Add from finding
            </Button>
            <Button variant="secondary" disabled={busy || bulkBusy} onClick={() => void addFromFindings(true)}>
              Suggest from intelligence
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Drag cards between columns, or use the status menu. Filters apply to the board only.
            </p>
            <div className="flex flex-wrap gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 w-[140px]" aria-label="Filter by priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="h-8 w-[160px]" aria-label="Filter by assignee">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All assignees</SelectItem>
                  <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {displayName(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {KANBAN_COLUMNS.map((column) => {
              const list = columns[column.status] ?? [];
              const isDropTarget = dragOverStatus === column.status && Boolean(dragTaskId);
              return (
                <section
                  key={column.status}
                  className={cn(
                    "flex min-h-[22rem] flex-col rounded-2xl border border-border/60 border-t-2 bg-card/40 p-3 shadow-sm transition-colors",
                    column.accent,
                    isDropTarget && "bg-primary/5 ring-1 ring-primary/30",
                  )}
                  aria-labelledby={`col-${column.status}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStatus(column.status);
                  }}
                  onDragLeave={() => setDragOverStatus((prev) => (prev === column.status ? null : prev))}
                  onDrop={() => onDropStatus(column.status)}
                >
                  <div className="mb-3 flex items-start justify-between gap-2 px-1">
                    <div>
                      <h2
                        id={`col-${column.status}`}
                        className="text-sm font-semibold tracking-wide"
                      >
                        {column.label}
                      </h2>
                      <p className="text-[11px] text-muted-foreground">{column.hint}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full tabular-nums">
                      {list.length}
                    </Badge>
                  </div>

                  <ul
                    className="flex-1 space-y-2 overflow-y-auto pr-0.5"
                    aria-label={`${column.label} tasks`}
                  >
                    {list.length === 0 ? (
                      <li className="flex h-full min-h-[10rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 px-3 text-center">
                        <CircleDashed className="mb-2 h-5 w-5 text-muted-foreground/70" aria-hidden />
                        <p className="text-xs text-muted-foreground">
                          {dragTaskId ? "Drop here to move" : "No cards in this column"}
                        </p>
                      </li>
                    ) : (
                      list.map((task) => {
                        const overdue = isOverdue(task.dueDate, task.status);
                        return (
                          <li
                            key={task.id}
                            draggable
                            onDragStart={() => setDragTaskId(task.id)}
                            onDragEnd={() => {
                              setDragTaskId(null);
                              setDragOverStatus(null);
                            }}
                            className={cn(
                              "group rounded-xl border border-border/50 bg-background/55 p-3 shadow-sm transition-all",
                              "hover:border-border hover:bg-background/80",
                              dragTaskId === task.id && "opacity-55 ring-1 ring-primary/40",
                              overdue && "border-l-2 border-l-amber-400/80",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className="mt-0.5 cursor-grab text-muted-foreground/50 group-hover:text-muted-foreground"
                                aria-hidden
                                title="Drag to move"
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-medium leading-snug">{task.title}</p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "shrink-0 text-[10px] font-semibold",
                                      priorityBadgeClass(task.priority),
                                    )}
                                  >
                                    {task.priority}
                                  </Badge>
                                </div>

                                {task.impact ? (
                                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                    {task.impact}
                                  </p>
                                ) : null}

                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/20 py-0.5 pl-0.5 pr-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/60 text-[9px] font-semibold">
                                      {initials(task.assignee)}
                                    </span>
                                    {displayName(task.assignee)}
                                  </span>
                                  {task.dueDate ? (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1",
                                        overdue && "font-medium text-amber-200",
                                      )}
                                    >
                                      <CalendarDays className="h-3 w-3" aria-hidden />
                                      {overdue ? "Overdue " : "Due "}
                                      {new Date(task.dueDate).toLocaleDateString()}
                                    </span>
                                  ) : null}
                                  {task.finding ? (
                                    <Link
                                      href={`/dashboard/projects/${projectId}/risks`}
                                      className="inline-flex max-w-[12rem] items-center gap-1 truncate text-primary underline-offset-2 hover:underline"
                                      title={task.finding.title}
                                    >
                                      <Link2 className="h-3 w-3 shrink-0" aria-hidden />
                                      <span className="truncate">{task.finding.title}</span>
                                    </Link>
                                  ) : null}
                                </div>

                                <div className="flex items-center gap-1.5 border-t border-border/40 pt-2 opacity-90 group-hover:opacity-100">
                                  <Select
                                    value={task.status}
                                    onValueChange={(value) =>
                                      void patchTask(task.id, { status: value as TaskStatus })
                                    }
                                  >
                                    <SelectTrigger
                                      className="h-7 flex-1 text-xs"
                                      aria-label={`Change status for ${task.title}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {KANBAN_COLUMNS.map((c) => (
                                        <SelectItem key={c.status} value={c.status}>
                                          {c.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={task.assigneeId ?? "unassigned"}
                                    onValueChange={(value) =>
                                      void patchTask(task.id, {
                                        assigneeId: value === "unassigned" ? null : value,
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      className="h-7 w-[7.5rem] text-xs"
                                      aria-label={`Assignee for ${task.title}`}
                                    >
                                      <SelectValue placeholder="Owner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">Unassigned</SelectItem>
                                      {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                          {displayName(m)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                    aria-label={`Delete ${task.title}`}
                                    onClick={() => void handleDelete(task.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
            <DialogDescription>Create an action item for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Follow up on revenue recognition"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Input
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select
                value={assigneeId || "unassigned"}
                onValueChange={(v) => setAssigneeId(v === "unassigned" ? "" : v)}
              >
                <SelectTrigger id="task-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {displayName(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-impact">Impact</Label>
              <Input
                id="task-impact"
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                placeholder="Why this matters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateTask()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={findingOpen} onOpenChange={setFindingOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add from finding</DialogTitle>
            <DialogDescription>
              Select open findings to create TODO tasks (deduped by title + finding).
            </DialogDescription>
          </DialogHeader>
          {loadingFindings ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading findings…
            </div>
          ) : findings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/50 px-4 py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">No open findings in this project.</p>
              <Button asChild variant="link" className="mt-1">
                <Link href={`/dashboard/projects/${projectId}/intelligence`}>
                  Run intelligence agents
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {findings.map((finding) => {
                const checked = selectedFindingIds.includes(finding.id);
                return (
                  <li key={finding.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/50 hover:bg-muted/30",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => {
                          setSelectedFindingIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== finding.id)
                              : [...prev, finding.id],
                          );
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{finding.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {finding.agentType}
                          </Badge>
                          {finding.severity ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                finding.severity === "HIGH" || finding.severity === "CRITICAL"
                                  ? "border-orange-500/40 text-orange-200"
                                  : "",
                              )}
                            >
                              {finding.severity}
                            </Badge>
                          ) : null}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFindingOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy || bulkBusy || selectedFindingIds.length === 0}
              onClick={() => void addFromFindings(false, selectedFindingIds)}
            >
              {bulkBusy && background.kind === "from-findings" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add selected{selectedFindingIds.length ? ` (${selectedFindingIds.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
