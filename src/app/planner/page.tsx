import { format } from "date-fns";
import { redirect } from "next/navigation";
import { PlannerPage } from "@/app/planner/_components/planner-page";
import { getPlannerTasks } from "@/app/actions/planner.actions";
import { createClient } from "@/lib/supabase/server";

export default async function PlannerRoute({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }> | { date?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const resolvedParams =
    searchParams && typeof searchParams.then === "function"
      ? await searchParams
      : searchParams;

  const today = format(new Date(), "yyyy-MM-dd");
  const requestedDate =
    resolvedParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(resolvedParams.date)
      ? resolvedParams.date
      : today;

  const { tasks } = await getPlannerTasks(requestedDate);

  return <PlannerPage initialTasks={tasks} today={today} selectedDate={requestedDate} />;
}
