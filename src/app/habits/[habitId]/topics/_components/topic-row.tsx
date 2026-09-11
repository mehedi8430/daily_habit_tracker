"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ExternalLink,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HabitTopic, TopicStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusLabels: Record<TopicStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  skipped: "Skipped",
};

const statusStyles: Record<TopicStatus, string> = {
  planned:
    "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  in_progress:
    "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  done: "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  skipped:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function TopicRow({
  topic,
  onEdit,
  onDelete,
  onStatus,
}: {
  topic: HabitTopic;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: TopicStatus) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "grid min-w-[860px] grid-cols-[2rem_minmax(10rem,1.2fr)_9rem_9rem_minmax(14rem,1fr)_minmax(14rem,1fr)_5rem_5rem] items-center gap-x-4 border-t text-sm",
        isDragging && "relative z-10 bg-accent shadow-lg",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex cursor-grab justify-center text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className={cn(
          "min-w-0 px-3 py-3",
          topic.status === "done" && "text-muted-foreground line-through",
        )}
        title={topic.title}
      >
        {topic.title}
      </div>
      <div className="px-2 py-3 text-xs tabular-nums text-muted-foreground">
        {topic.startDate || "Anytime"}
      </div>
      <div className="px-2 py-3 text-xs tabular-nums text-muted-foreground">
        {topic.targetDate || "-"}
      </div>
      <div
        className="truncate px-3 py-3 text-xs text-muted-foreground"
        title={topic.details}
      >
        {topic.details || "-"}
      </div>
      <div
        className="truncate px-3 py-3 text-xs text-muted-foreground"
        title={topic.resources}
      >
        {topic.resources ? (
          <span className="inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            {topic.resources}
          </span>
        ) : (
          "-"
        )}
      </div>
      <div className="px-2 py-3">
        <select
          value={topic.status}
          onChange={(event) => onStatus(event.target.value as TopicStatus)}
          className={cn(
            "h-7 max-w-20 rounded-md border px-1 text-[10px] font-medium outline-none",
            statusStyles[topic.status],
          )}
          aria-label={`Status for ${topic.title}`}
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-end gap-1 px-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
          aria-label="Edit topic"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={onDelete}
          aria-label="Delete topic"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}