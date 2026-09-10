"use client";

import { format } from "date-fns";
import { MoveRight, SkipForward, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlannerPriority, PlannerTask, PlannerStatus } from "@/lib/planner-types";
import { TaskStatusButton } from "./task-status-button";

const statusLabels: Record<PlannerStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  skipped: "Skipped",
};

const priorityStyles: Record<PlannerPriority, string> = {
  low: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  medium: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  high: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function formatTime(value: string | null): string {
  if (!value) return "Anytime";
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return format(date, "h:mm a");
}

export function TaskRow({
  task,
  onStatusChange,
  onDelete,
  onMoveNext,
}: {
  task: PlannerTask;
  onStatusChange: (task: PlannerTask, status: PlannerStatus) => void;
  onDelete: (task: PlannerTask) => void;
  onMoveNext: (task: PlannerTask) => void;
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
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMoveNext(task)}
              aria-label="Move to tomorrow"
              title="Move to tomorrow"
            >
              <MoveRight className="h-4 w-4" />
            </Button>
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
          </>
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
