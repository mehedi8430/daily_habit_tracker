import { Analytics } from "@/components/analytics";
import { getInitialData } from "@/app/actions";

export default async function AnalyticsPage() {
  const data = await getInitialData();

  return <Analytics initialHabits={data.habits} initialCompletions={data.completions} />;
}
