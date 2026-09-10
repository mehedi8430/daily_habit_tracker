"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HabitTopic, TopicStatus } from "@/lib/types";
import * as actions from "@/app/actions/topic.actions";
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

const emptyTopic: Omit<HabitTopic, "id" | "habitId" | "order"> = {
  title: "",
  status: "planned",
  startTime: null,
  endTime: null,
  details: "",
  resources: "",
};

function TopicForm({
  initial,
  onCancel,
  onSaved,
  habitId,
}: {
  initial: typeof emptyTopic;
  onCancel: () => void;
  onSaved: (topic: HabitTopic) => void;
  habitId: string;
}) {
  const [draft, setDraft] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const isEditing = "id" in initial;

  const update = (field: keyof typeof emptyTopic, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const result = isEditing
      ? await actions.updateHabitTopic((initial as HabitTopic).id, habitId, {
          ...draft,
          title: draft.title.trim(),
        })
      : await actions.createHabitTopic(habitId, {
          ...draft,
          title: draft.title.trim(),
        });
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    onSaved(result.topic);
    toast.success(isEditing ? "Topic updated" : "Topic added");
  };

  return (
    <form onSubmit={submit} className="border-t bg-muted/20 p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_9rem_9rem]">
        <div className="space-y-2">
          <Label htmlFor="topic-title">Topic</Label>
          <Input
            id="topic-title"
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Topic or milestone"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="topic-start">Start</Label>
          <Input
            id="topic-start"
            type="time"
            value={draft.startTime ?? ""}
            onChange={(event) => update("startTime", event.target.value || "")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="topic-end">End</Label>
          <Input
            id="topic-end"
            type="time"
            value={draft.endTime ?? ""}
            onChange={(event) => update("endTime", event.target.value || "")}
          />
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="topic-details">Details</Label>
          <textarea
            id="topic-details"
            value={draft.details}
            onChange={(event) => update("details", event.target.value)}
            placeholder="What should be covered?"
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="topic-resources">Resources</Label>
          <textarea
            id="topic-resources"
            value={draft.resources}
            onChange={(event) => update("resources", event.target.value)}
            placeholder="Links, books, files, or references"
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={!draft.title.trim() || saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : isEditing ? "Save topic" : "Add topic"}
        </Button>
      </div>
    </form>
  );
}

function TopicRow({
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
        "grid min-w-[860px] grid-cols-[2rem_minmax(13rem,1.5fr)_9rem_9rem_minmax(14rem,1fr)_minmax(14rem,1fr)_5rem] items-center border-t text-sm",
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
        {topic.startTime || "Anytime"}
      </div>
      <div className="px-2 py-3 text-xs tabular-nums text-muted-foreground">
        {topic.endTime || ""}
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
      <div className="flex items-center justify-end gap-1 px-2">
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

export function TopicManager({
  habitId,
  habitName,
  initialGoal,
  initialTopics,
}: {
  habitId: string;
  habitName: string;
  initialGoal: string;
  initialTopics: HabitTopic[];
}) {
  const [goal] = React.useState(initialGoal);
  const [topics, setTopics] = React.useState(initialTopics);
  const [form, setForm] = React.useState<typeof emptyTopic | HabitTopic | null>(
    null,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = topics.findIndex((topic) => topic.id === active.id);
    const newIndex = topics.findIndex((topic) => topic.id === over.id);
    const reordered = arrayMove(topics, oldIndex, newIndex).map(
      (topic, index) => ({ ...topic, order: index }),
    );
    setTopics(reordered);
    const result = await actions.reorderHabitTopics(
      habitId,
      reordered.map((topic) => topic.id),
    );
    if ("error" in result) toast.error(result.error);
  };
  const updateStatus = async (topic: HabitTopic, status: TopicStatus) => {
    setTopics((current) =>
      current.map((item) =>
        item.id === topic.id ? { ...item, status } : item,
      ),
    );
    const result = await actions.updateHabitTopic(topic.id, habitId, {
      ...topic,
      status,
    });
    if ("error" in result) {
      toast.error(result.error);
      setTopics((current) =>
        current.map((item) => (item.id === topic.id ? topic : item)),
      );
    }
  };
  const removeTopic = async (topic: HabitTopic) => {
    if (!window.confirm(`Delete topic "${topic.title}"?`)) return;
    const result = await actions.deleteHabitTopic(topic.id, habitId);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setTopics((current) => current.filter((item) => item.id !== topic.id));
    toast.success("Topic deleted");
  };

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Habit calendar
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{habitName}</h1>
          <p className="text-sm text-muted-foreground">
            Manage the topics and milestones behind this habit.
          </p>
        </div>
        <Button onClick={() => setForm(emptyTopic)}>
          <Plus className="h-4 w-4" />
          Add topic
        </Button>
      </div>
      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Goal
          </p>
          {goal ? (
            <p className="mt-1 text-lg">{goal}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Goal is not set yet. Go to the{" "}
              <Link
                href="/"
                className="font-medium text-foreground underline underline-offset-4"
              >
                habit calendar
              </Link>{" "}
              and edit this habit to set a goal.
            </p>
          )}
        </div>
      </section>
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[2rem_minmax(13rem,1.5fr)_9rem_9rem_minmax(14rem,1fr)_minmax(14rem,1fr)_5rem] items-center bg-muted/60 px-0 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span />
              <span className="px-3">Topic</span>
              <span className="px-2">Start</span>
              <span className="px-2">End</span>
              <span className="px-3">Details</span>
              <span className="px-3">Resources</span>
              <span className="px-2">Status</span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={topics.map((topic) => topic.id)}
                strategy={verticalListSortingStrategy}
              >
                {topics.map((topic) => (
                  <TopicRow
                    key={topic.id}
                    topic={topic}
                    onEdit={() => setForm(topic)}
                    onDelete={() => removeTopic(topic)}
                    onStatus={(status) => updateStatus(topic, status)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {topics.length === 0 && (
              <div className="border-t px-6 py-12 text-center text-sm text-muted-foreground">
                No topics yet. Add the first milestone for this habit.
              </div>
            )}
          </div>
        </div>
        {form && (
          <TopicForm
            habitId={habitId}
            initial={form}
            onCancel={() => setForm(null)}
            onSaved={(topic) => {
              setTopics((current) =>
                current.some((item) => item.id === topic.id)
                  ? current.map((item) => (item.id === topic.id ? topic : item))
                  : [...current, topic],
              );
              setForm(null);
            }}
          />
        )}
      </section>
    </div>
  );
}
