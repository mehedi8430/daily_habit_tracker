CREATE TABLE IF NOT EXISTS public.daily_planner_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done', 'skipped')),
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_planner_tasks_user_date
  ON public.daily_planner_tasks(user_id, date);

ALTER TABLE public.daily_planner_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily planner tasks"
  ON public.daily_planner_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily planner tasks"
  ON public.daily_planner_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily planner tasks"
  ON public.daily_planner_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily planner tasks"
  ON public.daily_planner_tasks FOR DELETE USING (auth.uid() = user_id);