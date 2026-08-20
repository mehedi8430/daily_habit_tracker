"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, GripVertical, Pencil, Trash2, Plus } from "lucide-react";
import { useHabitStore } from "@/lib/store";
import { getCategory } from "@/lib/types";
import { getMonthDays, toKey, formatFullDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HabitCheckbox } from "@/components/ui/habit-checkbox";
import { HabitForm } from "@/components/habit-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Habit } from "@/lib/types";
import { CompletionRow } from "@/app/actions";
import { toast } from "sonner";

function SortableRow({
  habit,
  days,
  completions,
  toggle,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  days: Date[];
  completions: Record<string, boolean>;
  toggle: (habitId: string, date: Date) => void;
  onEdit: (h: Habit) => void;
  onDelete: (h: Habit) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cat = getCategory(habit.category);
  const doneCount = days.filter(
    (d) => completions[`${habit.id}__${toKey(d)}`]
  ).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "contents",
        isDragging && "opacity-50"
      )}
    >
      <div className="sticky left-0 z-20 flex items-center gap-1 border-b border-r bg-card px-3 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-lg">{habit.emoji}</span>
        <span className="max-w-[140px] truncate font-medium" title={habit.name}>
          {habit.name}
        </span>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: cat.color }}
          title={cat.label}
        />
        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 data-[open=true]:opacity-100 [&:hover]:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(habit)}
            aria-label="Edit habit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => onDelete(habit)}
            aria-label="Delete habit"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {days.map((d) => {
        const checked = !!completions[`${habit.id}__${toKey(d)}`];
        const today = isToday(d);
        return (
          <Tooltip key={toKey(d)}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center justify-center border-b border-r py-2",
                  today && "bg-primary/5"
                )}
              >
                <HabitCheckbox
                  checked={checked}
                  onToggle={() => toggle(habit.id, d)}
                  color={cat.color}
                  today={today}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>{formatFullDate(d)}</TooltipContent>
          </Tooltip>
        );
      })}

      <div className="sticky right-0 z-20 flex items-center justify-center border-b border-l bg-card px-3 py-2 font-semibold text-sm shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.2)]">
        <span className={doneCount === days.length ? "text-primary" : ""}>
          {doneCount}
        </span>
        <span className="text-muted-foreground">/{days.length}</span>
      </div>
    </div>
  );
}

interface CalendarGridProps {
  initialHabits: Habit[];
  initialCompletions: CompletionRow[];
}

export function CalendarGrid({ initialHabits, initialCompletions }: CalendarGridProps) {
  const habits = useHabitStore((s) => s.habits);
  const completions = useHabitStore((s) => s.completions);
  const initialized = useHabitStore((s) => s.initialized);
  const initialize = useHabitStore((s) => s.initialize);
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion);
  const reorderHabits = useHabitStore((s) => s.reorderHabits);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);

  React.useEffect(() => {
    if (!initialized) {
      initialize(initialHabits, initialCompletions);
    }
  }, [initialized, initialize, initialHabits, initialCompletions]);

  const [cursor, setCursor] = React.useState<Date>(new Date());
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Habit | null>(null);
  const [toDelete, setToDelete] = React.useState<Habit | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const days = React.useMemo(
    () => getMonthDays(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const sortedHabits = React.useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sortedHabits.map((h) => h.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    reorderHabits(arrayMove(ids, oldIndex, newIndex));
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (h: Habit) => {
    setEditing(h);
    setFormOpen(true);
  };

  const monthLabel = format(cursor, "MMMM yyyy");

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor((c) => subMonths(c, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-[160px] text-center text-xl font-bold">
              {monthLabel}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCursor(new Date())}
              className="ml-1"
            >
              Today
            </Button>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Add Habit
          </Button>
        </div>

        {sortedHabits.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="overflow-auto rounded-lg border">
            <div
              className="grid min-w-max"
              style={{ gridTemplateColumns: `230px repeat(${days.length}, minmax(48px, 1fr)) 64px` }}
            >
              {/* Header row */}
              <div className="sticky left-0 z-30 flex items-center border-b border-r bg-card px-3 py-3 font-semibold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                Habit
              </div>
              {days.map((d) => {
                const todayCol = isToday(d);
                return (
                  <div
                    key={toKey(d)}
                    className={cn(
                      "flex flex-col items-center justify-center border-b border-r py-2 text-xs",
                      todayCol && "bg-primary/10"
                    )}
                  >
                    <span className="font-semibold uppercase text-muted-foreground">
                      {format(d, "EEE")}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm",
                        todayCol && "bg-primary font-bold text-primary-foreground"
                      )}
                    >
                      {format(d, "d")}
                    </span>
                  </div>
                );
              })}
              <div className="sticky right-0 z-30 flex items-center justify-center border-b border-l bg-card py-3 font-semibold shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.2)]">
                ✔
              </div>

              {/* Habit rows */}
              <div className="contents group">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedHabits.map((h) => h.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedHabits.map((h) => (
                      <SortableRow
                        key={h.id}
                        habit={h}
                        days={days}
                        completions={completions}
                        toggle={toggleCompletion}
                        onEdit={openEdit}
                        onDelete={setToDelete}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
        )}
      </div>

      <HabitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        habit={editing}
      />

      <Dialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete habit?</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold">{toDelete?.name}</span> and all of
              its completion history. This action cannot be undone.
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
                try {
                  await deleteHabit(toDelete.id);
                  setToDelete(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to delete habit");
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
      <div className="mb-4 text-6xl">📋</div>
      <h3 className="text-lg font-semibold">No habits yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Start building a better you. Add your first habit and begin tracking
        your daily progress.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" /> Add your first habit
      </Button>
    </div>
  );
}
