import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTopics, getDailyTasks } from "@/app/planner-actions";
import { PlannerPage } from "@/components/planner/planner-page";
import { format, addDays } from "date-fns";

export default async function PlannerRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd");

  const [topicsResult, todayTasksResult, tomorrowTasksResult] =
    await Promise.all([
      getTopics(),
      getDailyTasks(todayStr),
      getDailyTasks(tomorrowStr),
    ]);

  return (
    <PlannerPage
      initialTopics={topicsResult.topics}
      initialTodayTasks={todayTasksResult.tasks}
      initialTomorrowTasks={tomorrowTasksResult.tasks}
      todayStr={todayStr}
      tomorrowStr={tomorrowStr}
    />
  );
}
