"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RoutinePriority, RoutineStatus, RoutineTask } from "@/lib/routine-types";

function mapTask(task: Record<string, unknown>): RoutineTask {
  return {
    id: task.id as string,
    userId: task.user_id as string,
    title: task.title as string,
    date: task.date as string,
    startTime: (task.start_time as string) ?? null,
    durationMinutes: (task.duration_minutes as number) ?? null,
    priority: task.priority as RoutinePriority,
    status: task.status as RoutineStatus,
    notes: (task.notes as string) ?? null,
    position: task.position as number,
    createdAt: task.created_at as string,
    updatedAt: task.updated_at as string,
  };
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getRoutineTasks(date: string): Promise<{ tasks: RoutineTask[] }> {
  const { supabase, user } = await getUser();
  const { data, error } = await supabase
    .from("daily_planner_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  if (error) throw new Error(`Failed to fetch routine tasks: ${error.message}`);
  return { tasks: (data ?? []).map((task) => mapTask(task as Record<string, unknown>)) };
}

export async function createRoutineTask(data: {
  title: string;
  date: string;
  startTime?: string;
  durationMinutes?: number;
  priority: RoutinePriority;
  notes?: string;
}): Promise<{ task: RoutineTask } | { error: string }> {
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
  revalidatePath("/routine");
  return { task: mapTask(task as Record<string, unknown>) };
}

export async function updateRoutineTask(
  id: string,
  updates: { status?: RoutineStatus; notes?: string | null }
): Promise<{ task: RoutineTask } | { error: string }> {
  const { supabase, user } = await getUser();
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
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
  revalidatePath("/routine");
  return { task: mapTask(task as Record<string, unknown>) };
}

export async function deleteRoutineTask(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("daily_planner_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/routine");
  return {};
}