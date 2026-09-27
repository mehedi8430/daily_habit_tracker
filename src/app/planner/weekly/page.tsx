import { format, startOfWeek } from "date-fns";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyPlannerData } from "@/app/actions/planner.actions";
import { WeeklyPlannerView } from "./_components/weekly-planner-view";

export default async function WeeklyPlannerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const start = format(weekStart, "yyyy-MM-dd");
  const end = format(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  const { goals, occurrences } = await getWeeklyPlannerData(start, end);

  return (
    <WeeklyPlannerView
      initialGoals={goals}
      initialOccurrences={occurrences}
      defaultDate={start}
    />
  );
}
