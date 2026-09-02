import { Analytics } from "@/components/analytics";
import { getInitialData } from "@/app/actions";

export default async function AnalyticsPage() {
  const data = await getInitialData();

  return (
    <div className="p-4 sm:p-8">
      <Analytics initialHabits={data.habits} initialCompletions={data.completions} />
    </div>
  );
}
