import { CalendarGrid } from "@/components/calendar-grid";

export default function HomePage() {
  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Habit Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Click a cell to mark a habit done for the day. Drag the handle to
          reorder.
        </p>
      </div>
      <CalendarGrid />
    </div>
  );
}
