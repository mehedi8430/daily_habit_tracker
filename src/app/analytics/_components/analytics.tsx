"use client";

import * as React from "react";
import {
  format,
  isToday,
  subDays,
} from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useHabitStore } from "@/stores/store";
import {
  getMonthDays,
  getYearDays,
  getMonthBuckets,
  toKey,
  monthlyAverageScore,
  yearlyCompletionRatio,
  getLevel,
  computeStreaks,
  formatDayShort,
} from "@/lib/date";
import { getCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy } from "lucide-react";
import { Habit } from "@/lib/types";
import { CompletionRow } from "@/app/actions/habit.actions";
import { PlannerTask } from "@/lib/planner-types";
import { getPlannerTasksBetween } from "@/app/actions/planner.actions";

const HEATMAP_LEVELS = [
  "rgba(22,163,74,0.12)",
  "rgba(22,163,74,0.35)",
  "rgba(22,163,74,0.6)",
  "rgba(22,163,74,0.85)",
  "rgba(22,163,74,1)",
];

function heatColor(ratio: number): string {
  if (ratio <= 0) return "rgba(148,148,148,0.12)";
  const idx = Math.min(4, Math.ceil(ratio * 4));
  return HEATMAP_LEVELS[idx];
}

interface AnalyticsProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
  initialPlannerTasks: PlannerTask[];
}

const WORKED_STATUSES = ["done", "in_progress"];

interface TimeWorkedPoint {
  date?: string;
  month?: string;
  week?: string;
  full: string;
  hours: number;
  mins: number;
}

