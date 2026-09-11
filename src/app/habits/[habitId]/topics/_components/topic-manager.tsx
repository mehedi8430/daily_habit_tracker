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
  arrayMove,
} from "@dnd-kit/sortable";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HabitTopic, TopicStatus } from "@/lib/types";
import * as actions from "@/app/actions/topic.actions";
import { emptyTopic, TopicForm } from "./topic-form";
import { TopicRow } from "./topic-row";

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
        <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {"id" in (form ?? {}) ? "Edit topic" : "Add topic"}
              </DialogTitle>
              <DialogDescription>
                {`id` in (form ?? {})
                  ? "Update the details for this topic."
                  : "Add a new topic or milestone for this habit."}
              </DialogDescription>
            </DialogHeader>
            {form && (
              <TopicForm
                habitId={habitId}
                initial={form}
                onCancel={() => setForm(null)}
                onSaved={(topic) => {
                  setTopics((current) =>
                    current.some((item) => item.id === topic.id)
                      ? current.map((item) =>
                          item.id === topic.id ? topic : item,
                        )
                      : [...current, topic],
                  );
                  setForm(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}