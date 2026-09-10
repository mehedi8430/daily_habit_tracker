"use client";

import * as React from "react";
import { addDays, format, isToday, parseISO } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  deletePlannerTask,
  getPlannerTasks,
  updatePlannerTask,
} from "@/app/actions/planner.actions";
import type { PlannerStatus, PlannerTask } from "@/lib/planner-types";
import { NewTaskForm } from "./new-task-form";
import { TaskRow } from "./task-row";

interface PlannerPageProps {
  initialTasks: PlannerTask[];
  today: string;
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function PlannerPage({ initialTasks, today }: PlannerPageProps) {
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [tasks, setTasks] = React.useState(initialTasks);

  React.useEffect(() => {
    if (selectedDate === today) return;
    let cancelled = false;
    getPlannerTasks(selectedDate)
      .then((result) => {
        if (!cancelled) setTasks(result.tasks);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load planner");
      })
    return () => {
      cancelled = true;
    };
  }, [selectedDate, today]);

  const date = parseISO(`${selectedDate}T12:00:00`);
  const completedCount = tasks.filter((task) => task.status === "done").length;
  const activeCount = tasks.filter((task) => task.status !== "done" && task.status !== "skipped").length;
  const scheduledMinutes = tasks.reduce((total, task) => total + (task.durationMinutes ?? 0), 0);
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.startTime && !b.startTime) return a.position - b.position;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime) || a.position - b.position;
  });

  const changeDate = (offset: number) => {
    setSelectedDate(dateKey(addDays(date, offset)));
  };

  const updateStatus = async (task: PlannerTask, status: PlannerStatus) => {
    const previous = tasks;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    const result = await updatePlannerTask(task.id, { status });
    if ("error" in result) {
      setTasks(previous);
      toast.error(result.error);
    }
  };

  const deleteTask = async (task: PlannerTask) => {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    const previous = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    const result = await deletePlannerTask(task.id);
    if (result.error) {
      setTasks(previous);
      toast.error(result.error);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>{format(date, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Planner</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Plan your work in time blocks, keep the next action visible, and close the day with a clear record of what moved forward.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} aria-label="Previous day" title="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant={isToday(date) ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedDate(today)}>Today</Button>
          <Button variant="ghost" size="icon" onClick={() => changeDate(1)} aria-label="Next day" title="Next day"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Completed</p><p className="mt-1 text-2xl font-bold">{completedCount}<span className="text-base font-normal text-muted-foreground">/{tasks.length}</span></p></div>
        <div className="rounded-lg border bg-card p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Remaining</p><p className="mt-1 text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">planned or in progress</p></div>
        <div className="rounded-lg border bg-card p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Planned time</p><p className="mt-1 text-2xl font-bold">{scheduledMinutes}<span className="text-base font-normal text-muted-foreground"> min</span></p><p className="text-xs text-muted-foreground">from task estimates</p></div>
      </section>

      <NewTaskForm date={selectedDate} onCreated={(task) => setTasks((current) => [...current, task])} />

      <section aria-live="polite" className="space-y-3">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-semibold">Timeline</h2><p className="text-sm text-muted-foreground">Click the status circle to move a task forward.</p></div>
        </div>
        {sortedTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="font-semibold">Nothing scheduled yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Start with the one task that would make this day meaningful.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTasks.map((task) => <TaskRow key={task.id} task={task} onStatusChange={updateStatus} onDelete={deleteTask} />)}
          </div>
        )}
      </section>

      <footer className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        <Clock3 className="h-4 w-4 shrink-0" />
        <span>Time blocks are guidance, not a contract. Keep the list short enough to finish.</span>
      </footer>
    </div>
  );
}
