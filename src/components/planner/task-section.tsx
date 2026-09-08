"use client";

import * as React from "react";
import { TaskItem } from "@/components/planner/task-item";
import { AddTaskForm } from "@/components/planner/add-task-form";
import { usePlannerStore } from "@/lib/planner-store";
import { useHabitStore } from "@/lib/store";
import type { DailyTask } from "@/lib/planner-types";

interface TaskSectionProps {
  date: string;
  label: string;
  targetDateForCarryOver: string;
  onOpenNotes: (task: DailyTask) => void;
}

interface TaskGroup {
  label: string;
  tasks: DailyTask[];
}

export function TaskSection({
  date,
  label,
  targetDateForCarryOver,
  onOpenNotes,
}: TaskSectionProps) {
  const tasks = usePlannerStore((s) => s.getTasksForDate(date));
  const habits = useHabitStore((s) => s.habits);
  const topics = usePlannerStore((s) => s.topics);

  const habitMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const h of habits) map[h.id] = h.name;
    return map;
  }, [habits]);

  const topicMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of topics) map[t.id] = t.title;
    return map;
  }, [topics]);

  const groups = React.useMemo((): TaskGroup[] => {
    const grouped: Record<string, DailyTask[]> = {};
    const ungrouped: DailyTask[] = [];

    for (const task of tasks) {
      if (task.habitId && habitMap[task.habitId]) {
        const key = `habit:${task.habitId}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      } else if (task.topicId && topicMap[task.topicId]) {
        const key = `topic:${task.topicId}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      } else {
        ungrouped.push(task);
      }
    }

    const result: TaskGroup[] = [];
    for (const [key, groupTasks] of Object.entries(grouped)) {
      const [, id] = key.split(":");
      const label = key.startsWith("habit:") ? habitMap[id] : topicMap[id];
      result.push({ label: label ?? "Unknown", tasks: groupTasks });
    }
    if (ungrouped.length > 0) {
      result.push({ label: "General", tasks: ungrouped });
    }
    return result;
  }, [tasks, habitMap, topicMap]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{label}</h2>
      <AddTaskForm date={date} />
      {groups.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No tasks for this day.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              {groups.length > 1 && (
                <p className="text-xs font-medium text-muted-foreground">
                  {group.label}
                </p>
              )}
              {group.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  targetDate={targetDateForCarryOver}
                  onOpenNotes={onOpenNotes}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
