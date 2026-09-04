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
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setDraft(getNotes(habitId, date) ?? "");
      setEditing(false);
    }
  }, [open, habitId, date, getNotes]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    setSaving(true);
    try {
      await saveNotes(habitId, date, trimmed || null);
      setDraft(trimmed);
      setEditing(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save notes"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(getNotes(habitId, date) ?? "");
    setEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription>
            {habitName} &mdash; {formatFullDate(date)}
          </DialogDescription>
        </DialogHeader>
        {editing ? (
          <textarea
            className="min-h-45 max-h-60 w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Add notes for this day..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        ) : (
          <div className="max-h-60 min-h-45 overflow-y-auto rounded-md bg-background px-3 py-2 text-sm">
            {draft ? (
              <p className="whitespace-pre-wrap">{draft}</p>
            ) : (
              <p className="text-muted-foreground italic">
                No notes yet for this day.
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          {editing ? (
            <>
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setEditing(true)}>
                {draft ? "Edit" : "Add Notes"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
