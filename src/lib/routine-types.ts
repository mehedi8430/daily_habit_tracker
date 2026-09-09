export type RoutineStatus = "planned" | "in_progress" | "done" | "skipped";
export type RoutinePriority = "low" | "medium" | "high";

export interface RoutineTask {
  id: string;
  userId: string;
  title: string;
  date: string;
  startTime: string | null;
  durationMinutes: number | null;
  priority: RoutinePriority;
  status: RoutineStatus;
  notes: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}