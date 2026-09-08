export interface Topic {
  id: string;
  userId: string;
  habitId: string | null;
  title: string;
  description: string | null;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTask {
  id: string;
  userId: string;
  title: string;
  habitId: string | null;
  topicId: string | null;
  date: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  notes: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = DailyTask["status"];
