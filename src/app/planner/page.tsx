import { format } from "date-fns";
import { redirect } from "next/navigation";
import { PlannerPage } from "@/app/planner/_components/planner-page";
import {
  getPlannerTasks,
  getWeeklyGoalsForDate,
} from "@/app/actions/planner.actions";
import { createClient } from "@/lib/supabase/server";

export default async function PlannerRoute({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const resolvedParams = await searchParams;

  const today = format(new Date(), "yyyy-MM-dd");
  const requestedDate =
    resolvedParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(resolvedParams.date)
      ? resolvedParams.date
      : today;

  const [{ tasks }, weeklyGoalData] = await Promise.all([
    getPlannerTasks(requestedDate),
    getWeeklyGoalsForDate(requestedDate),
  ]);

  return (
    <PlannerPage
      initialTasks={tasks}
      initialWeeklyGoals={weeklyGoalData.goals}
      initialWeeklyGoalOccurrences={weeklyGoalData.occurrences}
      today={today}
      selectedDate={requestedDate}
    />
  );
}
