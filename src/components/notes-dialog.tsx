"use client";

import * as React from "react";
import { formatFullDate } from "@/lib/date";
import { useHabitStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitId: string;
  habitName: string;
  date: Date;
}

export function NotesDialog({
  open,
  onOpenChange,
  habitId,
  habitName,
  date,
}: NotesDialogProps) {
  const getNotes = useHabitStore((s) => s.getNotes);
  const saveNotes = useHabitStore((s) => s.saveNotes);

  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDraft(getNotes(habitId, date) ?? "");
    }
  }, [open, habitId, date, getNotes]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    setSaving(true);
    try {
      await saveNotes(habitId, date, trimmed || null);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save notes"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription>
            {habitName} &mdash; {formatFullDate(date)}
          </DialogDescription>
        </DialogHeader>
        <textarea
          className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Add notes for this day..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}