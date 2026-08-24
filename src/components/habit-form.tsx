"use client";

import * as React from "react";
import { useHabitStore } from "@/lib/store";
import { Habit, CATEGORIES } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface HabitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit | null;
}

const EMOJI_OPTIONS = [
  "🏃",
  "📚",
  "💪",
  "🧘",
  "💧",
  "🥗",
  "😴",
  "🎯",
  "✍️",
  "🎸",
  "🌱",
  "💡",
  "🧹",
  "☀️",
  "🚭",
];

function HabitFormFields({
  habit,
  close,
}: {
  habit: Habit | null;
  close: () => void;
}) {
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);

  const [name, setName] = React.useState(habit?.name ?? "");
  const [emoji, setEmoji] = React.useState(habit?.emoji ?? EMOJI_OPTIONS[0]);
  const [category, setCategory] = React.useState(
    habit?.category ?? CATEGORIES[0].id
  );
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (habit) {
        await updateHabit(habit.id, { name: trimmed, emoji, category });
      } else {
        await addHabit({ name: trimmed, emoji, category });
      }
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save habit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="habit-name">Name</Label>
          <Input
            id="habit-name"
            placeholder="e.g. Wake Up on Time"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Icon</Label>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`flex h-9 w-9 items-center justify-center rounded-md border text-lg transition-all ${
                  emoji === e
                    ? "border-primary bg-accent scale-110"
                    : "border-input hover:bg-accent"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? "Saving..." : habit ? "Save Changes" : "Add Habit"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function HabitForm({ open, onOpenChange, habit }: HabitFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{habit ? "Edit Habit" : "Add Habit"}</DialogTitle>
          <DialogDescription>
            {habit
              ? "Update your habit details below."
              : "Create a new habit to start tracking."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <HabitFormFields
            key={`${open}-${habit?.id ?? "new"}`}
            habit={habit ?? null}
            close={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
