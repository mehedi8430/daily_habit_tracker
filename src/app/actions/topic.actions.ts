"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { HabitTopic, TopicStatus } from "@/lib/types";

function mapTopic(topic: Record<string, unknown>): HabitTopic {
    return {
        id: topic.id as string,
        habitId: topic.habit_id as string,
        title: topic.title as string,
        status: topic.status as TopicStatus,
        startTime: (topic.start_time as string) ?? null,
        endTime: (topic.end_time as string) ?? null,
        details: (topic.details as string) ?? "",
        resources: (topic.resources as string) ?? "",
        order: (topic.sort_order as number) ?? 0,
    };
}

export async function getHabitTopics(habitId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [habitResult, topicsResult] = await Promise.all([
        supabase.from("habits").select("*").eq("id", habitId).eq("user_id", user.id).single(),
        supabase.from("habit_topics").select("*").eq("habit_id", habitId).eq("user_id", user.id).order("sort_order", { ascending: true }),
    ]);

    if (habitResult.error || !habitResult.data) return { habit: null, topics: [] };
    if (topicsResult.error) throw new Error(topicsResult.error.message);
    return {
        habit: {
            id: habitResult.data.id as string,
            name: habitResult.data.name as string,
            goal: (habitResult.data.goal as string) ?? "",
        },
        topics: (topicsResult.data ?? []).map((topic) => mapTopic(topic as Record<string, unknown>)),
    };
}

export type HabitTopicInput = Omit<HabitTopic, "id" | "habitId" | "order">;

export async function createHabitTopic(habitId: string, data: HabitTopicInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: last } = await supabase.from("habit_topics").select("sort_order").eq("habit_id", habitId).eq("user_id", user.id).order("sort_order", { ascending: false }).limit(1);
    const { data: topic, error } = await supabase.from("habit_topics").insert({ user_id: user.id, habit_id: habitId, title: data.title, status: data.status, start_time: data.startTime, end_time: data.endTime, details: data.details, resources: data.resources, sort_order: last?.[0]?.sort_order != null ? last[0].sort_order + 1 : 0 }).select().single();
    if (error) return { error: error.message };
    revalidatePath(`/habits/${habitId}/topics`);
    return { success: true, topic: mapTopic(topic as Record<string, unknown>) };
}

export async function updateHabitTopic(topicId: string, habitId: string, data: HabitTopicInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: topic, error } = await supabase.from("habit_topics").update({ title: data.title, status: data.status, start_time: data.startTime, end_time: data.endTime, details: data.details, resources: data.resources, updated_at: new Date().toISOString() }).eq("id", topicId).eq("habit_id", habitId).eq("user_id", user.id).select().single();
    if (error) return { error: error.message };
    revalidatePath(`/habits/${habitId}/topics`);
    return { success: true, topic: mapTopic(topic as Record<string, unknown>) };
}

export async function deleteHabitTopic(topicId: string, habitId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { error } = await supabase.from("habit_topics").delete().eq("id", topicId).eq("habit_id", habitId).eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath(`/habits/${habitId}/topics`);
    return { success: true };
}

export async function reorderHabitTopics(habitId: string, ids: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const results = await Promise.all(ids.map((id, index) => supabase.from("habit_topics").update({ sort_order: index }).eq("id", id).eq("habit_id", habitId).eq("user_id", user.id)));
    const failure = results.find((result) => result.error);
    if (failure?.error) return { error: failure.error.message };
    revalidatePath(`/habits/${habitId}/topics`);
    return { success: true };
}
