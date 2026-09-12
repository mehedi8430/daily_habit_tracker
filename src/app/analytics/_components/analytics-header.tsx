"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnalyticsView } from "./analytics-types";

interface AnalyticsHeaderProps {
  view: AnalyticsView;
  yearCursor: number;
  cursor: Date;
  onViewChange: (view: AnalyticsView) => void;
  onYearChange: (year: number) => void;
}

export function AnalyticsHeader({
  view,
  yearCursor,
  cursor,
  onViewChange,
  onYearChange,
}: AnalyticsHeaderProps) {
  return (
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
              onClick={() => onYearChange(yearCursor - 1)}
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
              onClick={() => onYearChange(yearCursor + 1)}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Tabs value={view} onValueChange={(v) => onViewChange(v as AnalyticsView)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}