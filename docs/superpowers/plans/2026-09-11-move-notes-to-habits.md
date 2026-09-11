# Move Habit Notes to Habits Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the single per-habit note from the `completions` table to the `habits` table, flowing through server actions, the zustand store, and the notes dialog.

**Architecture:** Habit notes become a column on `habits` and a field on the `Habit` type. `saveNotes` becomes an `UPDATE habits` action; the store optimistically mutates the habit object in the `habits` array. The notes dialog reads the note from the habit and uses a keyed remount pattern instead of an effect.

**Tech Stack:** Next.js 16 (App Router, server actions), Supabase + RLS, zustand, Tailwind, date-fns.

**Spec:** `docs/superpowers/specs/2026-09-11-move-notes-to-habits-design.md`

## Global Constraints

- `npm run build` (includes TypeScript) must pass at the end of Task 5 and in Task 1.
- Intermediate tasks (2–4) intentionally leave type errors in files not yet converted — each task states exactly which files still error and which task resolves them. Do NOT fix files outside the task's scope.
- `npm run lint` must produce no NEW errors beyond the pre-existing `react-hooks/set-state-in-effect` error in `src/app/planner/_components/edit-task-dialog.tsx:38`. Task 4 removes that error from `notes-dialog.tsx`.
- Optimistic-update store methods roll back state and `throw new Error(result.error)` on failure (existing store pattern).
- No comments in code. Follow existing formatting (single quotes, trailing commas).
- The old per-date notes are intentionally collapsed to one latest note per habit; migration is destructive to `completions.notes`.
- Planner task notes are out of scope — do not touch `src/lib/planner-types.ts`, `planner.actions.ts`, `task-row.tsx`, `edit-task-dialog.tsx`, or `new-task-form.tsx`.

---

### Task 1: Migration, `Habit.notes` type, and habit construction sites

**Files:**
- Create: `supabase/migrations/20260911010000_move_notes_to_habits.sql`
- Modify: `src/lib/types.ts:1-9`
- Modify: `src/app/actions/habit.actions.ts:49-63` (getInitialData habits mapping)
- Modify: `src/app/actions/habit.actions.ts:115-123` (addHabit result)
- Modify: `src/stores/store.ts:56-79` (addHabit temp habit)

**Interfaces:**
- Consumes: existing `Habit` shape.
- Produces: `Habit` with `notes: string | null`, set at every construction site. `CompletionRow` is untouched in this task.

- [ ] **Step 1: Create the migration file**

`supabase/migrations/20260911010000_move_notes_to_habits.sql`:

```sql
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

WITH latest_notes AS (
  SELECT DISTINCT ON (habit_id) habit_id, notes
  FROM public.completions
  WHERE notes IS NOT NULL AND notes <> ''
  ORDER BY habit_id, updated_at DESC
)
UPDATE public.habits AS h
SET notes = ln.notes
FROM latest_notes AS ln
WHERE h.id = ln.habit_id;

ALTER TABLE public.completions
  DROP COLUMN IF EXISTS notes;
```

- [ ] **Step 2: Add `notes` to the `Habit` interface**

`src/lib/types.ts:1-9`:

```ts
export interface Habit {
  id: string;
  name: string;
  goal: string;
  notes: string | null;
  emoji?: string;
  category: string;
  order: number;
  createdAt: string; // ISO date
}
```

- [ ] **Step 3: Map `notes` in `getInitialData` habits mapping**

`src/app/actions/habit.actions.ts:49-57` — add the `notes` line after `goal`:

```ts
habits: (habitsResult.data || []).map((h: Record<string, unknown>) => ({
  id: h.id as string,
  name: h.name as string,
  goal: (h.goal as string) ?? "",
  notes: (h.notes as string) ?? null,
  emoji: h.emoji as string,
  category: h.category as string,
  order: (h.sort_order as number) ?? 0,
  createdAt: h.created_at as string,
})),
```

- [ ] **Step 4: Set `notes: null` in the `addHabit` result**

`src/app/actions/habit.actions.ts:115-123` — add `notes: null` after `goal`:

```ts
habit: {
  id: created.id as string,
  name: created.name as string,
  goal: (created.goal as string) ?? "",
  notes: null,
  emoji: created.emoji as string,
  category: created.category as string,
  order: (created.sort_order as number) ?? 0,
  createdAt: created.created_at as string,
},
```

- [ ] **Step 5: Set `notes: null` in the store's optimistic temp habit**

`src/stores/store.ts:57-65`:

