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