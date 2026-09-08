"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlannerStore } from "@/lib/planner-store";
import { useHabitStore } from "@/lib/store";
import { toast } from "sonner";

interface AddTaskFormProps {
  date: string;
}

export function AddTaskForm({ date }: AddTaskFormProps) {
  const [title, setTitle] = React.useState("");
  const [habitId, setHabitId] = React.useState<string>("__none__");
  const [topicId, setTopicId] = React.useState<string>("__none__");
  const [saving, setSaving] = React.useState(false);

  const createTask = usePlannerStore((s) => s.createTask);
  const topics = usePlannerStore((s) => s.topics);
  const habits = useHabitStore((s) => s.habits);

  const activeTopics = React.useMemo(
    () => topics.filter((t) => t.isActive),
    [topics]
  );

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createTask({
        title: trimmed,
        date,
        habitId: habitId === "__none__" ? undefined : habitId,
        topicId: topicId === "__none__" ? undefined : topicId,
      });
      setTitle("");
      setHabitId("__none__");
      setTopicId("__none__");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create task"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="Add a task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          disabled={saving}
        />
        <Button
          onClick={handleSubmit}
          disabled={!title.trim() || saving}
          size="icon"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {(habits.length > 0 || activeTopics.length > 0) && (
        <div className="flex gap-2">
          {habits.length > 0 && (
            <Select value={habitId} onValueChange={setHabitId}>
              <SelectTrigger className="h-9 w-auto flex-1 text-xs">
                <SelectValue placeholder="Link habit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No habit</SelectItem>
                {habits.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.emoji ?? "📋"} {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {activeTopics.length > 0 && (
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger className="h-9 w-auto flex-1 text-xs">
                <SelectValue placeholder="Link topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No topic</SelectItem>
                {activeTopics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
