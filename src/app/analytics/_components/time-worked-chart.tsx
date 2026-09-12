"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMonthBuckets, toKey, formatDayShort } from "@/lib/date";
import { PlannerTask } from "@/lib/planner-types";
import { chartTooltipStyle } from "./chart-common";
import { AnalyticsView, TimeWorkedPoint } from "./analytics-types";

const WORKED_STATUSES = ["done", "in_progress"];

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

function toHours(mins: number): number {
  return Math.round((mins / 60) * 10) / 10;
}

interface TimeWorkedChartProps {
  view: AnalyticsView;
  yearCursor: number;
  days: Date[];
  tasks: PlannerTask[];
}

export function TimeWorkedChart({ view, yearCursor, days, tasks }: TimeWorkedChartProps) {
  const [timeView, setTimeView] = React.useState<"day" | "week">("day");

  const data: TimeWorkedPoint[] = React.useMemo(() => {
    if (view === "year") {
      return getMonthBuckets(yearCursor).map((monthDays, m) => {
        const mins = monthDays.reduce(
          (sum, d) => sum + workedMinutes(tasks, toKey(d)),
          0
        );
        return {
          month: format(new Date(yearCursor, m, 1), "MMM"),
          full: format(new Date(yearCursor, m, 1), "MMMM yyyy"),
          hours: toHours(mins),
          mins,
        };
      });
    }

    if (view === "month" && timeView === "week") {
      const buckets: Date[][] = [];
      for (let i = 0; i < days.length; i += 7) {
        buckets.push(days.slice(i, i + 7));
      }
      return buckets.map((b, idx) => {
        const mins = b.reduce(
          (sum, d) => sum + workedMinutes(tasks, toKey(d)),
          0
        );
        return {
          week: `Week ${idx + 1}`,
          full: `Week ${idx + 1} · ${format(b[0], "MMM d")}–${format(b[b.length - 1], "MMM d")}`,
          hours: toHours(mins),
          mins,
        };
      });
    }

    return days.map((d) => {
      const mins = workedMinutes(tasks, toKey(d));
      return {
        date: formatDayShort(d),
        full: format(d, "MMM d"),
        hours: toHours(mins),
        mins,
      };
    });
  }, [view, timeView, yearCursor, days, tasks]);

  const description =
    view === "year"
      ? `Hours of completed planner tasks in each month of ${yearCursor}`
      : view === "week"
        ? "Hours of completed planner tasks per day this week"
        : timeView === "day"
          ? "Hours of completed planner tasks per day this month"
          : "Hours of completed planner tasks per week this month";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Time Worked</CardTitle>
            <CardDescription>{description}</CardDescription>
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
            <BarChart data={data} margin={{ left: -10, right: 10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey={
                  view === "year"
                    ? "month"
                    : view === "month" && timeView === "week"
                      ? "week"
                      : "date"
                }
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <RTooltip
                contentStyle={chartTooltipStyle}
                formatter={(value, _n, item) => [
                  formatDuration(item?.payload?.mins ?? 0),
                  "Time worked",
                ]}
                labelFormatter={(_l, payload) =>
                  (payload?.[0]?.payload?.full as string) ?? ""
                }
              />
              <Bar
                dataKey="hours"
                radius={[4, 4, 0, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}