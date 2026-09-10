"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { updatePlannerTask } from "@/app/actions/planner.actions";
import type { PlannerPriority, PlannerTask } from "@/lib/planner-types";

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onUpdated,
}: {
  task: PlannerTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (task: PlannerTask) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [priority, setPriority] = React.useState<PlannerPriority>("medium");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (task && open) {
      setTitle(task.title);
      setStartTime(task.startTime ?? "");
      setDuration(task.durationMinutes ? String(task.durationMinutes) : "");
      setPriority(task.priority);
      setNotes(task.notes ?? "");
    }
  }, [task, open]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    const result = await updatePlannerTask(task.id, {
      title: trimmed,
      startTime: startTime || null,
      durationMinutes: duration ? Number(duration) : null,
      priority,
      notes: notes || null,
    });
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    onUpdated(result.task);
    onOpenChange(false);
    toast.success("Task updated");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to happen?"
              autoFocus
              disabled={saving}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-time">Start time</Label>
              <Input
                id="edit-time"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration (min)</Label>
              <Input
                id="edit-duration"
                type="number"
                min="1"
                step="5"
                placeholder="30"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                disabled={saving}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priority</Label>
            <select
              id="edit-priority"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as PlannerPriority)
              }
              disabled={saving}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input
              id="edit-notes"
              placeholder="Link, context, or definition of done"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={saving}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || saving}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
