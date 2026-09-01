"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Habit } from "@/lib/types";

export interface CompletionRow {
  habit_id: string;
  date: string;
  completed: boolean;
}

export async function getInitialData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, habits: [], completions: [] };
  }

  const [habitsResult, completionsResult] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("completions")
      .select("*")
      .eq("user_id", user.id),
  ]);

  if (habitsResult.error) {
    throw new Error(`Failed to fetch habits: ${habitsResult.error.message}`);
  }

  if (completionsResult.error) {
    throw new Error(
      `Failed to fetch completions: ${completionsResult.error.message}`
    );
  }

  return {
    user,
    habits: (habitsResult.data || []).map((h: Record<string, unknown>) => ({
      id: h.id as string,
      name: h.name as string,
      emoji: h.emoji as string,
      category: h.category as string,
      order: (h.sort_order as number) ?? 0,
      createdAt: h.created_at as string,
    })),
    completions: (completionsResult.data || []).map((c: Record<string, unknown>) => ({
      habit_id: c.habit_id as string,
      date: c.date as string,
      completed: c.completed as boolean,
    })),
  };
}

export async function addHabit(data: {
  name: string;
  category: string;
}): Promise<{ success: true; habit: Habit } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lastHabit, error: habitsError } = await supabase
    .from("habits")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (habitsError) {
    return { error: habitsError.message };
  }

  const nextOrder =
    lastHabit && lastHabit.length > 0 ? lastHabit[0].sort_order + 1 : 0;

  const { data: created, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      name: data.name,
      category: data.category,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return {
    success: true,
    habit: {
      id: created.id as string,
      name: created.name as string,
      emoji: created.emoji as string,
      category: created.category as string,
      order: (created.sort_order as number) ?? 0,
      createdAt: created.created_at as string,
    },
  };
}

export async function updateHabit(
  id: string,
  data: { name: string; category: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("habits")
    .update({
      name: data.name,
      category: data.category,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteHabit(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

export async function reorderHabits(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const updates = ids.map((id, index) =>
    supabase
      .from("habits")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("user_id", user.id)
  );

  await Promise.all(updates);

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

export async function toggleCompletion(habitId: string, date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("completions")
    .select("*")
    .eq("user_id", user.id)
    .eq("habit_id", habitId)
    .eq("date", date)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("completions")
      .update({ completed: !existing.completed, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from("completions").insert({
      user_id: user.id,
      habit_id: habitId,
      date,
      completed: true,
    });

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

export async function setCompletion(
  habitId: string,
  date: string,
  completed: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("completions")
    .select("*")
    .eq("user_id", user.id)
    .eq("habit_id", habitId)
    .eq("date", date)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("completions")
      .update({ completed, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from("completions").insert({
      user_id: user.id,
      habit_id: habitId,
      date,
      completed,
    });

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}