function workedMinutes(tasks: PlannerTask[], date: string): number {
  return tasks
    .filter(
      (t) =>
        t.date === date &&
        t.durationMinutes &&
        WORKED_STATUSES.includes(t.status)
    )
    .reduce((sum, t) => sum + (t.durationMinutes ?? 0), 0);
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function Analytics({ initialHabits, initialCompletions, initialPlannerTasks }: AnalyticsProps) {
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const initialized = useHabitStore((s) => s.initialized);
  const initialize = useHabitStore((s) => s.initialize);

  React.useEffect(() => {
    if (!initialized) {
      initialize(initialHabits, initialCompletions);
    }
  }, [initialized, initialize, initialHabits, initialCompletions]);

  const [cursor] = React.useState<Date>(() => new Date());
  const [yearCursor, setYearCursor] = React.useState<number>(new Date().getFullYear());
  const [view, setView] = React.useState<"month" | "week" | "year">("month");
  const [timeView, setTimeView] = React.useState<"day" | "week">("day");
  const [plannerTasks, setPlannerTasks] = React.useState<PlannerTask[]>(initialPlannerTasks);

  const monthDays = React.useMemo(
    () => getMonthDays(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );
  const weekDays = React.useMemo(() => {
    const end = isToday(cursor) ? new Date() : cursor;
    return Array.from({ length: 7 }, (_, i) => subDays(end, 6 - i));
  }, [cursor]);

  const days = view === "month" ? monthDays : weekDays;

  const [from, to] = React.useMemo(() => {
    if (view === "year") {
      return [
        format(new Date(yearCursor, 0, 1), "yyyy-MM-dd"),
        format(new Date(yearCursor, 11, 31), "yyyy-MM-dd"),
      ];
    }
    if (days.length === 0) return ["", ""];
    return [toKey(days[0]), toKey(days[days.length - 1])];
  }, [view, yearCursor, days]);

  React.useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    getPlannerTasksBetween(from, to)
      .then((res) => {
        if (!cancelled) setPlannerTasks(res.tasks);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [from, to]);
  const sortedHabits = React.useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  );

  const overallRate = monthlyAverageScore(completions, sortedHabits, monthDays);

  // Per-habit bar chart data
  const perHabitData = sortedHabits.map((h) => {
    const count = days.filter(
      (d) => completions[`${h.id}__${toKey(d)}`]
    ).length;
    return {
      name: h.name,
      days: count,
      total: days.length,
      fill: getCategory(h.category).color,
    };
  });

  // Daily score line chart data
  const dailyData = days.map((d) => {
    const done = sortedHabits.filter(
      (h) => completions[`${h.id}__${toKey(d)}`]
    ).length;
    const pct = sortedHabits.length
      ? Math.round((done / sortedHabits.length) * 100)
      : 0;
    return {
      date: formatDayShort(d),
      full: format(d, "MMM d"),
      score: pct,
    };
  });

  // Time worked (planner) per day
  const timeWorkedData: TimeWorkedPoint[] = days.map((d) => {
    const mins = workedMinutes(plannerTasks, toKey(d));
    return {
      date: formatDayShort(d),
      full: format(d, "MMM d"),
      hours: Math.round((mins / 60) * 10) / 10,
      mins,
    };
  });

  // Time worked (planner) per week within the current month
  const timeWorkedWeekly: TimeWorkedPoint[] = React.useMemo(() => {
    const buckets: { days: Date[]; start: number; end: number }[] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      buckets.push({
        days: monthDays.slice(i, i + 7),
        start: i + 1,
        end: Math.min(i + 7, monthDays.length),
      });
    }
    return buckets.map((b, idx) => {
      const mins = b.days.reduce(
        (sum, d) => sum + workedMinutes(plannerTasks, toKey(d)),
        0
      );
      const first = format(b.days[0], "MMM d");
      const last = format(b.days[b.days.length - 1], "MMM d");
      return {
        week: `Week ${idx + 1}`,
        full: `Week ${idx + 1} · ${first}–${last}`,
        hours: Math.round((mins / 60) * 10) / 10,
        mins,
      };
    });
  }, [monthDays, plannerTasks]);

  // Streaks
  const streaks = sortedHabits.map((h) => ({
    habit: h,
    ...computeStreaks(h.id, completions, monthDays),
  }));

  const level = getLevel(overallRate);

  // Heatmap (full year)
  const heatYear = yearCursor;
  const yearDays = React.useMemo(() => getYearDays(heatYear), [heatYear]);

  const heatData = yearDays.map((d) => {
    const done = sortedHabits.filter(
      (h) => completions[`${h.id}__${toKey(d)}`]
    ).length;
    const ratio = sortedHabits.length ? done / sortedHabits.length : 0;
    return {
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE, MMM d"),
      ratio,
      done,
      total: sortedHabits.length,
    };
  });

  const weeks: (typeof heatData)[] = [];
  for (let i = 0; i < heatData.length; i += 7) {
    weeks.push(heatData.slice(i, i + 7));
  }

  // Yearly report computations
  const yearOverallRate = yearlyCompletionRatio(completions, sortedHabits, yearCursor);
  const monthBuckets = React.useMemo(() => getMonthBuckets(yearCursor), [yearCursor]);
  const monthlyChartData = monthBuckets.map((monthDaysArr, m) => {
    const pct = monthlyAverageScore(completions, sortedHabits, monthDaysArr);
    return {
      month: format(new Date(yearCursor, m, 1), "MMM"),
      score: Math.round(pct),
    };
  });
  const timeWorkedMonthly: TimeWorkedPoint[] = monthBuckets.map((monthDaysArr, m) => {
    const mins = monthDaysArr.reduce(
      (sum, d) => sum + workedMinutes(plannerTasks, toKey(d)),
      0
    );
    return {
      month: format(new Date(yearCursor, m, 1), "MMM"),
      full: format(new Date(yearCursor, m, 1), "MMMM yyyy"),
      hours: Math.round((mins / 60) * 10) / 10,
      mins,
    };
  });
  const yearStreaks = sortedHabits.map((h) => ({
    habit: h,
    ...computeStreaks(h.id, completions, getYearDays(yearCursor)),
  }));
  const yearBestStreak = Math.max(0, ...yearStreaks.map((s) => s.best));
  const yearLevel = getLevel(yearOverallRate);

  if (sortedHabits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
        <div className="mb-4 text-6xl">📊</div>
        <h3 className="text-lg font-semibold">No data to analyze yet</h3>
        <p className="text-sm text-muted-foreground">
          Add habits and mark them done to unlock your analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {view === "year"
              ? `Your progress for ${yearCursor}`
              : `Your progress for ${format(cursor, "MMMM yyyy")}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {view === "year" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYearCursor((y) => y - 1)}
                aria-label="Previous year"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-20 text-center text-lg font-bold">
                {yearCursor}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYearCursor((y) => y + 1)}
                aria-label="Next year"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week" | "year")}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {view === "year" ? "Yearly Completion" : "Monthly Completion"}
            </CardDescription>
            <CardTitle className="text-3xl">
              {Math.round(view === "year" ? yearOverallRate : overallRate)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              of all possible habit-days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Level Badge</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <span
                className="rounded-md px-2 py-1 text-lg font-bold text-white"
                style={{
                  backgroundColor: (view === "year" ? yearLevel : level).color,
                }}
              >
                {(view === "year" ? yearLevel : level).label}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              based on {view === "year" ? "yearly" : "monthly"} average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Habits</CardDescription>
            <CardTitle className="text-3xl">{sortedHabits.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">being tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {view === "year" ? "Best Streak" : "Best Current Streak"}
            </CardDescription>
            <CardTitle className="text-3xl">
              {view === "year"
                ? yearBestStreak
                : Math.max(0, ...streaks.map((s) => s.current))}
              🔥
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">days in a row</p>
          </CardContent>
        </Card>
      </div>

      {/* Time worked (planner) */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Time Worked</CardTitle>
              <CardDescription>
                {view === "year"
                  ? `Hours of completed planner tasks in each month of ${yearCursor}`
                  : view === "week"
                    ? "Hours of completed planner tasks per day this week"
                    : timeView === "day"
                      ? "Hours of completed planner tasks per day this month"
                      : "Hours of completed planner tasks per week this month"}
              </CardDescription>
            </div>
            {view === "month" && (
              <Tabs value={timeView} onValueChange={(v) => setTimeView(v as "day" | "week")}>
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={view === "year" ? timeWorkedMonthly : view === "month" && timeView === "week" ? timeWorkedWeekly : timeWorkedData}
                margin={{ left: -10, right: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey={view === "year" ? "month" : view === "month" && timeView === "week" ? "week" : "date"}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, _n, item) => [
                    formatDuration(item?.payload?.mins ?? 0),
                    "Time worked",
                  ]}
                  labelFormatter={(_l, payload) =>
                    (payload?.[0]?.payload?.full as string) ?? ""
                  }
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Yearly month-by-month completion chart */}
      {view === "year" && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Completion</CardTitle>
            <CardDescription>
              % of habits completed in each month of {yearCursor}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${Number(value)}%`, "Completion"]}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-habit bar chart */}
      {view !== "year" && (
      <Card>
        <CardHeader>
          <CardTitle>Per-Habit Completion</CardTitle>
          <CardDescription>
            How many days each habit was completed this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={perHabitData}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, days.length]}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, _n, item) => [
                    `${Number(value)} / ${item?.payload?.total} days`,
                    "Completed",
                  ]}
                />
                <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                  {perHabitData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Daily score line chart */}
      {view !== "year" && (
      <Card>
        <CardHeader>
          <CardTitle>Daily Score</CardTitle>
          <CardDescription>
            % of habits completed each day this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyData}
                margin={{ left: -10, right: 10, top: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${Number(value)}%`, "Score"]}
                  labelFormatter={(_l, payload) =>
                    (payload?.[0]?.payload?.full as string) ?? ""
                  }
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Streaks panel */}
      {view !== "year" && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" /> Streaks
          </CardTitle>
          <CardDescription>
            Current and best streaks for each habit this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {streaks.map((s) => {
              const cat = getCategory(s.habit.category);
              return (
                <div
                  key={s.habit.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="max-w-[120px] truncate text-sm font-medium">
                      {s.habit.name}
                    </span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1" title="Current streak">
                      🔥 {s.current}
                    </span>
                    <span
                      className="flex items-center gap-1 text-muted-foreground"
                      title="Best streak"
                    >
                      <Trophy className="h-3.5 w-3.5" /> {s.best}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Yearly Heatmap</CardTitle>
          <CardDescription>
            Completion density per day for {heatYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell) => (
                    <div
                      key={cell.date}
                      title={`${cell.label}: ${cell.done}/${cell.total} done`}
                      className="h-3.5 w-3.5 rounded-sm"
                      style={{ backgroundColor: heatColor(cell.ratio) }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((r) => (
              <div
                key={r}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: heatColor(r) }}
              />
            ))}
            <span>More</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
