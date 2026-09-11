"use client";

import * as React from "react";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HabitTopic } from "@/lib/types";
import * as actions from "@/app/actions/topic.actions";

export const emptyTopic: Omit<HabitTopic, "id" | "habitId" | "order"> = {
  title: "",
  status: "planned",
  startTime: null,
  endTime: null,
  details: "",
  resources: "",
};

export function TopicForm({
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
    <form onSubmit={submit}>
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

      {/* Details */}
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

      {/* Resources */}
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

      {/* action buttons */}
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
