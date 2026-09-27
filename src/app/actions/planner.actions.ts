"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  PlannerPriority,
  PlannerStatus,
  PlannerTask,
  WeeklyPlannerGoal,
  WeeklyPlannerGoalOccurrence,
} from "@/lib/planner-types";

function mapTask(task: Record<string, unknown>): PlannerTask {
  return {
    id: task.id as string,
    userId: task.user_id as string,
    title: task.title as string,
    date: task.date as string,
    startTime: (task.start_time as string) ?? null,
    durationMinutes: (task.duration_minutes as number) ?? null,
    priority: task.priority as PlannerPriority,
    status: task.status as PlannerStatus,
    notes: (task.notes as string) ?? null,
    position: task.position as number,
    createdAt: task.created_at as string,
    updatedAt: task.updated_at as string,
  };
}

function mapWeeklyGoal(goal: Record<string, unknown>): WeeklyPlannerGoal {
  return {
    id: goal.id as string,
    userId: goal.user_id as string,
    title: goal.title as string,
    weekday: goal.weekday as number,
    startTime: (goal.start_time as string) ?? null,
    notes: (goal.notes as string) ?? null,
    createdAt: goal.created_at as string,
    updatedAt: goal.updated_at as string,
  };
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getPlannerTasks(date: string): Promise<{ tasks: PlannerTask[] }> {
  const { supabase, user } = await getUser();
  const { data, error } = await supabase
    .from("daily_planner_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  if (error) throw new Error(`Failed to fetch planner tasks: ${error.message}`);
  return { tasks: (data ?? []).map((task) => mapTask(task as Record<string, unknown>)) };
}

export async function getPlannerTasksBetween(
  from: string,
  to: string
): Promise<{ tasks: PlannerTask[] }> {
  const { supabase, user } = await getUser();
  const { data, error } = await supabase
    .from("daily_planner_tasks")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) throw new Error(`Failed to fetch planner tasks: ${error.message}`);
  return { tasks: (data ?? []).map((task) => mapTask(task as Record<string, unknown>)) };
}

export async function getWeeklyPlannerData(
  from: string,
  to: string,
): Promise<{ goals: WeeklyPlannerGoal[]; occurrences: WeeklyPlannerGoalOccurrence[] }> {
  const { supabase, user } = await getUser();
  const [goalsResult, occurrencesResult] = await Promise.all([
    supabase
      .from("weekly_planner_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false }),
    supabase
      .from("weekly_planner_goal_occurrences")
      .select("goal_id, occurrence_date, completed")
      .eq("user_id", user.id)
      .gte("occurrence_date", from)
      .lte("occurrence_date", to),
  ]);

  if (goalsResult.error) throw new Error(`Failed to fetch weekly goals: ${goalsResult.error.message}`);
  if (occurrencesResult.error) throw new Error(`Failed to fetch weekly goal progress: ${occurrencesResult.error.message}`);

  return {
    goals: (goalsResult.data ?? []).map((goal) => mapWeeklyGoal(goal as Record<string, unknown>)),
    occurrences: (occurrencesResult.data ?? []).map((occurrence) => ({
      goalId: occurrence.goal_id as string,
      date: occurrence.occurrence_date as string,
      completed: occurrence.completed as boolean,
    })),
  };
}

export async function createWeeklyPlannerGoal(data: {
  title: string;
  weekday: number;
  startTime?: string;
  notes?: string;
}): Promise<{ goal: WeeklyPlannerGoal } | { error: string }> {
  const { supabase, user } = await getUser();
  const title = data.title.trim();
  if (!title) return { error: "Goal title is required" };
  if (!Number.isInteger(data.weekday) || data.weekday < 1 || data.weekday > 7) {
    return { error: "Choose a valid weekday" };
  }

  const { data: goal, error } = await supabase
    .from("weekly_planner_goals")
    .insert({
      user_id: user.id,
      title,
      weekday: data.weekday,
      start_time: data.startTime || null,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  revalidatePath("/planner/weekly");
  return { goal: mapWeeklyGoal(goal as Record<string, unknown>) };
}

export async function updateWeeklyPlannerGoal(
  id: string,
  data: { title: string; weekday: number; startTime?: string; notes?: string },
): Promise<{ goal: WeeklyPlannerGoal } | { error: string }> {
  const { supabase, user } = await getUser();
  const title = data.title.trim();
  if (!title) return { error: "Goal title is required" };
  if (!Number.isInteger(data.weekday) || data.weekday < 1 || data.weekday > 7) {
    return { error: "Choose a valid weekday" };
  }

  const { data: goal, error } = await supabase
    .from("weekly_planner_goals")
    .update({
      title,
      weekday: data.weekday,
      start_time: data.startTime || null,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  revalidatePath("/planner/weekly");
  return { goal: mapWeeklyGoal(goal as Record<string, unknown>) };
}

export async function deleteWeeklyPlannerGoal(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("weekly_planner_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/planner");
  revalidatePath("/planner/weekly");
  return {};
}

export async function setWeeklyPlannerGoalCompletion(
  goalId: string,
  date: string,
  completed: boolean,
): Promise<{ success: true } | { error: string }> {
  const { supabase, user } = await getUser();
  const { data: goal, error: goalError } = await supabase
    .from("weekly_planner_goals")
    .select("id, weekday")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (goalError || !goal) return { error: goalError?.message ?? "Weekly goal not found" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Choose a valid goal date" };
  }
  const [year, month, day] = date.split("-").map(Number);
  const occurrenceDate = new Date(year, month - 1, day, 12);
  if (
    occurrenceDate.getFullYear() !== year ||
    occurrenceDate.getMonth() !== month - 1 ||
    occurrenceDate.getDate() !== day
  ) {
    return { error: "Choose a valid goal date" };
  }
  const weekday = occurrenceDate.getDay() === 0 ? 7 : occurrenceDate.getDay();
  if (weekday !== goal.weekday) {
    return { error: "This goal is not scheduled for that date" };
  }

  const { error } = await supabase
    .from("weekly_planner_goal_occurrences")
    .upsert(
      {
        user_id: user.id,
        goal_id: goalId,
        occurrence_date: date,
        completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "goal_id,occurrence_date" },
    );

  if (error) return { error: error.message };
  revalidatePath("/planner");
  revalidatePath("/planner/weekly");
  return { success: true };
}

export async function createPlannerTask(data: {
  title: string;
  date: string;
  startTime?: string;
  durationMinutes?: number;
  priority: PlannerPriority;
  notes?: string;
}): Promise<{ task: PlannerTask } | { error: string }> {
  const { supabase, user } = await getUser();
  const { count } = await supabase
    .from("daily_planner_tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("date", data.date);

  const { data: task, error } = await supabase
    .from("daily_planner_tasks")
    .insert({
      user_id: user.id,
      title: data.title.trim(),
      date: data.date,
      start_time: data.startTime || null,
      duration_minutes: data.durationMinutes || null,
      priority: data.priority,
      notes: data.notes?.trim() || null,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { task: mapTask(task as Record<string, unknown>) };
}

export async function updatePlannerTask(
  id: string,
  updates: {
    title?: string;
    startTime?: string | null;
    durationMinutes?: number | null;
    priority?: PlannerPriority;
    status?: PlannerStatus;
    notes?: string | null;
  }
): Promise<{ task: PlannerTask } | { error: string }> {
  const { supabase, user } = await getUser();
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) values.title = updates.title.trim();
  if (updates.startTime !== undefined) values.start_time = updates.startTime || null;
  if (updates.durationMinutes !== undefined) values.duration_minutes = updates.durationMinutes || null;
  if (updates.priority !== undefined) values.priority = updates.priority;
  if (updates.status !== undefined) values.status = updates.status;
  if (updates.notes !== undefined) values.notes = updates.notes;

  const { data: task, error } = await supabase
    .from("daily_planner_tasks")
    .update(values)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { task: mapTask(task as Record<string, unknown>) };
}

export async function deletePlannerTask(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("daily_planner_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/planner");
  return {};
}

export async function reorderPlannerTasks(ids: string[]): Promise<{ success: true } | { error: string }> {
  const { supabase, user } = await getUser();
  const updates = ids.map((id, index) =>
    supabase
      .from("daily_planner_tasks")
      .update({ position: index, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id),
  );
  const results = await Promise.all(updates);
  const err = results.find((r) => r.error);
  if (err) return { error: err.error!.message };
  revalidatePath("/planner");
  return { success: true };
}

export async function movePlannerTaskToDate(
  id: string,
  date: string
): Promise<{ task: PlannerTask } | { error: string }> {
  const { supabase, user } = await getUser();

  const { count } = await supabase
    .from("daily_planner_tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("date", date);

  const { data: task, error } = await supabase
    .from("daily_planner_tasks")
    .update({
      date,
      status: "planned",
      position: count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { task: mapTask(task as Record<string, unknown>) };
}