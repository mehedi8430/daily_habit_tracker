import { format } from "date-fns";
import { redirect } from "next/navigation";
import { RoutinePage } from "@/components/routine-page";
import { getRoutineTasks } from "@/app/routine-actions";
import { createClient } from "@/lib/supabase/server";

export default async function RoutineRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");
  const { tasks } = await getRoutineTasks(today);

  return <RoutinePage initialTasks={tasks} today={today} />;
}
