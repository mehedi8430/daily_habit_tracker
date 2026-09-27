"use client";

import * as React from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { addDays, format, parseISO } from "date-fns";
import { Clock3 } from "lucide-react";
import { toast } from "sonner";
import {
  deletePlannerTask,
  getPlannerTasks,
  getWeeklyGoalsForDate,
  movePlannerTaskToDate,
  reorderPlannerTasks,
  setWeeklyPlannerGoalCompletion,
  updatePlannerTask,
} from "@/app/actions/planner.actions";
import type {
  PlannerStatus,
  PlannerTask,
  WeeklyPlannerGoal,
  WeeklyPlannerGoalOccurrence,
} from "@/lib/planner-types";
import { EditTaskDialog } from "./edit-task-dialog";
import { PlannerHeader } from "./planner-header";
import { PlannerStatsSidebar } from "./planner-stats-sidebar";
import { PlannerTaskManagement } from "./planner-task-management";
import { DeletePlannerTaskDialog } from "./delete-planner-task-dialog";

interface PlannerManagementProps {
  initialTasks: PlannerTask[];
  initialWeeklyGoals: WeeklyPlannerGoal[];
  initialWeeklyGoalOccurrences: WeeklyPlannerGoalOccurrence[];
  today: string;
  selectedDate?: string;
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function sortTasks(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.startTime && !b.startTime) return a.position - b.position;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime) || a.position - b.position;
  });
}

