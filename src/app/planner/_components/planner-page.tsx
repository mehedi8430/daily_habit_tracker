"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  addDays,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CalendarRange,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  deletePlannerTask,
  getPlannerTasks,
  movePlannerTaskToDate,
  reorderPlannerTasks,
  updatePlannerTask,
} from "@/app/actions/planner.actions";
import type { PlannerStatus, PlannerTask } from "@/lib/planner-types";
import { NewTaskForm } from "./new-task-form";
import { EditTaskDialog } from "./edit-task-dialog";
import { TaskRow } from "./task-row";

interface PlannerPageProps {
  initialTasks: PlannerTask[];
  today: string;
  selectedDate?: string;
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function PlannerPage({ initialTasks, today, selectedDate: selectedDateProp }: PlannerPageProps) {
  const [selectedDate, setSelectedDate] = React.useState(selectedDateProp ?? today);
  const [tasks, setTasks] = React.useState(initialTasks);
  const [orderedIds, setOrderedIds] = React.useState<string[]>(() =>
    [...initialTasks]
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return a.position - b.position;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return (
          a.startTime.localeCompare(b.startTime) || a.position - b.position
        );
      })
      .map((t) => t.id),
  );
  const [lastLoadedDate, setLastLoadedDate] = React.useState(today);
  const [toDelete, setToDelete] = React.useState<PlannerTask | null>(null);
  const [editing, setEditing] = React.useState<PlannerTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  React.useEffect(() => {
    if (selectedDate === lastLoadedDate) return;
    let cancelled = false;
    getPlannerTasks(selectedDate)
      .then((result) => {
        if (!cancelled) {
          setTasks(result.tasks);
          setOrderedIds(
            result.tasks
              .sort((a, b) => {
                if (!a.startTime && !b.startTime)
                  return a.position - b.position;
                if (!a.startTime) return 1;
                if (!b.startTime) return -1;
                return (
                  a.startTime.localeCompare(b.startTime) ||
                  a.position - b.position
                );
              })
              .map((t) => t.id),
          );
          setLastLoadedDate(selectedDate);
        }
      })
      .catch((error) => {
        if (!cancelled)
          toast.error(
            error instanceof Error ? error.message : "Failed to load planner",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, lastLoadedDate]);

  const date = parseISO(`${selectedDate}T12:00:00`);
  const completedCount = tasks.filter((task) => task.status === "done").length;
  const activeCount = tasks.filter(
    (task) => task.status !== "done" && task.status !== "skipped",
  ).length;
  const scheduledMinutes = tasks.reduce(
    (total, task) => total + (task.durationMinutes ?? 0),
    0,
  );
  const sortedTasks = orderedIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean) as PlannerTask[];

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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>{format(date, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Planner</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Plan your work in time blocks, keep the next action visible, and
            close the day with a clear record of what moved forward.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeDate(-1)}
              aria-label="Previous day"
              title="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={isToday(date) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedDate(today)}
            >
              {isToday(date)
                ? "Today"
                : isTomorrow(date)
                  ? "Tomorrow"
                  : isYesterday(date)
                    ? "Yesterday"
                    : format(date, "EEE, MMM d")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeDate(1)}
              aria-label="Next day"
              title="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/planner/weekly">
            <Button variant="outline" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              Weekly planner
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Completed
              </p>
              <p className="mt-1 text-2xl font-bold">
                {completedCount}
                <span className="text-base font-normal text-muted-foreground">
                  /{tasks.length}
                </span>
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Remaining
              </p>
              <p className="mt-1 text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">
                planned or in progress
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Planned time
              </p>
              <p className="mt-1 text-2xl font-bold">
                {scheduledMinutes}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  min
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                from task estimates
              </p>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <NewTaskForm
            date={selectedDate}
            onCreated={(task) => {
              setTasks((current) => [...current, task]);
              setOrderedIds((current) => [...current, task.id]);
            }}
          />

          <section aria-live="polite" className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Timeline</h2>
                <p className="text-sm text-muted-foreground">
                  Click the status circle to move a task forward.
                </p>
              </div>
            </div>
            {sortedTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed px-6 py-16 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold">Nothing scheduled yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with the one task that would make this day meaningful.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={updateStatus}
                        onDelete={(task) => setToDelete(task)}
                        onMoveNext={moveTaskToNextDay}
                        onEdit={(task) => setEditing(task)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        <Clock3 className="h-4 w-4 shrink-0" />
        <span>
          Time blocks are guidance, not a contract. Keep the list short enough
          to finish.
        </span>
      </footer>

      <Dialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold">{toDelete?.title}</span> from your
              planner. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!toDelete) return;
                setToDelete(null);
                await deleteTask(toDelete);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditTaskDialog
        task={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onUpdated={updateTask}
      />
    </div>
  );
}
