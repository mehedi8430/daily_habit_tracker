import { format } from "date-fns";
import { redirect } from "next/navigation";
import { PlannerPage } from "@/components/planner/planner-page";
import { getPlannerTasks } from "@/app/actions/planner.actions";
import { createClient } from "@/lib/supabase/server";

export default async function PlannerRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");
  const { tasks } = await getPlannerTasks(today);

  return <PlannerPage initialTasks={tasks} today={today} />;
}
