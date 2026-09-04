"use client";

import { create } from "zustand";
import { Habit } from "./types";
import { toKey } from "./date";
import * as actions from "@/app/actions";

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function completionKey(habitId: string, date: Date): string {
  return `${habitId}__${toKey(date)}`;
}

interface HabitState {
  habits: Habit[];
  completions: Record<string, boolean>;
  notes: Record<string, string | null>;
  initialized: boolean;
  initialize: (habits: Habit[], completions: actions.CompletionRow[]) => void;
  addHabit: (data: { name: string; category: string }) => Promise<void>;
  updateHabit: (
    id: string,
    data: { name: string; category: string }
  ) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  reorderHabits: (ids: string[]) => Promise<void>;
  toggleCompletion: (habitId: string, date: Date) => Promise<void>;
  setCompletion: (habitId: string, date: Date, completed: boolean) => Promise<void>;
  saveNotes: (habitId: string, date: Date, notes: string | null) => Promise<void>;
  getNotes: (habitId: string, date: Date) => string | null;
  isCompleted: (habitId: string, date: Date) => boolean;
}

export const useHabitStore = create<HabitState>()((set, get) => ({
  habits: [],
  completions: {},
  notes: {},
  initialized: false,

  initialize: (habits, completions) => {
    const completionsMap: Record<string, boolean> = {};
    const notesMap: Record<string, string | null> = {};
    for (const c of completions) {
      const key = `${c.habit_id}__${c.date}`;
      completionsMap[key] = c.completed;
      notesMap[key] = c.notes;
    }
    set({ habits, completions: completionsMap, notes: notesMap, initialized: true });
  },

  addHabit: async (data) => {
    const tempId = genId();
    const newHabit: Habit = {
      id: tempId,
      name: data.name,
      category: data.category,
      order: get().habits.length,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ habits: [...state.habits, newHabit] }));
    const result = await actions.addHabit(data);
    if ("error" in result) {
      set((state) => ({
        habits: state.habits.filter((h) => h.id !== tempId),
      }));
      throw new Error(result.error);
    }
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === tempId ? result.habit : h
      ),
    }));
  },

  updateHabit: async (id, data) => {
    const prev = get().habits;
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...data } : h)),
    }));
    const result = await actions.updateHabit(id, data);
    if ("error" in result && result.error) {
      set({ habits: prev });
      throw new Error(result.error as string);
    }
  },

  deleteHabit: async (id) => {
    const prev = get().habits;
    const prevCompletions = get().completions;
    const prevNotes = get().notes;
    set((state) => {
      const completions = { ...state.completions };
      const notes = { ...state.notes };
      for (const key of Object.keys(completions)) {
        if (key.startsWith(`${id}__`)) {
          delete completions[key];
          delete notes[key];
        }
      }
      return {
        habits: state.habits
          .filter((h) => h.id !== id)
          .map((h, i) => ({ ...h, order: i })),
        completions,
        notes,
      };
    });
    const result = await actions.deleteHabit(id);
    if ("error" in result && result.error) {
      set({ habits: prev, completions: prevCompletions, notes: prevNotes });
      throw new Error(result.error as string);
    }
  },

  reorderHabits: async (ids) => {
    const prev = get().habits;
    set((state) => ({
      habits: state.habits
        .map((h) => ({ ...h, order: ids.indexOf(h.id) }))
        .sort((a, b) => a.order - b.order),
    }));
    const result = await actions.reorderHabits(ids);
    if ("error" in result && result.error) {
      set({ habits: prev });
      throw new Error(result.error as string);
    }
  },

  toggleCompletion: async (habitId, date) => {
    const key = completionKey(habitId, date);
    const prev = get().completions[key];
    set((state) => {
      const completions = { ...state.completions };
      completions[key] = !completions[key];
      return { completions };
    });
    const dateStr = toKey(date);
    const result = await actions.toggleCompletion(habitId, dateStr);
    if ("error" in result && result.error) {
      set((state) => {
        const completions = { ...state.completions };
        completions[key] = prev;
        return { completions };
      });
      throw new Error(result.error as string);
    }
  },

  setCompletion: async (habitId, date, completed) => {
    const key = completionKey(habitId, date);
    const prev = get().completions[key];
    set((state) => {
      const completions = { ...state.completions };
      completions[key] = completed;
      return { completions };
    });
    const dateStr = toKey(date);
    const result = await actions.setCompletion(habitId, dateStr, completed);
    if ("error" in result && result.error) {
      set((state) => {
        const completions = { ...state.completions };
        completions[key] = prev;
        return { completions };
      });
      throw new Error(result.error as string);
    }
  },

  isCompleted: (habitId, date) => {
    return !!get().completions[completionKey(habitId, date)];
  },

  saveNotes: async (habitId, date, notes) => {
    const key = completionKey(habitId, date);
    const prev = get().notes[key] ?? null;
    set((state) => ({
      notes: { ...state.notes, [key]: notes },
    }));
    const dateStr = toKey(date);
    const result = await actions.saveNotes(habitId, dateStr, notes);
    if ("error" in result && result.error) {
      set((state) => ({
        notes: { ...state.notes, [key]: prev },
      }));
      throw new Error(result.error as string);
    }
  },

  getNotes: (habitId, date) => {
    return get().notes[completionKey(habitId, date)] ?? null;
  },
}));
