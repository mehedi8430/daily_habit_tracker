ALTER TABLE public.habit_topics
  DROP COLUMN IF EXISTS start_time,
  DROP COLUMN IF EXISTS end_time,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS target_date DATE;