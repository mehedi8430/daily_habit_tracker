"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Topic, DailyTask } from "@/lib/planner-types";

// ── Topic Actions ──────────────────────────────────────────

export async function getTopics(): Promise<{ topics: Topic[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { topics: [] };
  }

  const { data, error } = await supabase
    .from("habit_topics")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch topics: ${error.message}`);
  }

  return {
    topics: (data || []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      userId: t.user_id as string,
      habitId: (t.habit_id as string) ?? null,
      title: t.title as string,
      description: (t.description as string) ?? null,
      position: t.position as number,
      isActive: t.is_active as boolean,
      createdAt: t.created_at as string,
      updatedAt: t.updated_at as string,
    })),
  };
}

export async function createTopic(data: {
  title: string;
  description?: string;
  habitId?: string;
}): Promise<{ success: true; topic: Topic } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lastTopic, error: fetchError } = await supabase
    .from("habit_topics")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);

  if (fetchError) {
    return { error: fetchError.message };
  }

  const nextPosition =
    lastTopic && lastTopic.length > 0 ? lastTopic[0].position + 1 : 0;

  const { data: created, error } = await supabase
    .from("habit_topics")
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description ?? null,
      habit_id: data.habitId ?? null,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/planner");
  return {
    success: true,
    topic: {
      id: created.id as string,
      userId: created.user_id as string,
      habitId: (created.habit_id as string) ?? null,
      title: created.title as string,
      description: (created.description as string) ?? null,
      position: created.position as number,
      isActive: created.is_active as boolean,
      createdAt: created.created_at as string,
      updatedAt: created.updated_at as string,
    },
  };
}

export async function updateTopic(
  id: string,
  data: { title?: string; description?: string | null; is_active?: boolean }
): Promise<{ success: true; topic: Topic } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.is_active !== undefined) updates.is_active = data.is_active;

  const { data: updated, error } = await supabase
    .from("habit_topics")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/planner");
  return {
    success: true,
    topic: {
      id: updated.id as string,
      userId: updated.user_id as string,
      habitId: (updated.habit_id as string) ?? null,
      title: updated.title as string,
      description: (updated.description as string) ?? null,
      position: updated.position as number,
      isActive: updated.is_active as boolean,
      createdAt: updated.created_at as string,
      updatedAt: updated.updated_at as string,
    },
  };
}

export async function deleteTopic(
  id: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("habit_topics")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/planner");
  return { success: true };
}

export async function reorderTopics(
  ids: string[]
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const updates = ids.map((id, index) =>
    supabase
      .from("habit_topics")
      .update({ position: index })
      .eq("id", id)
      .eq("user_id", user.id)
  );

  await Promise.all(updates);

  revalidatePath("/planner");
  return { success: true };
}

// ── Daily Task Actions ─────────────────────────────────────

export async function getDailyTasks(
  date: string
): Promise<{ tasks: DailyTask[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { tasks: [] };
  }

  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return {
    tasks: (data || []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      userId: t.user_id as string,
      title: t.title as string,
      habitId: (t.habit_id as string) ?? null,
      topicId: (t.topic_id as string) ?? null,
      date: t.date as string,
      status: t.status as DailyTask["status"],
      notes: (t.notes as string) ?? null,
      position: t.position as number,
      createdAt: t.created_at as string,
      updatedAt: t.updated_at as string,
    })),
  };
}

export async function createDailyTask(data: {
  title: string;
  date: string;
  habitId?: string;
  topicId?: string;
}): Promise<{ success: true; task: DailyTask } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lastTask, error: fetchError } = await supabase
    .from("daily_tasks")
    .select("position")
    .eq("user_id", user.id)
    .eq("date", data.date)
    .order("position", { ascending: false })
    .limit(1);

  if (fetchError) {
    return { error: fetchError.message };
  }

  const nextPosition =
    lastTask && lastTask.length > 0 ? lastTask[0].position + 1 : 0;

  const { data: created, error } = await supabase
    .from("daily_tasks")
    .insert({
      user_id: user.id,
      title: data.title,
      date: data.date,
      habit_id: data.habitId ?? null,
      topic_id: data.topicId ?? null,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/planner");
  return {
    success: true,
    task: {
      id: created.id as string,
      userId: created.user_id as string,
      title: created.title as string,
      habitId: (created.habit_id as string) ?? null,
      topicId: (created.topic_id as string) ?? null,
      date: created.date as string,
      status: created.status as DailyTask["status"],
      notes: (created.notes as string) ?? null,
      position: created.position as number,
      createdAt: created.created_at as string,
      updatedAt: created.updated_at as string,
    },
  };
}

export async function updateDailyTask(
  id: string,
  data: { title?: string; status?: string; notes?: string | null }
): Promise<{ success: true; task: DailyTask } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.title !== undefined) updates.title = data.title;
  if (data.status !== undefined) updates.status = data.status;
  if (data.notes !== undefined) updates.notes = data.notes;

  const { data: updated, error } = await supabase
    .from("daily_tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/planner");
  return {
    success: true,
    task: {
      id: updated.id as string,
      userId: updated.user_id as string,
      title: updated.title as string,
      habitId: (updated.habit_id as string) ?? null,
      topicId: (updated.topic_id as string) ?? null,
      date: updated.date as string,
      status: updated.status as DailyTask["status"],
      notes: (updated.notes as string) ?? null,
      position: updated.position as number,
      createdAt: updated.created_at as string,
      updatedAt: updated.updated_at as string,
    },
  };
}

export async function deleteDailyTask(
  id: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("daily_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/planner");
  return { success: true };
}

export async function carryOverTask(
  id: string,
  targetDate: string
): Promise<{ success: true; task: DailyTask } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: original, error: fetchError } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    return { error: fetchError?.message ?? "Task not found" };
  }

  const { data: lastTask } = await supabase
    .from("daily_tasks")
    .select("position")
    .eq("user_id", user.id)
    .eq("date", targetDate)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    lastTask && lastTask.length > 0 ? lastTask[0].position + 1 : 0;

  const { data: created, error: insertError } = await supabase
    .from("daily_tasks")
    .insert({
      user_id: user.id,
      title: original.title,
      habit_id: original.habit_id,
      topic_id: original.topic_id,
      date: targetDate,
      status: "pending",
      notes: original.notes,
      position: nextPosition,
    })
    .select()
    .single();

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/planner");
  return {
    success: true,
    task: {
      id: created.id as string,
      userId: created.user_id as string,
      title: created.title as string,
      habitId: (created.habit_id as string) ?? null,
      topicId: (created.topic_id as string) ?? null,
      date: created.date as string,
      status: created.status as DailyTask["status"],
      notes: (created.notes as string) ?? null,
      position: created.position as number,
      createdAt: created.created_at as string,
      updatedAt: created.updated_at as string,
    },
  };
}

export async function reorderDailyTasks(
  date: string,
  ids: string[]
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const updates = ids.map((id, index) =>
    supabase
      .from("daily_tasks")
      .update({ position: index })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("date", date)
  );

  await Promise.all(updates);

  revalidatePath("/planner");
  return { success: true };
}