```ts
const newHabit: Habit = {
  id: tempId,
  name: data.name,
  goal: data.goal,
  notes: null,
  category: data.category,
  order: get().habits.length,
  createdAt: new Date().toISOString(),
};
```

- [ ] **Step 6: Verify the build is green**

Run: `npm run build`
Expected: `✓ Compiled successfully`, TypeScript finishes with no errors. Backfill SQL is not executed by the build; correctness is reviewed by eye.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260911010000_move_notes_to_habits.sql src/lib/types.ts src/app/actions/habit.actions.ts src/stores/store.ts
git commit -m "feat: add notes column to habits table and notes field on Habit type"
```

---

### Task 2: Server actions — completion cleanup and `saveNotes` refactor

**Files:**
- Modify: `src/app/actions/habit.actions.ts:8-13` (CompletionRow interface)
- Modify: `src/app/actions/habit.actions.ts:58-63` (getInitialData completions mapping)
- Modify: `src/app/actions/habit.actions.ts:209-277` (toggleCompletion)
- Modify: `src/app/actions/habit.actions.ts:279-350` (setCompletion)
- Modify: `src/app/actions/habit.actions.ts:352-401` (saveNotes)

**Interfaces:**
- Consumes: `Habit` with `notes` (Task 1).
- Produces: `CompletionRow` without `notes`; `saveNotes(habitId: string, notes: string | null)` returning `{ success: true } | { error: string }` — no more completions reads/inserts for notes.

- [ ] **Step 1: Drop `notes` from `CompletionRow`**

`src/app/actions/habit.actions.ts:8-13`:

```ts
export interface CompletionRow {
  habit_id: string;
  date: string;
  completed: boolean;
}
```

- [ ] **Step 2: Drop `notes` from the completions mapping**

`src/app/actions/habit.actions.ts:58-63`:

```ts
completions: (completionsResult.data || []).map(
  (c: Record<string, unknown>) => ({
    habit_id: c.habit_id as string,
    date: c.date as string,
    completed: c.completed as boolean,
  })
),
```

- [ ] **Step 3: Simplify `toggleCompletion`**

Replace the whole function body (`src/app/actions/habit.actions.ts:209-277`) with — no `existing.notes` branches remain:

```ts
export async function toggleCompletion(habitId: string, date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("completions")
    .select("id, completed")
    .eq("user_id", user.id)
    .eq("habit_id", habitId)
    .eq("date", date)
    .single();

  if (existing && existing.completed) {
    const { error } = await supabase
      .from("completions")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }
  } else if (existing) {
    const { error } = await supabase
      .from("completions")
      .update({ completed: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from("completions").insert({
      user_id: user.id,
      habit_id: habitId,
      date,
      completed: true,
    });

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}
```

- [ ] **Step 4: Simplify `setCompletion`**

Replace the whole function body (`src/app/actions/habit.actions.ts:279-350`) with — no `existing.notes` branches remain:

```ts
export async function setCompletion(
  habitId: string,
  date: string,
  completed: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("completions")
    .select("id, completed")
    .eq("user_id", user.id)
    .eq("habit_id", habitId)
    .eq("date", date)
    .single();

  if (!completed) {
    const { error } = await supabase
      .from("completions")
      .delete()
      .eq("user_id", user.id)
      .eq("habit_id", habitId)
      .eq("date", date);

    if (error) {
      return { error: error.message };
    }
  } else if (existing) {
    const { error } = await supabase
      .from("completions")
      .update({ completed: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from("completions").insert({
      user_id: user.id,
      habit_id: habitId,
      date,
      completed: true,
    });

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}
```

- [ ] **Step 5: Refactor `saveNotes` to update the habits table**

Replace the entire `saveNotes` function (`src/app/actions/habit.actions.ts:352-401`) with:

```ts
export async function saveNotes(habitId: string, notes: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("habits")
    .update({ notes })
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}
```

- [ ] **Step 6: Check the intermediate build**

Run: `npm run build`
Expected: TypeScript errors ONLY in `src/stores/store.ts` — `initialize` reads `c.notes` (removed from `CompletionRow`) and `saveNotes` calls the action with 3 args. These are resolved in Task 3.

- [ ] **Step 7: Commit**

```bash
git add src/app/actions/habit.actions.ts
git commit -m "feat: store habit notes on habits table via saveNotes action"
```

---

### Task 3: Update the zustand store

**Files:**
- Modify: `src/stores/store.ts`

**Interfaces:**
- Consumes: `actions.saveNotes(habitId, notes)` (Task 2); `Habit` with `notes` (Task 1).
- Produces: `saveNotes(habitId: string, notes: string | null): Promise<void>`; `getNotes` and the `notes` map are removed from the state.

- [ ] **Step 1: Update the `HabitState` interface**

`src/stores/store.ts:19-37`:

```ts
interface HabitState {
  habits: Habit[];
  completions: Record<string, boolean>;
  initialized: boolean;
  initialize: (habits: Habit[], completions: actions.CompletionRow[]) => void;
  addHabit: (data: { name: string; category: string; goal: string }) => Promise<void>;
  updateHabit: (
    id: string,
    data: { name: string; category: string; goal: string }
  ) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  reorderHabits: (ids: string[]) => Promise<void>;
  toggleCompletion: (habitId: string, date: Date) => Promise<void>;
  setCompletion: (habitId: string, date: Date, completed: boolean) => Promise<void>;
  saveNotes: (habitId: string, notes: string | null) => Promise<void>;
  isCompleted: (habitId: string, date: Date) => boolean;
}
```

- [ ] **Step 2: Remove `notes: {}` from the initial state**

`src/stores/store.ts:42`: delete the `notes: {},` line.

- [ ] **Step 3: Rewrite `initialize` without the notes map**

Replace `initialize` (`src/stores/store.ts:45-54`) with:

```ts
initialize: (habits, completions) => {
  const completionsMap: Record<string, boolean> = {};
  for (const c of completions) {
    const key = `${c.habit_id}__${c.date}`;
    completionsMap[key] = c.completed;
  }
  set({ habits, completions: completionsMap, initialized: true });
},
```

- [ ] **Step 4: Simplify `deleteHabit`**

Replace `deleteHabit` (`src/stores/store.ts:93-119`) with:

```ts
deleteHabit: async (id) => {
  const prev = get().habits;
  const prevCompletions = get().completions;
  set((state) => {
    const completions = { ...state.completions };
    for (const key of Object.keys(completions)) {
      if (key.startsWith(`${id}__`)) {
        delete completions[key];
      }
    }
    return {
      habits: state.habits
        .filter((h) => h.id !== id)
        .map((h, i) => ({ ...h, order: i })),
      completions,
    };
  });
  const result = await actions.deleteHabit(id);
  if ("error" in result && result.error) {
    set({ habits: prev, completions: prevCompletions });
    throw new Error(result.error as string);
  }
},
```

- [ ] **Step 5: Replace `saveNotes` and remove `getNotes`**

Replace `saveNotes` + `getNotes` (`src/stores/store.ts:179-197`) with the single new `saveNotes`:

```ts
saveNotes: async (habitId, notes) => {
  const prev = get().habits.find((h) => h.id === habitId);
  set((state) => ({
    habits: state.habits.map((h) =>
      h.id === habitId ? { ...h, notes } : h
    ),
  }));
  const result = await actions.saveNotes(habitId, notes);
  if ("error" in result && result.error) {
    if (prev) {
      set((state) => ({
        habits: state.habits.map((h) =>
          h.id === habitId ? prev : h
        ),
      }));
    }
    throw new Error(result.error as string);
  }
},
```

- [ ] **Step 6: Check the intermediate build**

Run: `npm run build`
Expected: TypeScript errors ONLY in the UI files — `notes-dialog.tsx` (calls `getNotes` / date-keyed `saveNotes`) and `calendar-grid.tsx` (states a `date` in the notes dialog state and passes it). Both resolved in Tasks 4–5.

- [ ] **Step 7: Commit**

```bash
git add src/stores/store.ts
git commit -m "feat: store habit notes on habit object in zustand store"
```

---

### Task 4: Update the notes dialog

**Files:**
- Modify: `src/app/_components/notes-dialog.tsx`

**Interfaces:**
- Consumes: `useHabitStore((s) => s.saveNotes)` with signature `(habitId, notes)` (Task 3); `Habit` with `notes` (Task 1).
- Produces: `NotesDialog({ open: boolean, onOpenChange: (open: boolean) => void, habit: Habit | null })`. Callers pass the habit object; `date` and `getNotes` are gone.

- [ ] **Step 1: Rewrite `notes-dialog.tsx`**

Replace the entire file with:

```tsx
"use client";

import * as React from "react";
import { useHabitStore } from "@/stores/store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Habit } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
}

function NotesFields({
  habit,
  close,
}: {
  habit: Habit;
  close: () => void;
}) {
  const saveNotes = useHabitStore((s) => s.saveNotes);

  const [draft, setDraft] = React.useState(habit.notes ?? "");
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const handleSave = async () => {
    const trimmed = draft.trim();
    setSaving(true);
    try {
      await saveNotes(habit.id, trimmed || null);
      setDraft(trimmed);
      setEditing(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save notes"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(habit.notes ?? "");
    setEditing(false);
  };

  return (
    <>
      <div className="max-h-70 min-h-45 overflow-y-auto rounded-md bg-background px-3 py-2 text-sm">
        {editing ? (
          <textarea
            className="min-h-70 max-h-80 w-full resize-none overflow-y-auto rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Add notes..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        ) : draft ? (
          <p className="whitespace-pre-wrap">{draft}</p>
        ) : (
          <p className="text-muted-foreground italic">No notes yet.</p>
        )}
      </div>
      <DialogFooter>
        {editing ? (
          <>
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
            <Button onClick={() => setEditing(true)}>
              {draft ? "Edit" : "Add Notes"}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}

export function NotesDialog({
  open,
  onOpenChange,
  habit,
}: NotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Notes</DialogTitle>
          <DialogDescription>
            {habit?.name}
            {habit && (
              <Link
                href={`/habits/${habit.id}/milestones`}
                className="ml-2 text-xs underline underline-offset-2 hover:text-foreground"
              >
                Manage milestones
              </Link>
            )}
          </DialogDescription>
        </DialogHeader>
        {open && habit && (
          <NotesFields
            key={`${open}-${habit.id}`}
            habit={habit}
            close={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify lint on this file**

Run: `npx eslint src/app/_components/notes-dialog.tsx`
Expected: no output (clean). The pre-existing `react-hooks/set-state-in-effect` error and the `formatFullDate` unused-import warning are gone (effect and import removed).

- [ ] **Step 3: Check the intermediate build**

Run: `npm run build`
Expected: TypeScript errors ONLY in `src/app/_components/calendar-grid.tsx` (passes old props to `NotesDialog` and holds a date in its notes state). Resolved in Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/app/_components/notes-dialog.tsx
git commit -m "feat: read habit notes from the habit object in notes dialog"
```

---

### Task 5: Update the calendar grid and sortable row

**Files:**
- Modify: `src/app/_components/calendar-grid.tsx`
- Modify: `src/app/_components/sortable-row.tsx`

**Interfaces:**
- Consumes: `NotesDialog({ open, onOpenChange, habit: Habit | null })` (Task 4).
- Produces: `SortableRow` prop `onOpenNotes: (h: Habit) => void`.

- [ ] **Step 1: Update `sortable-row.tsx`**

`src/app/_components/sortable-row.tsx:35`: change the prop type:

```ts
onOpenNotes: (h: Habit) => void;
```

`src/app/_components/sortable-row.tsx:80`: change the title button click:

```tsx
<button
  type="button"
  onClick={() => onOpenNotes(habit)}
  className="max-w-60 truncate text-left font-medium hover:underline"
  title="Open notes"
>
  {habit.name}
</button>
```

- [ ] **Step 2: Update the notes dialog state in `calendar-grid.tsx`**

`src/app/_components/calendar-grid.tsx:68-71`:

```ts
const [notesDialog, setNotesDialog] = React.useState<{
  habit: Habit;
} | null>(null);
```

- [ ] **Step 3: Update the `onOpenNotes` callback**

`src/app/_components/calendar-grid.tsx:225-227`:

```tsx
onOpenNotes={(habit) => setNotesDialog({ habit })}
```

- [ ] **Step 4: Update the `<NotesDialog>` render**

`src/app/_components/calendar-grid.tsx:278-284`:

```tsx
<NotesDialog
  open={!!notesDialog}
  onOpenChange={(o) => !o && setNotesDialog(null)}
  habit={notesDialog?.habit ?? null}
/>
```

- [ ] **Step 5: Verify the build is green**

Run: `npm run build`
Expected: `✓ Compiled successfully`, TypeScript finishes with no errors anywhere.

- [ ] **Step 6: Verify lint**

Run: `npm run lint`
Expected: only the pre-existing error in `src/app/planner/_components/edit-task-dialog.tsx:38` remains; nothing in the changed files.

- [ ] **Step 7: Confirm old note references are gone**

Run: `git grep -n "getNotes\|notesMap" -- src/`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/app/_components/calendar-grid.tsx src/app/_components/sortable-row.tsx
git commit -m "feat: open habit notes dialog from title click"
```

---

## Final Verification

- [ ] Run: `npm run build` — must pass with TypeScript clean.
- [ ] Run: `npm run lint` — only `src/app/planner/_components/edit-task-dialog.tsx:38` remains.
- [ ] Run: `git grep -n "getNotes\|notesMap" -- src/` — no output.