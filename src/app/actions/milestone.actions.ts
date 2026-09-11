"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { HabitMilestone, MilestoneStatus } from "@/lib/types";

function mapMilestone(milestone: Record<string, unknown>): HabitMilestone {
    return {
        id: milestone.id as string,
        habitId: milestone.habit_id as string,
        title: milestone.title as string,
        status: milestone.status as MilestoneStatus,
        startDate: (milestone.start_date as string | null) ?? null,
        targetDate: (milestone.target_date as string | null) ?? null,
        details: (milestone.details as string) ?? "",
        resources: (milestone.resources as string) ?? "",
        order: (milestone.sort_order as number) ?? 0,
    };
}

export async function getHabitMilestones(habitId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [habitResult, milestonesResult] = await Promise.all([
        supabase.from("habits").select("*").eq("id", habitId).eq("user_id", user.id).single(),
        supabase.from("habit_topics").select("*").eq("habit_id", habitId).eq("user_id", user.id).order("sort_order", { ascending: true }),
    ]);

    if (habitResult.error || !habitResult.data) return { habit: null, milestones: [] };
    if (milestonesResult.error) throw new Error(milestonesResult.error.message);
    return {
        habit: {
            id: habitResult.data.id as string,
            name: habitResult.data.name as string,
            goal: (habitResult.data.goal as string) ?? "",
        },
        milestones: (milestonesResult.data ?? []).map((milestone) => mapMilestone(milestone as Record<string, unknown>)),
    };
}

export type HabitMilestoneInput = Omit<HabitMilestone, "id" | "habitId" | "order">;

export async function createHabitMilestone(habitId: string, data: HabitMilestoneInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: last } = await supabase.from("habit_topics").select("sort_order").eq("habit_id", habitId).eq("user_id", user.id).order("sort_order", { ascending: false }).limit(1);
    const { data: milestone, error } = await supabase.from("habit_topics").insert({ user_id: user.id, habit_id: habitId, title: data.title, status: data.status, start_date: data.startDate, target_date: data.targetDate, details: data.details, resources: data.resources, sort_order: last?.[0]?.sort_order != null ? last[0].sort_order + 1 : 0 }).select().single();
    if (error) return { error: error.message };
    revalidatePath(`/habits/${habitId}/milestones`);
    return { success: true, milestone: mapMilestone(milestone as Record<string, unknown>) };
}

export async function updateHabitMilestone(milestoneId: string, habitId: string, data: HabitMilestoneInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: milestone, error } = await supabase.from("habit_topics").update({ title: data.title, status: data.status, start_date: data.startDate, target_date: data.targetDate, details: data.details, resources: data.resources, updated_at: new Date().toISOString() }).eq("id", milestoneId).eq("habit_id", habitId).eq("user_id", user.id).select().single();
    if (error) return { error: error.message };
    revalidatePath(`/habits/${habitId}/milestones`);
    return { success: true, milestone: mapMilestone(milestone as Record<string, unknown>) };
}

export async function deleteHabitMilestone(milestoneId: string, habitId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { error } = await supabase.from("habit_topics").delete().eq("id", milestoneId).eq("habit_id", habitId).eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath(`/habits/${habitId}/milestones`);
    return { success: true };
}

export async function reorderHabitMilestones(habitId: string, ids: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const results = await Promise.all(ids.map((id, index) => supabase.from("habit_topics").update({ sort_order: index }).eq("id", id).eq("habit_id", habitId).eq("user_id", user.id)));
    const failure = results.find((result) => result.error);
    if (failure?.error) return { error: failure.error.message };
    revalidatePath(`/habits/${habitId}/milestones`);
    return { success: true };
}