export interface Habit {
  id: string;
  name: string;
  goal: string;
  emoji?: string;
  category: string;
  order: number;
  createdAt: string; // ISO date
}

export type TopicStatus = "planned" | "in_progress" | "done" | "skipped";

export interface HabitTopic {
  id: string;
  habitId: string;
  title: string;
  status: TopicStatus;
  startTime: string | null;
  endTime: string | null;
  details: string;
  resources: string;
  order: number;
}

export const CATEGORIES = [
  { id: "health", label: "Health", color: "#22c55e" },
  { id: "mind", label: "Mind", color: "#a855f7" },
  { id: "work", label: "Work", color: "#3b82f6" },
  { id: "fitness", label: "Fitness", color: "#ef4444" },
  { id: "other", label: "Other", color: "#eab308" },
] as const;

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
