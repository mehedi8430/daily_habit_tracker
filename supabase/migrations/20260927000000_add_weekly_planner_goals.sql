CREATE TABLE IF NOT EXISTS public.weekly_planner_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_planner_goals_user_weekday
  ON public.weekly_planner_goals(user_id, weekday);

ALTER TABLE public.weekly_planner_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly planner goals"
  ON public.weekly_planner_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly planner goals"
  ON public.weekly_planner_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly planner goals"
  ON public.weekly_planner_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly planner goals"
  ON public.weekly_planner_goals FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.weekly_planner_goal_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.weekly_planner_goals(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (goal_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_planner_goal_occurrences_user_date
  ON public.weekly_planner_goal_occurrences(user_id, occurrence_date);

ALTER TABLE public.weekly_planner_goal_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly planner goal occurrences"
  ON public.weekly_planner_goal_occurrences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly planner goal occurrences"
  ON public.weekly_planner_goal_occurrences FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.weekly_planner_goals goal
      WHERE goal.id = goal_id AND goal.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own weekly planner goal occurrences"
  ON public.weekly_planner_goal_occurrences FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.weekly_planner_goals goal
      WHERE goal.id = goal_id AND goal.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.weekly_planner_goals goal
      WHERE goal.id = goal_id AND goal.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own weekly planner goal occurrences"
  ON public.weekly_planner_goal_occurrences FOR DELETE USING (auth.uid() = user_id);