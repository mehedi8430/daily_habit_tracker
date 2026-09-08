"use client";

import * as React from "react";
import { format, addDays } from "date-fns";
import { ArrowLeft, StickyNote } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TaskSection } from "@/components/planner/task-section";
import { TopicsPanel } from "@/components/planner/topics-panel";
import { usePlannerStore } from "@/lib/planner-store";
import { toast } from "sonner";
import type { Topic, DailyTask } from "@/lib/planner-types";

interface PlannerPageProps {
  initialTopics: Topic[];
  initialTodayTasks: DailyTask[];
  initialTomorrowTasks: DailyTask[];
  todayStr: string;
  tomorrowStr: string;
}

export function PlannerPage({
  initialTopics,
  initialTodayTasks,
  initialTomorrowTasks,
  todayStr,
  tomorrowStr,
}: PlannerPageProps) {
  const initialized = usePlannerStore((s) => s.initialized);
  const initializeTopics = usePlannerStore((s) => s.initializeTopics);
  const initializeTasks = usePlannerStore((s) => s.initializeTasks);
  const updateTask = usePlannerStore((s) => s.updateTask);

  const [notesDialog, setNotesDialog] = React.useState<DailyTask | null>(null);
  const [notesDraft, setNotesDraft] = React.useState("");

  React.useEffect(() => {
    if (!initialized) {
      initializeTopics(initialTopics);
      initializeTasks(todayStr, initialTodayTasks);
      initializeTasks(tomorrowStr, initialTomorrowTasks);
    }
  }, [
    initialized,
    initializeTopics,
    initializeTasks,
    initialTopics,
    initialTodayTasks,
    initialTomorrowTasks,
    todayStr,
    tomorrowStr,
  ]);

  const handleOpenNotes = (task: DailyTask) => {
    setNotesDialog(task);
    setNotesDraft(task.notes ?? "");
  };

  const handleSaveNotes = async () => {
    if (!notesDialog) return;
    const trimmed = notesDraft.trim() || null;
    try {
      await updateTask(notesDialog.id, { notes: trimmed });
      setNotesDialog(null);
      toast.success("Notes saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save notes"
      );
    }
  };

  const todayLabel = `Today — ${format(new Date(todayStr + "T00:00:00"), "MMMM d")}`;
  const tomorrowLabel = `Tomorrow — ${format(new Date(tomorrowStr + "T00:00:00"), "MMMM d")}`;

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" aria-label="Back to Calendar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Daily Planner</h1>
        </div>
        <TopicsPanel />
      </div>

      <TaskSection
        date={todayStr}
        label={todayLabel}
        targetDateForCarryOver={tomorrowStr}
        onOpenNotes={handleOpenNotes}
      />

      <div className="border-t pt-4">
        <p className="mb-4 text-center text-xs font-medium uppercase text-muted-foreground">
          Review & Plan Tomorrow
        </p>
      </div>

      <TaskSection
        date={tomorrowStr}
        label={tomorrowLabel}
        targetDateForCarryOver={format(addDays(new Date(tomorrowStr + "T00:00:00"), 1), "yyyy-MM-dd")}
        onOpenNotes={handleOpenNotes}
      />

      {/* Notes dialog */}
      <Dialog
        open={!!notesDialog}
        onOpenChange={(o) => !o && setNotesDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Task Notes
            </DialogTitle>
            <DialogDescription>
              {notesDialog?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="task-notes">Notes</Label>
            <textarea
              id="task-notes"
              className="min-h-28 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Add notes about this task..."
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotesDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
