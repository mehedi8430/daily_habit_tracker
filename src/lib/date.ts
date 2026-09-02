import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
} from "date-fns";

export function toKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getMonthDays(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end });
}

export function getYearDays(year: number): Date[] {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(start);
  return eachDayOfInterval({ start, end });
}

export function getMonthBuckets(year: number): Date[][] {
  return Array.from({ length: 12 }, (_, m) =>
    getMonthDays(year, m)
  );
}

export function formatDayShort(date: Date): string {
  return format(date, "EEE d");
}

export function formatFullDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

export function monthlyAverageScore(
  completions: Record<string, boolean>,
  habits: { id: string }[],
  days: Date[]
): number {
  if (habits.length === 0 || days.length === 0) return 0;
  const total = habits.length * days.length;
  let done = 0;
  for (const day of days) {
    const key = toKey(day);
    for (const h of habits) {
      if (completions[`${h.id}__${key}`]) done += 1;
    }
  }
  return total === 0 ? 0 : (done / total) * 100;
}

export function yearlyCompletionRatio(
  completions: Record<string, boolean>,
  habits: { id: string }[],
  year: number
): number {
  const days = getYearDays(year);
  if (habits.length === 0 || days.length === 0) return 0;
  let total = 0;
  let done = 0;
  for (const day of days) {
    const key = toKey(day);
    for (const h of habits) {
      total += 1;
      if (completions[`${h.id}__${key}`]) done += 1;
    }
  }
  return total === 0 ? 0 : (done / total) * 100;
}

export function getLevel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 90) return { label: "Legendary", color: "#eab308" };
  if (score >= 75) return { label: "Elite", color: "#a855f7" };
  if (score >= 60) return { label: "Advanced", color: "#3b82f6" };
  if (score >= 40) return { label: "Intermediate", color: "#22c55e" };
  return { label: "Beginner", color: "#9ca3af" };
}

export interface StreakInfo {
  current: number;
  best: number;
}

export function computeStreaks(
  habitId: string,
  completions: Record<string, boolean>,
  days: Date[]
): StreakInfo {
  let best = 0;
  let run = 0;
  let current = 0;

  // iterate chronologically
  const sorted = [...days].sort((a, b) => a.getTime() - b.getTime());

  for (const day of sorted) {
    const done = !!completions[`${habitId}__${toKey(day)}`];
    if (done) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  // current streak: count backwards from the last day (or today)
  const ref = sorted[sorted.length - 1];
  if (ref) {
    for (let i = sorted.length - 1; i >= 0; i--) {
      const done = !!completions[`${habitId}__${toKey(sorted[i])}`];
      if (done) current += 1;
      else break;
    }
  }

  return { current, best };
}
