"use client";

import { create } from "zustand";
import type { Topic, DailyTask } from "./planner-types";
import * as plannerActions from "@/app/planner-actions";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface PlannerState {
  topics: Topic[];
  tasksByDate: Record<string, DailyTask[]>;
  initialized: boolean;

  initializeTopics: (topics: Topic[]) => void;
  initializeTasks: (date: string, tasks: DailyTask[]) => void;
  createTopic: (
    title: string,
    description?: string,
    habitId?: string
  ) => Promise<void>;
  updateTopic: (id: string, updates: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  reorderTopics: (ids: string[]) => Promise<void>;
  toggleTopicActive: (id: string) => Promise<void>;

  getTasksForDate: (date: string) => DailyTask[];
  createTask: (params: {
    title: string;
    date: string;
    habitId?: string;
    topicId?: string;
  }) => Promise<void>;
  updateTask: (id: string, updates: Partial<DailyTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  carryOverTask: (id: string, targetDate: string) => Promise<void>;
  reorderTasks: (date: string, ids: string[]) => Promise<void>;
}

export const usePlannerStore = create<PlannerState>()((set, get) => ({
  topics: [],
  tasksByDate: {},
  initialized: false,

  initializeTopics: (topics) => {
    set({ topics, initialized: true });
  },

  initializeTasks: (date, tasks) => {
    set((state) => ({
      tasksByDate: { ...state.tasksByDate, [date]: tasks },
    }));
  },

  // ── Topics ────────────────────────────────────────────────

  createTopic: async (title, description, habitId) => {
    const tempId = genId();
    const newTopic: Topic = {
      id: tempId,
      userId: "",
      habitId: habitId ?? null,
      title,
      description: description ?? null,
      position: get().topics.length,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ topics: [...state.topics, newTopic] }));
    const result = await plannerActions.createTopic({
      title,
      description,
      habitId,
    });
    if ("error" in result) {
      set((state) => ({
        topics: state.topics.filter((t) => t.id !== tempId),
      }));
      throw new Error(result.error);
    }
    set((state) => ({
      topics: state.topics.map((t) => (t.id === tempId ? result.topic : t)),
    }));
  },

  updateTopic: async (id, updates) => {
    const prev = get().topics;
    set((state) => ({
      topics: state.topics.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    const result = await plannerActions.updateTopic(id, updates);
    if ("error" in result) {
      set({ topics: prev });
      throw new Error(result.error);
    }
  },

  deleteTopic: async (id) => {
    const prev = get().topics;
    set((state) => ({
      topics: state.topics.filter((t) => t.id !== id),
    }));
    const result = await plannerActions.deleteTopic(id);
    if ("error" in result) {
      set({ topics: prev });
      throw new Error(result.error);
    }
  },

  reorderTopics: async (ids) => {
    const prev = get().topics;
    set((state) => ({
      topics: state.topics
        .map((t) => ({ ...t, position: ids.indexOf(t.id) }))
        .sort((a, b) => a.position - b.position),
    }));
    const result = await plannerActions.reorderTopics(ids);
    if ("error" in result) {
      set({ topics: prev });
      throw new Error(result.error);
    }
  },

  toggleTopicActive: async (id) => {
    const topic = get().topics.find((t) => t.id === id);
    if (!topic) return;
    const newActive = !topic.isActive;
    const prev = get().topics;
    set((state) => ({
      topics: state.topics.map((t) =>
        t.id === id ? { ...t, isActive: newActive } : t
      ),
    }));
    const result = await plannerActions.updateTopic(id, {
      is_active: newActive,
    });
    if ("error" in result) {
      set({ topics: prev });
      throw new Error(result.error);
    }
  },

  // ── Daily Tasks ───────────────────────────────────────────

  getTasksForDate: (date) => {
    return get().tasksByDate[date] ?? [];
  },

  createTask: async (params) => {
    const tempId = genId();
    const newTask: DailyTask = {
      id: tempId,
      userId: "",
      title: params.title,
      habitId: params.habitId ?? null,
      topicId: params.topicId ?? null,
      date: params.date,
      status: "pending",
      notes: null,
      position: (get().tasksByDate[params.date]?.length ?? 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [params.date]: [...(state.tasksByDate[params.date] ?? []), newTask],
      },
    }));
    const result = await plannerActions.createDailyTask(params);
    if ("error" in result) {
      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [params.date]: (state.tasksByDate[params.date] ?? []).filter(
            (t) => t.id !== tempId
          ),
        },
      }));
      throw new Error(result.error);
    }
    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [params.date]: (state.tasksByDate[params.date] ?? []).map((t) =>
          t.id === tempId ? result.task : t
        ),
      },
    }));
  },

  updateTask: async (id, updates) => {
    let affectedDate = "";
    let prevTasks: DailyTask[] = [];
    for (const [date, tasks] of Object.entries(get().tasksByDate)) {
      const found = tasks.find((t) => t.id === id);
      if (found) {
        affectedDate = date;
        prevTasks = [...tasks];
        break;
      }
    }
    if (!affectedDate) return;

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [affectedDate]: (state.tasksByDate[affectedDate] ?? []).map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      },
    }));
    const result = await plannerActions.updateDailyTask(id, updates);
    if ("error" in result) {
      set((state) => ({
        tasksByDate: { ...state.tasksByDate, [affectedDate]: prevTasks },
      }));
      throw new Error(result.error);
    }
  },

  deleteTask: async (id) => {
    let affectedDate = "";
    let prevTasks: DailyTask[] = [];
    for (const [date, tasks] of Object.entries(get().tasksByDate)) {
      const found = tasks.find((t) => t.id === id);
      if (found) {
        affectedDate = date;
        prevTasks = [...tasks];
        break;
      }
    }
    if (!affectedDate) return;

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [affectedDate]: (state.tasksByDate[affectedDate] ?? []).filter(
          (t) => t.id !== id
        ),
      },
    }));
    const result = await plannerActions.deleteDailyTask(id);
    if ("error" in result) {
      set((state) => ({
        tasksByDate: { ...state.tasksByDate, [affectedDate]: prevTasks },
      }));
      throw new Error(result.error);
    }
  },

  carryOverTask: async (id, targetDate) => {
    let affectedDate = "";
    let originalTask: DailyTask | null = null;
    for (const [date, tasks] of Object.entries(get().tasksByDate)) {
      const found = tasks.find((t) => t.id === id);
      if (found) {
        affectedDate = date;
        originalTask = found;
        break;
      }
    }
    if (!affectedDate || !originalTask) return;

    const tempId = genId();
    const newTask: DailyTask = {
      ...originalTask,
      id: tempId,
      date: targetDate,
      status: "pending",
      position: (get().tasksByDate[targetDate]?.length ?? 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [targetDate]: [...(state.tasksByDate[targetDate] ?? []), newTask],
      },
    }));

    const result = await plannerActions.carryOverTask(id, targetDate);
    if ("error" in result) {
      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [targetDate]: (state.tasksByDate[targetDate] ?? []).filter(
            (t) => t.id !== tempId
          ),
        },
      }));
      throw new Error(result.error);
    }
    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [targetDate]: (state.tasksByDate[targetDate] ?? []).map((t) =>
          t.id === tempId ? result.task : t
        ),
      },
    }));
  },

  reorderTasks: async (date, ids) => {
    const prevTasks = [...(get().tasksByDate[date] ?? [])];
    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [date]: (state.tasksByDate[date] ?? [])
          .map((t) => ({ ...t, position: ids.indexOf(t.id) }))
          .sort((a, b) => a.position - b.position),
      },
    }));
    const result = await plannerActions.reorderDailyTasks(date, ids);
    if ("error" in result) {
      set((state) => ({
        tasksByDate: { ...state.tasksByDate, [date]: prevTasks },
      }));
      throw new Error(result.error);
    }
  },
}));
