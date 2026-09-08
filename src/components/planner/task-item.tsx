"use client";

import * as React from "react";
import {
  Circle,
  Clock,
  CheckCircle2,
  SkipForward,
  ArrowRight,
  Trash2,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlannerStore } from "@/lib/planner-store";
import { toast } from "sonner";
import type { DailyTask, TaskStatus } from "@/lib/planner-types";

const STATUS_CONFIG: Record<
  TaskStatus,
  { icon: React.ElementType; label: string; className: string }
> = {
  pending: {
    icon: Circle,
    label: "Pending",
    className: "text-muted-foreground",
  },
  in_progress: {
    icon: Clock,
    label: "In progress",
    className: "text-blue-500",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    className: "text-primary",
  },
  skipped: {
    icon: SkipForward,
    label: "Skipped",
    className: "text-muted-foreground",
  },
};

const STATUS_CYCLE: TaskStatus[] = ["pending", "in_progress", "completed"];

interface TaskItemProps {
  task: DailyTask;
  targetDate: string;
  onOpenNotes: (task: DailyTask) => void;
}

export function TaskItem({ task, targetDate, onOpenNotes }: TaskItemProps) {
  const updateTask = usePlannerStore((s) => s.updateTask);
  const deleteTask = usePlannerStore((s) => s.deleteTask);
  const carryOverTask = usePlannerStore((s) => s.carryOverTask);

  const config = STATUS_CONFIG[task.status];
  const Icon = config.icon;
  const isTerminal = task.status === "completed" || task.status === "skipped";

  const cycleStatus = async () => {
    const currentIndex = STATUS_CYCLE.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];
    try {
      await updateTask(task.id, { status: nextStatus });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update task"
      );
    }
  };

  const handleSkip = async () => {
    try {
      await updateTask(task.id, { status: "skipped" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to skip task"
      );
    }
  };

  const handleCarryOver = async () => {
    try {
      await carryOverTask(task.id, targetDate);
      toast.success("Task moved to tomorrow");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to move task"
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask(task.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete task"
      );
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md border px-3 py-2 transition-colors hover:bg-accent/50",
        isTerminal && "opacity-60"
      )}
    >
      <button
        onClick={cycleStatus}
        className={cn("shrink-0 transition-colors", config.className)}
        aria-label={`Status: ${config.label}. Click to cycle.`}
      >
        <Icon className="h-4 w-4" />
      </button>

      <span
        className={cn(
          "min-w-0 flex-1 text-sm",
          task.status === "completed" && "line-through",
          task.status === "skipped" && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </span>

      {task.notes && (
        <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {task.status !== "skipped" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleSkip}
            aria-label="Skip task"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onOpenNotes(task)}
          aria-label="Edit notes"
        >
          <StickyNote className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCarryOver}
          aria-label="Move to tomorrow"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={handleDelete}
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
