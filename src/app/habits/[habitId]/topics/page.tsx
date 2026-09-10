import { notFound } from "next/navigation";
import { getHabitTopics } from "@/app/actions/topic.actions";
import { TopicManager } from "@/app/habits/[habitId]/topics/_components/topic-manager";

export default async function HabitTopicsPage({
  params,
}: {
  params: Promise<{ habitId: string }>;
}) {
  const { habitId } = await params;
  const data = await getHabitTopics(habitId);
  if (!data.habit) notFound();

  return (
    <TopicManager
      habitId={habitId}
      habitName={data.habit.name}
      initialGoal={data.habit.goal}
      initialTopics={data.topics}
    />
  );
}
