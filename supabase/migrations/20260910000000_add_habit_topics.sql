ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS goal TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.habit_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'done', 'skipped')),
  start_time TIME,
  end_time TIME,
  details TEXT NOT NULL DEFAULT '',
  resources TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habit_topics_habit_order
  ON public.habit_topics(habit_id, sort_order);

ALTER TABLE public.habit_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit topics"
  ON public.habit_topics FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habit topics"
  ON public.habit_topics FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habit topics"
  ON public.habit_topics FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habit topics"
  ON public.habit_topics FOR DELETE USING (auth.uid() = user_id);