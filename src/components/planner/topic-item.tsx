"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Topic } from "@/lib/planner-types";
import type { Habit } from "@/lib/types";

interface TopicItemProps {
  topic: Topic;
  habit?: Habit;
  onEdit: (topic: Topic) => void;
  onDelete: (topic: Topic) => void;
  onToggleActive: (id: string) => void;
}

export function TopicItem({
  topic,
  habit,
  onEdit,
  onDelete,
  onToggleActive,
}: TopicItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-md border px-3 py-2 transition-colors hover:bg-accent/50",
        isDragging && "relative z-10 bg-accent ring-2 ring-inset ring-primary",
        !topic.isActive && "opacity-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        onClick={() => onToggleActive(topic.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={topic.isActive ? "Mark as completed" : "Reactivate"}
      >
        {topic.isActive ? (
          <Circle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            !topic.isActive && "line-through"
          )}
        >
          {topic.title}
        </p>
        {topic.description && (
          <p className="truncate text-xs text-muted-foreground">
            {topic.description}
          </p>
        )}
      </div>

      {habit && (
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          {habit.name}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(topic)}
          aria-label="Edit topic"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onDelete(topic)}
          aria-label="Delete topic"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
