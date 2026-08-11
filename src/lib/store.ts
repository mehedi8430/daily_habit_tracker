"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Habit } from "./types";
import { toKey } from "./date";

interface HabitState {
  habits: Habit[];
  completions: Record<string, boolean>; // key: `${habitId}__${date}`
  addHabit: (data: { name: string; emoji: string; category: string }) => void;
  updateHabit: (
    id: string,
    data: { name: string; emoji: string; category: string }
  ) => void;
  deleteHabit: (id: string) => void;
  reorderHabits: (ids: string[]) => void;
  toggleCompletion: (habitId: string, date: Date) => void;
  setCompletion: (habitId: string, date: Date, completed: boolean) => void;
  isCompleted: (habitId: string, date: Date) => boolean;
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function completionKey(habitId: string, date: Date): string {
  return `${habitId}__${toKey(date)}`;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      habits: [],
      completions: {},

      addHabit: (data) =>
        set((state) => {
          const newHabit: Habit = {
            id: genId(),
            name: data.name,
            emoji: data.emoji,
            category: data.category,
            order: state.habits.length,
            createdAt: new Date().toISOString(),
          };
          return { habits: [...state.habits, newHabit] };
        }),

      updateHabit: (id, data) =>
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id ? { ...h, ...data } : h
          ),
        })),

      deleteHabit: (id) =>
        set((state) => {
          const completions = { ...state.completions };
          for (const key of Object.keys(completions)) {
            if (key.startsWith(`${id}__`) || key.startsWith(id)) {
              delete completions[key];
            }
          }
          return {
            habits: state.habits
              .filter((h) => h.id !== id)
              .map((h, i) => ({ ...h, order: i })),
            completions,
          };
        }),

      reorderHabits: (ids) =>
        set((state) => ({
          habits: state.habits
            .map((h) => ({ ...h, order: ids.indexOf(h.id) }))
            .sort((a, b) => a.order - b.order),
        })),

      toggleCompletion: (habitId, date) =>
        set((state) => {
          const key = completionKey(habitId, date);
          const completions = { ...state.completions };
          completions[key] = !completions[key];
          return { completions };
        }),

      setCompletion: (habitId, date, completed) =>
        set((state) => {
          const key = completionKey(habitId, date);
          const completions = { ...state.completions };
          completions[key] = completed;
          return { completions };
        }),

      isCompleted: (habitId, date) => {
        return !!get().completions[completionKey(habitId, date)];
      },
    }),
    {
      name: "daily-habit-tracker",
      version: 1,
    }
  )
);
