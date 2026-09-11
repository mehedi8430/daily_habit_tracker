# Design: Move habit notes from `completions` to `habits`

**Date:** 2026-09-11
**Status:** Approved (brainstorming)

## Problem

Habit notes are currently stored on the `completions` table (`completions.notes`),
keyed per `(habit_id, date)`. A note is conceptually a property of the habit
itself — there is exactly one note per habit. Storing it per-completion-date is
the wrong architecture and has led to convoluted logic in `toggleCompletion` /
`setCompletion` that preserves completion rows just to hold notes.

## Goal

Move the single per-habit note onto the `habits` table, expose it through the
existing habits data flow (server actions, zustand store, `Habit` type), and
simplify completion logic that existed solely to preserve notes.

## Schema changes

New migration: `supabase/migrations/20260911010000_move_notes_to_habits.sql`

1. `ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;`
2. Backfill the latest non-empty note per habit from `completions`:

   ```sql
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
   ```

3. `ALTER TABLE public.completions DROP COLUMN IF EXISTS notes;`

Backfill collapses per-date notes into a single latest note per habit. This is
intentional and accepted; the migration is destructive to older per-date notes.

## Type changes (`src/lib/types.ts`)

- `Habit` gains `notes: string | null`.
- All habit construction sites set `notes`:
  - `getInitialData` habit mapping in `habit.actions.ts`
  - `addHabit` action result in `habit.actions.ts`
  - optimistic temp habit in `store.ts`
- `CompletionRow` (in `habit.actions.ts`) drops the `notes` field.

## Server actions (`src/app/actions/habit.actions.ts`)

- `getInitialData`:
  - habits map includes `notes: (h.notes as string) ?? null`.
  - completions mapping no longer reads `notes`.
- `addHabit`: constructed habit object includes `notes: null`.
- Refactor `saveNotes`:
  - Signature: `saveNotes(habitId: string, notes: string | null)`.
  - `UPDATE public.habits SET notes = <notes> WHERE id = habitId AND user_id = user.id`.
  - No completions reads/inserts.
- Simplify `toggleCompletion` and `setCompletion`: remove the `existing.notes`
  preservation branches. When unchecking, always delete the completion row; no
  completed-with-notes edge cases remain.

## Store (`src/stores/store.ts`)

- Remove the `notes: Record<string, string | null>` map state, its initialization,
  and its cleanup inside `deleteHabit`.
- Remove `getNotes` and the date-keyed `saveNotes(habitId, date, notes)`.
- Add `saveNotes(habitId: string, notes: string | null)`:
  optimistic update of the matching habit in the `habits` array, rollback on
  error, throw on error (matches existing store patterns).
- `initialize` signature is unchanged; notes arrive inside `habits`.

Represent notes directly on the `Habit` object in the store (single source of
truth). A parallel `habitNotes` map was considered and rejected as redundant.

## NotesDialog (`src/app/_components/notes-dialog.tsx`)

- Props become `{ open, onOpenChange, habit }` where `habit: Habit`.
- Drop the `date` prop and `getNotes` store usage.
- Initial draft read from `habit.notes` at mount.
- Remount pattern (content rendered only while `open`, keyed by habit id) as in
  `habit-form.tsx`, replacing the `useEffect`-based sync. This also resolves the
  pre-existing `react-hooks/set-state-in-effect` lint error in this file.
- Copy changes: "Add notes..." and "No notes yet" (drop "for this day");
  remove unused `formatFullDate` import (fixes pre-existing lint warning).
- Keep the "Manage milestones" link from the previous change.

## CalendarGrid (`src/app/_components/calendar-grid.tsx`)

- `notesDialog` state becomes `{ habit: Habit } | null`.
- `onOpenNotes` callback passes the habit only (no date).
- `<NotesDialog habit={habit} />`; remove `habitId`/`habitName`/`date` props.

## SortableRow (`src/app/_components/sortable-row.tsx`)

- `onOpenNotes: (h: Habit) => void`.
- Title `<button>` calls `onOpenNotes(habit)`.

## Out of scope

- Planner task notes (`planer.actions.ts`, task-row, edit-task-dialog,
  new-task-form) are unrelated and unchanged.
- No changes to `src/lib/planner-types.ts`.

## Verification

- `npm run build` — Next.js build (includes TypeScript).
- `npm run lint` — eslint; only the pre-existing `set-state-in-effect` error in
  `edit-task-dialog.tsx` is expected to remain.