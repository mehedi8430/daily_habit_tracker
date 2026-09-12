"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AnalyticsView } from "./analytics-types";

interface Level {
  label: string;
  color: string;
}

interface SummaryCardsProps {
  view: AnalyticsView;
  completion: number;
  bestStreak: number;
  habitCount: number;
  level: Level;
}

export function SummaryCards({
  view,
  completion,
  bestStreak,
  habitCount,
  level,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>
            {view === "year" ? "Yearly Completion" : "Monthly Completion"}
          </CardDescription>
          <CardTitle className="text-3xl">{completion}%</CardTitle>
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
              style={{ backgroundColor: level.color }}
            >
              {level.label}
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
          <CardTitle className="text-3xl">{habitCount}</CardTitle>
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
          <CardTitle className="text-3xl">{bestStreak} 🔥</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">days in a row</p>
        </CardContent>
      </Card>
    </div>
  );
}