"use client";

import * as React from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  parseISO,
  startOfWeek,
} from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Check,
  Circle,
  Clock3,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createWeeklyPlannerGoal,
  deleteWeeklyPlannerGoal,
  getWeeklyPlannerData,
  setWeeklyPlannerGoalCompletion,
  updateWeeklyPlannerGoal,
} from "@/app/actions/planner.actions";
import type {
  WeeklyPlannerGoal,
  WeeklyPlannerGoalOccurrence,
} from "@/lib/planner-types";

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return format(new Date(2000, 0, 1, hours, minutes), "h:mm a");
}

export function WeeklyPlannerView({
  initialGoals,
  initialOccurrences,
  defaultDate,
}: {
  initialGoals: WeeklyPlannerGoal[];
  initialOccurrences: WeeklyPlannerGoalOccurrence[];
  defaultDate: string;
}) {
  const [baseDate, setBaseDate] = React.useState(() =>
    parseISO(`${defaultDate}T12:00:00`),
  );
  const [goals, setGoals] = React.useState(initialGoals);
  const [occurrences, setOccurrences] = React.useState(initialOccurrences);
  const [title, setTitle] = React.useState("");
  const [weekday, setWeekday] = React.useState("1");
  const [startTime, setStartTime] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const weekStart = React.useMemo(
    () => startOfWeek(baseDate, { weekStartsOn: 1 }),
    [baseDate],
  );
  const weekEnd = React.useMemo(
    () => endOfWeek(baseDate, { weekStartsOn: 1 }),
    [baseDate],
  );
  const from = dateKey(weekStart);
  const to = dateKey(weekEnd);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  React.useEffect(() => {
    let cancelled = false;
    getWeeklyPlannerData(from, to)
      .then((data) => {
        if (!cancelled) {
          setGoals(data.goals);
          setOccurrences(data.occurrences);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load weekly goals",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const resetForm = () => {
    setTitle("");
    setWeekday("1");
    setStartTime("");
    setNotes("");
    setEditingId(null);
  };

  const saveGoal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const goalTitle = title.trim();
    if (!goalTitle) return;
    setSaving(true);
    const data = {
      title: goalTitle,
      weekday: Number(weekday),
      startTime: startTime || undefined,
      notes: notes || undefined,
    };
    const result = editingId
      ? await updateWeeklyPlannerGoal(editingId, data)
      : await createWeeklyPlannerGoal(data);
    setSaving(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    setGoals((current) => {
      const withoutEdited = current.filter((goal) => goal.id !== result.goal.id);
      return [...withoutEdited, result.goal].sort(
        (a, b) =>
          a.weekday - b.weekday ||
          (a.startTime ?? "").localeCompare(b.startTime ?? ""),
      );
    });
    resetForm();
    toast.success(editingId ? "Weekly goal updated" : "Weekly goal added");
  };

  const beginEdit = (goal: WeeklyPlannerGoal) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setWeekday(String(goal.weekday));
    setStartTime(goal.startTime ?? "");
    setNotes(goal.notes ?? "");
  };

  const removeGoal = async (goal: WeeklyPlannerGoal) => {
    const result = await deleteWeeklyPlannerGoal(goal.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setGoals((current) => current.filter((item) => item.id !== goal.id));
    setOccurrences((current) => current.filter((item) => item.goalId !== goal.id));
    if (editingId === goal.id) resetForm();
    toast.success("Weekly goal removed");
  };

  const toggleGoal = async (
    goal: WeeklyPlannerGoal,
    occurrenceDate: string,
    completed: boolean,
  ) => {
    const previous = occurrences;
    setOccurrences((current) => {
      const existing = current.find(
        (item) => item.goalId === goal.id && item.date === occurrenceDate,
      );
      if (existing) {
        return current.map((item) =>
          item === existing ? { ...item, completed } : item,
        );
      }
      return [...current, { goalId: goal.id, date: occurrenceDate, completed }];
    });

    const result = await setWeeklyPlannerGoalCompletion(
      goal.id,
      occurrenceDate,
      completed,
    );
    if ("error" in result) {
      setOccurrences(previous);
      toast.error(result.error);
    }
  };

  const totalCount = goals.reduce(
    (total, goal) =>
      total + (days.some((day) => (day.getDay() || 7) === goal.weekday) ? 1 : 0),
    0,
  );
  const completedCount = days.reduce((total, day) => {
    const dayKey = dateKey(day);
    const dayOfWeek = day.getDay() || 7;
    return (
      total +
      goals.filter((goal) => goal.weekday === dayOfWeek).filter((goal) =>
        occurrences.some(
          (item) => item.goalId === goal.id && item.date === dayKey && item.completed,
        ),
      ).length
    );
  }, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            <span>
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Goals</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Set goals for specific weekdays. They repeat every week, while completion is tracked separately for each date.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBaseDate((current) => addDays(current, -7))}
              aria-label="Previous week"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBaseDate(new Date())}
            >
              This week
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBaseDate((current) => addDays(current, 7))}
              aria-label="Next week"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/planner">
            <Button variant="outline">Daily planner</Button>
          </Link>
        </div>
      </header>

      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Your recurring goals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              For example: “Solve one LeetCode problem” every Monday or “Publish a LinkedIn post” every Sunday.
            </p>
          </div>
          <p className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
            {completedCount}/{totalCount} completed this week
          </p>
        </div>

        <form
          onSubmit={saveGoal}
          className="grid gap-3 border-t pt-4 md:grid-cols-[minmax(12rem,1fr)_10rem_9rem_minmax(12rem,1fr)_auto_auto] md:items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="weekly-goal-title">Goal</Label>
            <Input
              id="weekly-goal-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Solve one LeetCode problem"
              maxLength={160}
              required
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weekly-goal-weekday">Repeat every</Label>
            <select
              id="weekly-goal-weekday"
              value={weekday}
              onChange={(event) => setWeekday(event.target.value)}
              disabled={saving}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {weekdays.map((day) => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weekly-goal-time">Time (optional)</Label>
            <Input
              id="weekly-goal-time"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weekly-goal-notes">Notes (optional)</Label>
            <Input
              id="weekly-goal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="A small reminder or detail"
              maxLength={500}
              disabled={saving}
            />
          </div>
          <Button type="submit" disabled={!title.trim() || saving} className="gap-2">
            {editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Save" : "Add goal"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Goals by weekday">
        {days.map((day) => {
          const dayKey = dateKey(day);
          const dayOfWeek = day.getDay() || 7;
          const dayGoals = goals.filter((goal) => goal.weekday === dayOfWeek);
          const completedForDay = dayGoals.filter((goal) =>
            occurrences.some(
              (item) => item.goalId === goal.id && item.date === dayKey && item.completed,
            ),
          ).length;

          return (
            <article key={dayKey} className="flex min-h-52 flex-col rounded-xl border bg-card p-4 shadow-sm">
              <header className={`mb-3 flex items-center justify-between rounded-lg border px-3 py-2 ${isToday(day) ? "border-primary bg-primary/10" : "bg-muted/30"}`}>
                <div>
                  <h3 className="font-semibold">{format(day, "EEEE")}</h3>
                  <p className="text-xs text-muted-foreground">
                    {format(day, "MMM d")}{isToday(day) ? " · Today" : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {completedForDay}/{dayGoals.length}
                </span>
              </header>

              <div className="flex-1 space-y-2">
                {dayGoals.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                    No recurring goal
                  </p>
                ) : (
                  dayGoals.map((goal) => {
                    const completed = occurrences.some(
                      (item) => item.goalId === goal.id && item.date === dayKey && item.completed,
                    );
                    const time = formatTime(goal.startTime);
                    return (
                      <div key={goal.id} className={`rounded-lg border p-3 ${completed ? "bg-muted/50" : "bg-background"}`}>
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleGoal(goal, dayKey, !completed)}
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${completed ? "border-emerald-500 bg-emerald-500 text-white" : "text-muted-foreground hover:border-primary"}`}
                            aria-label={`${completed ? "Mark incomplete" : "Complete"}: ${goal.title}`}
                            title={completed ? "Mark incomplete" : "Mark complete"}
                          >
                            {completed ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${completed ? "text-muted-foreground line-through" : ""}`}>
                              {goal.title}
                            </p>
                            {(time || goal.notes) && (
                              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                {time && (
                                  <p className="inline-flex items-center gap-1">
                                    <Clock3 className="h-3 w-3" />{time}
                                  </p>
                                )}
                                {goal.notes && <p>{goal.notes}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end gap-1 border-t pt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => beginEdit(goal)}
                            aria-label={`Edit ${goal.title}`}
                            title="Edit goal"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => void removeGoal(goal)}
                            aria-label={`Delete ${goal.title}`}
                            title="Delete goal"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Link
                href={`/planner?date=${dayKey}`}
                className="mt-3 text-center text-xs font-medium text-primary hover:underline"
              >
                Open daily planner
              </Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}
