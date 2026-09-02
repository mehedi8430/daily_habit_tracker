import { CalendarGrid } from "@/components/calendar-grid";
import { getInitialData } from "@/app/actions";

export default async function HomePage() {
  const data = await getInitialData();

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Habit Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Click a cell to mark a habit done for the day. Drag the handle to
          reorder.
        </p>
      </div>
      <CalendarGrid initialHabits={data.habits} initialCompletions={data.completions} />
    </div>
  );
}
