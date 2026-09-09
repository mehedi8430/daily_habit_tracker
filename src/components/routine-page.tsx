"use client";

import * as React from "react";
import { addDays, format, isToday, parseISO } from "date-fns";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  MoreHorizontal,
  Play,
  Plus,
  SkipForward,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createRoutineTask,
  deleteRoutineTask,
  getRoutineTasks,
  updateRoutineTask,
} from "@/app/routine-actions";
import type {
  RoutinePriority,
  RoutineStatus,
  RoutineTask,
} from "@/lib/routine-types";
import { cn } from "@/lib/utils";

interface RoutinePageProps {
  initialTasks: RoutineTask[];
  today: string;
}

const statusLabels: Record<RoutineStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  skipped: "Skipped",
};

const priorityStyles: Record<RoutinePriority, string> = {
  low: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  medium: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  high: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

function formatTime(value: string | null): string {
  if (!value) return "Anytime";
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return format(date, "h:mm a");
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function TaskStatusButton({
  task,
  onChange,
}: {
  task: RoutineTask;
  onChange: (status: RoutineStatus) => void;
}) {
  const nextStatus: RoutineStatus =
    task.status === "planned"
      ? "in_progress"
      : task.status === "in_progress"
        ? "done"
        : "planned";
  const Icon = task.status === "done" ? Check : task.status === "in_progress" ? Play : Circle;

  return (
    <button
      type="button"
      onClick={() => onChange(nextStatus)}
      aria-label={`${statusLabels[task.status]}. Set ${statusLabels[nextStatus]}`}
      title={`Set ${statusLabels[nextStatus]}`}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        task.status === "done" && "border-emerald-500 bg-emerald-500 text-white",
        task.status === "in_progress" && "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950",
        task.status === "planned" && "border-muted-foreground/40 text-muted-foreground hover:border-foreground hover:text-foreground",
        task.status === "skipped" && "border-muted-foreground/30 text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function TaskRow({
  task,
  onStatusChange,
  onDelete,
}: {
  task: RoutineTask;
  onStatusChange: (task: RoutineTask, status: RoutineStatus) => void;
  onDelete: (task: RoutineTask) => void;
}) {
  const terminal = task.status === "done" || task.status === "skipped";

  return (
    <div
      className={cn(
        "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card px-3 py-3 transition-colors hover:border-foreground/20 sm:grid-cols-[5rem_auto_minmax(0,1fr)_auto]",
        terminal && "opacity-65"
      )}
    >
      <div className="row-start-1 text-right text-xs tabular-nums text-muted-foreground sm:col-start-1">
        {formatTime(task.startTime)}
      </div>
      <TaskStatusButton task={task} onChange={(status) => onStatusChange(task, status)} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("truncate text-sm font-medium", terminal && "line-through")}>{task.title}</p>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", priorityStyles[task.priority])}>
            {task.priority}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{statusLabels[task.status]}</span>
          {task.durationMinutes && <span>{task.durationMinutes} min</span>}
          {task.notes && <span className="truncate">{task.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
        {task.status !== "done" && task.status !== "skipped" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onStatusChange(task, "skipped")}
            aria-label="Skip task"
            title="Skip task"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(task)}
          aria-label="Delete task"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function NewTaskForm({
  date,
  onCreated,
}: {
  date: string;
  onCreated: (task: RoutineTask) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [priority, setPriority] = React.useState<RoutinePriority>("medium");
  const [notes, setNotes] = React.useState("");
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    const result = await createRoutineTask({
      title: trimmed,
      date,
      startTime: startTime || undefined,
      durationMinutes: duration ? Number(duration) : undefined,
      priority,
      notes: notes || undefined,
    });
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    onCreated(result.task);
    setTitle("");
    setStartTime("");
    setDuration("");
    setNotes("");
    setPriority("medium");
    setDetailsOpen(false);
    toast.success("Task added to your routine");
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs to happen?"
          aria-label="Task title"
          autoComplete="off"
          autoFocus
          disabled={saving}
          className="sm:flex-1"
        />
        <div className="flex gap-2">
          <Input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            aria-label="Start time"
            title="Start time"
            disabled={saving}
            className="w-32"
          />
          <Button type="submit" disabled={!title.trim() || saving} className="shrink-0">
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={detailsOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
          {detailsOpen ? "Hide details" : "Add details"}
        </button>
        {!detailsOpen && <span className="text-xs text-muted-foreground">Press Enter after entering a task title to add it quickly.</span>}
      </div>
      {detailsOpen && (
        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-[10rem_10rem_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="task-duration">Duration</Label>
            <div className="relative">
              <Input id="task-duration" type="number" min="1" step="5" placeholder="30" value={duration} onChange={(event) => setDuration(event.target.value)} />
              <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">min</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-priority">Priority</Label>
            <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as RoutinePriority)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-notes">Notes</Label>
            <Input id="task-notes" placeholder="Link, context, or definition of done" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
      )}
    </form>
  );
}

export function RoutinePage({ initialTasks, today }: RoutinePageProps) {
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [tasks, setTasks] = React.useState(initialTasks);

  React.useEffect(() => {
    if (selectedDate === today) return;
    let cancelled = false;
    getRoutineTasks(selectedDate)
      .then((result) => {
        if (!cancelled) setTasks(result.tasks);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load routine");
      })
    return () => {
      cancelled = true;
    };
  }, [selectedDate, today]);

  const date = parseISO(`${selectedDate}T12:00:00`);
  const completedCount = tasks.filter((task) => task.status === "done").length;
  const activeCount = tasks.filter((task) => task.status !== "done" && task.status !== "skipped").length;
  const scheduledMinutes = tasks.reduce((total, task) => total + (task.durationMinutes ?? 0), 0);
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.startTime && !b.startTime) return a.position - b.position;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime) || a.position - b.position;
  });

  const changeDate = (offset: number) => {
    setSelectedDate(dateKey(addDays(date, offset)));
  };

  const updateStatus = async (task: RoutineTask, status: RoutineStatus) => {
    const previous = tasks;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    const result = await updateRoutineTask(task.id, { status });
    if ("error" in result) {
      setTasks(previous);
      toast.error(result.error);
    }
  };

  const deleteTask = async (task: RoutineTask) => {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    const previous = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    const result = await deleteRoutineTask(task.id);
    if (result.error) {
      setTasks(previous);
      toast.error(result.error);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>{format(date, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Routine</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Plan your work in time blocks, keep the next action visible, and close the day with a clear record of what moved forward.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} aria-label="Previous day" title="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant={isToday(date) ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedDate(today)}>Today</Button>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)} aria-label="Next day" title="Next day"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Completed</p><p className="mt-1 text-2xl font-bold">{completedCount}<span className="text-base font-normal text-muted-foreground">/{tasks.length}</span></p></div>
        <div className="rounded-lg border bg-card p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remaining</p><p className="mt-1 text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">planned or in progress</p></div>
        <div className="rounded-lg border bg-card p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Planned time</p><p className="mt-1 text-2xl font-bold">{scheduledMinutes}<span className="text-base font-normal text-muted-foreground"> min</span></p><p className="text-xs text-muted-foreground">from task estimates</p></div>
      </section>

      <NewTaskForm date={selectedDate} onCreated={(task) => setTasks((current) => [...current, task])} />

      <section aria-live="polite" className="space-y-3">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-semibold">Timeline</h2><p className="text-sm text-muted-foreground">Click the status circle to move a task forward.</p></div>
        </div>
        {sortedTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="font-semibold">Nothing scheduled yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Start with the one task that would make this day meaningful.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTasks.map((task) => <TaskRow key={task.id} task={task} onStatusChange={updateStatus} onDelete={deleteTask} />)}
          </div>
        )}
      </section>

      <footer className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        <Clock3 className="h-4 w-4 shrink-0" />
        <span>Time blocks are guidance, not a contract. Keep the list short enough to finish.</span>
      </footer>
    </div>
  );
}
