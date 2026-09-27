"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { format } from "date-fns";
import { Check, CheckCircle2, Circle } from "lucide-react";
import { NewTaskForm } from "@/app/planner/_components/new-task-form";
import { TaskRow } from "@/app/planner/_components/task-row";
import type {
  PlannerStatus,
  PlannerTask,
  WeeklyPlannerGoal,
  WeeklyPlannerGoalOccurrence,
} from "@/lib/planner-types";

export function PlannerTaskManagement({
  date,
  selectedDate,
  isLoading,
  weeklyGoals,
  weeklyGoalOccurrences,
  sortedTasks,
  sensors,
  onTaskCreated,
  onToggleWeeklyGoal,
  onDragEnd,
  onStatusChange,
  onDeleteTask,
  onMoveTask,
  onEditTask,
}: {
  date: Date;
  selectedDate: string;
  isLoading: boolean;
  weeklyGoals: WeeklyPlannerGoal[];
  weeklyGoalOccurrences: WeeklyPlannerGoalOccurrence[];
  sortedTasks: PlannerTask[];
  sensors: SensorDescriptor<SensorOptions>[];
  onTaskCreated: (task: PlannerTask) => void;
  onToggleWeeklyGoal: (goal: WeeklyPlannerGoal) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onStatusChange: (task: PlannerTask, status: PlannerStatus) => void;
  onDeleteTask: (task: PlannerTask) => void;
  onMoveTask: (task: PlannerTask) => void;
  onEditTask: (task: PlannerTask) => void;
}) {
  return (
    <div className="space-y-6">
      <NewTaskForm date={selectedDate} onCreated={onTaskCreated} />

      <section
        aria-live="polite"
        aria-busy={isLoading}
        className="space-y-3"
      >
        <div>
          <h2 className="text-lg font-semibold">Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Click the status circle to move a task forward.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-label="Loading tasks">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-xl border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded bg-muted" />
                    <div className="h-3 w-1/4 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-20 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedTasks.length === 0 && weeklyGoals.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="font-semibold">Nothing scheduled yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with the one task that would make this day meaningful.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {weeklyGoals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Recurring goals</h3>
                  <span className="text-xs text-muted-foreground">
                    Repeats every {format(date, "EEEE")}
                  </span>
                </div>
                {weeklyGoals.map((goal) => {
                  const completed = weeklyGoalOccurrences.some(
                    (occurrence) =>
                      occurrence.goalId === goal.id &&
                      occurrence.date === selectedDate &&
                      occurrence.completed,
                  );
                  return (
                    <div
                      key={goal.id}
                      className={`flex items-start gap-3 rounded-lg border bg-card px-3 py-3 ${completed ? "opacity-70" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleWeeklyGoal(goal)}
                        aria-label={`${completed ? "Mark incomplete" : "Complete"}: ${goal.title}`}
                        title={completed ? "Mark incomplete" : "Mark complete"}
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary"}`}
                      >
                        {completed ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {goal.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Weekly goal</span>
                          {goal.startTime && (
                            <span>{goal.startTime.slice(0, 5)}</span>
                          )}
                          {goal.notes && <span>{goal.notes}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {sortedTasks.length > 0 && (
              <div className="space-y-2">
                {weeklyGoals.length > 0 && (
                  <h3 className="text-sm font-semibold">Daily tasks</h3>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={sortedTasks.map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={onStatusChange}
                        onDelete={onDeleteTask}
                        onMoveNext={onMoveTask}
                        onEdit={onEditTask}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
