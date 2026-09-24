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
import { ArrowLeft, ArrowRight, CalendarRange, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPlannerTasksBetween } from "@/app/actions/planner.actions";
import type { PlannerTask } from "@/lib/planner-types";
import { formatTime } from "@/app/planner/_components/task-row";

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function WeeklyPlannerView({
  initialTasks,
  defaultDate,
}: {
  initialTasks: PlannerTask[];
  defaultDate: string;
}) {
  const [baseDate, setBaseDate] = React.useState(() => parseISO(`${defaultDate}T12:00:00`));
  const [tasks, setTasks] = React.useState(initialTasks);

  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(baseDate, { weekStartsOn: 1 }),
  });

  React.useEffect(() => {
    const start = format(weekStart, "yyyy-MM-dd");
    const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

    let cancelled = false;
    getPlannerTasksBetween(start, end)
      .then((result) => {
        if (!cancelled) setTasks(result.tasks);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      });

    return () => {
      cancelled = true;
    };
  }, [baseDate, weekStart]);

  const goPreviousWeek = () => setBaseDate((current) => addDays(current, -7));
  const goNextWeek = () => setBaseDate((current) => addDays(current, 7));
  const goToday = () => setBaseDate(new Date());

  const weeklyTaskMap = React.useMemo(() => {
    const map = new Map<string, PlannerTask[]>();
    for (const task of tasks) {
      const list = map.get(task.date) ?? [];
      list.push(task);
      map.set(task.date, list);
    }
    for (const [date, dateTasks] of map.entries()) {
     dateTasks.sort((a, b) => {
        if (!a.startTime && !b.startTime) return a.position - b.position;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime) || a.position - b.position;
      });
      map.set(date, dateTasks);
    }
    return map;
  }, [tasks]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            <span>{format(weekStart, "MMM d")} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Planner</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Review the week at a glance, see what is already scheduled, and jump into any day for focused planning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <Button variant="ghost" size="icon" onClick={goPreviousWeek} aria-label="Previous week">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToday}>
              This week
            </Button>
            <Button variant="ghost" size="icon" onClick={goNextWeek} aria-label="Next week">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/planner">
            <Button variant="outline">Daily planner</Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-7">
        {days.map((day) => {
          const dayKey = dateKey(day);
          const dayTasks = weeklyTaskMap.get(dayKey) ?? [];
          const completed = dayTasks.filter((task) => task.status === "done").length;
          const active = dayTasks.filter((task) => task.status !== "done" && task.status !== "skipped").length;

          return (
            <div key={dayKey} className="rounded-xl border bg-card p-3 shadow-sm">
              <div className={
                "mb-3 rounded-lg border px-3 py-2 text-center " +
                (isToday(day) ? "border-primary bg-primary/10" : "bg-muted/30")
              }>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div className="mt-1 text-lg font-bold">{format(day, "d")}</div>
              </div>

              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{dayTasks.length} tasks</span>
                <span>{completed} done</span>
              </div>

              <div className="space-y-2">
                {dayTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                    No tasks
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <Link key={task.id} href={`/planner?date=${dayKey}`} className="block">
                      <div className="rounded-lg border bg-background p-2 transition-colors hover:border-primary/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{task.title}</p>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{formatTime(task.startTime)}</span>
                              {task.durationMinutes && <span>{task.durationMinutes} min</span>}
                            </div>
                          </div>
                          <span className={
                            "rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wide " +
                            (task.status === "done"
                              ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : task.status === "skipped"
                                ? "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                : "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300")
                          }>
                            {task.status === "in_progress" ? "in progress" : task.status}
                          </span>
                        </div>
                        {task.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.notes}</p>}
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {completed}</span>
                <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {active}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