export function PlannerManagement({
  initialTasks,
  initialWeeklyGoals,
  initialWeeklyGoalOccurrences,
  today,
  selectedDate: selectedDateProp,
}: PlannerManagementProps) {
  const initialDate = selectedDateProp ?? today;
  const [selectedDate, setSelectedDate] = React.useState(initialDate);
  const [tasks, setTasks] = React.useState(initialTasks);
  const [weeklyGoals, setWeeklyGoals] = React.useState(initialWeeklyGoals);
  const [weeklyGoalOccurrences, setWeeklyGoalOccurrences] = React.useState(
    initialWeeklyGoalOccurrences,
  );
  const [lastLoadedDate, setLastLoadedDate] = React.useState(initialDate);
  const [lastLoadedWeeklyDate, setLastLoadedWeeklyDate] = React.useState(initialDate);
  const [orderedIds, setOrderedIds] = React.useState(() =>
    sortTasks(initialTasks).map((task) => task.id),
  );
  const [toDelete, setToDelete] = React.useState<PlannerTask | null>(null);
  const [editing, setEditing] = React.useState<PlannerTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  React.useEffect(() => {
    if (selectedDate === lastLoadedDate) return;
    let cancelled = false;

    getPlannerTasks(selectedDate)
      .then(({ tasks: loadedTasks }) => {
        if (cancelled) return;
        setTasks(loadedTasks);
        setOrderedIds(sortTasks(loadedTasks).map((task) => task.id));
        setLastLoadedDate(selectedDate);
      })
      .catch((error) => {
        if (cancelled) return;
        setTasks([]);
        setOrderedIds([]);
        setLastLoadedDate(selectedDate);
        toast.error(error instanceof Error ? error.message : "Failed to load planner");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, lastLoadedDate]);

  React.useEffect(() => {
    if (selectedDate === lastLoadedWeeklyDate) return;
    let cancelled = false;

    getWeeklyGoalsForDate(selectedDate)
      .then((result) => {
        if (cancelled) return;
        setWeeklyGoals(result.goals);
        setWeeklyGoalOccurrences(result.occurrences);
        setLastLoadedWeeklyDate(selectedDate);
      })
      .catch((error) => {
        if (cancelled) return;
        setWeeklyGoals([]);
        setWeeklyGoalOccurrences([]);
        setLastLoadedWeeklyDate(selectedDate);
        toast.error(
          error instanceof Error ? error.message : "Failed to load weekly goals",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, lastLoadedWeeklyDate]);

  const date = parseISO(`${selectedDate}T12:00:00`);
  const isDateLoading =
    selectedDate !== lastLoadedDate || selectedDate !== lastLoadedWeeklyDate;
  const completedWeeklyGoals = weeklyGoals.filter((goal) =>
    weeklyGoalOccurrences.some(
      (occurrence) =>
        occurrence.goalId === goal.id &&
        occurrence.date === selectedDate &&
        occurrence.completed,
    ),
  ).length;
  const completedCount =
    tasks.filter((task) => task.status === "done").length + completedWeeklyGoals;
  const totalTaskCount = tasks.length + weeklyGoals.length;
  const activeCount =
    tasks.filter((task) => task.status !== "done" && task.status !== "skipped")
      .length +
    weeklyGoals.length -
    completedWeeklyGoals;
  const scheduledMinutes = tasks.reduce(
    (total, task) => total + (task.durationMinutes ?? 0),
    0,
  );
  const sortedTasks = orderedIds
    .map((id) => tasks.find((task) => task.id === id))
    .filter((task): task is PlannerTask => Boolean(task));

  const changeDate = (offset: number) => {
    setSelectedDate(dateKey(addDays(date, offset)));
  };

  const updateStatus = async (task: PlannerTask, status: PlannerStatus) => {
    const previous = tasks;
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status } : item)),
    );
    const result = await updatePlannerTask(task.id, { status });
    if ("error" in result) {
      setTasks(previous);
      toast.error(result.error);
    }
  };

  const deleteTask = async (task: PlannerTask) => {
    const previous = tasks;
    const previousIds = orderedIds;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setOrderedIds((current) => current.filter((id) => id !== task.id));
    const result = await deletePlannerTask(task.id);
    if (result.error) {
      setTasks(previous);
      setOrderedIds(previousIds);
      toast.error(result.error);
    }
  };

  const moveTaskToNextDay = async (task: PlannerTask) => {
    const previous = tasks;
    const previousIds = orderedIds;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    setOrderedIds((current) => current.filter((id) => id !== task.id));
    const result = await movePlannerTaskToDate(
      task.id,
      dateKey(addDays(date, 1)),
    );
    if ("error" in result) {
      setTasks(previous);
      setOrderedIds(previousIds);
      toast.error(result.error);
    } else {
      toast.success("Task moved to tomorrow");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(active.id as string);
    const newIndex = orderedIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(reordered);
    reorderPlannerTasks(reordered).then((result) => {
      if ("error" in result) toast.error(result.error);
    });
  };

  const updateTask = (updated: PlannerTask) => {
    setTasks((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const toggleWeeklyGoal = async (goal: WeeklyPlannerGoal) => {
    const existing = weeklyGoalOccurrences.find(
      (occurrence) =>
        occurrence.goalId === goal.id && occurrence.date === selectedDate,
    );
    const completed = !(existing?.completed ?? false);
    const previous = weeklyGoalOccurrences;
    setWeeklyGoalOccurrences((current) =>
      existing
        ? current.map((occurrence) =>
            occurrence.goalId === goal.id && occurrence.date === selectedDate
              ? { ...occurrence, completed }
              : occurrence,
          )
        : [...current, { goalId: goal.id, date: selectedDate, completed }],
    );

    const result = await setWeeklyPlannerGoalCompletion(
      goal.id,
      selectedDate,
      completed,
    );
    if ("error" in result) {
      setWeeklyGoalOccurrences(previous);
      toast.error(result.error);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <PlannerHeader
        date={date}
        onChangeDate={changeDate}
        onToday={() => setSelectedDate(today)}
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <PlannerStatsSidebar
          isLoading={isDateLoading}
          completedCount={completedCount}
          totalTaskCount={totalTaskCount}
          activeCount={activeCount}
          scheduledMinutes={scheduledMinutes}
        />
        <PlannerTaskManagement
          date={date}
          selectedDate={selectedDate}
          isLoading={isDateLoading}
          weeklyGoals={weeklyGoals}
          weeklyGoalOccurrences={weeklyGoalOccurrences}
          sortedTasks={sortedTasks}
          sensors={sensors}
          onTaskCreated={(task) => {
            setTasks((current) => [...current, task]);
            setOrderedIds((current) => [...current, task.id]);
          }}
          onToggleWeeklyGoal={toggleWeeklyGoal}
          onDragEnd={handleDragEnd}
          onStatusChange={updateStatus}
          onDeleteTask={setToDelete}
          onMoveTask={moveTaskToNextDay}
          onEditTask={setEditing}
        />
      </div>

      <footer className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        <Clock3 className="h-4 w-4 shrink-0" />
        <span>
          Time blocks are guidance, not a contract. Keep the list short enough
          to finish.
        </span>
      </footer>

      <DeletePlannerTaskDialog
        task={toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          const task = toDelete;
          setToDelete(null);
          void deleteTask(task);
        }}
      />

      <EditTaskDialog
        task={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onUpdated={updateTask}
      />
    </div>
  );
}
