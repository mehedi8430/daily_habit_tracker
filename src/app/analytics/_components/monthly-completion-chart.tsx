"use client";

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
import { chartTooltipStyle } from "./chart-common";

export interface MonthlyCompletionPoint {
  month: string;
  score: number;
}

interface MonthlyCompletionChartProps {
  yearCursor: number;
  data: MonthlyCompletionPoint[];
}

export function MonthlyCompletionChart({ yearCursor, data }: MonthlyCompletionChartProps) {
  return (
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
            <BarChart data={data} margin={{ left: -10, right: 10 }}>
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
                contentStyle={chartTooltipStyle}
                formatter={(value) => [`${Number(value)}%`, "Completion"]}
              />
              <Bar
                dataKey="score"
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