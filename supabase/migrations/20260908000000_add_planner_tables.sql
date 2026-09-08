-- habit_topics table
CREATE TABLE IF NOT EXISTS public.habit_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- daily_tasks table
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.habit_topics(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','skipped')),
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for habit_topics
CREATE INDEX IF NOT EXISTS idx_habit_topics_user_id ON public.habit_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_topics_habit_id ON public.habit_topics(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_topics_user_active ON public.habit_topics(user_id, is_active);

-- Indexes for daily_tasks
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_id ON public.daily_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON public.daily_tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_habit_id ON public.daily_tasks(habit_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_topic_id ON public.daily_tasks(topic_id);

-- Enable RLS
ALTER TABLE public.habit_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for habit_topics
CREATE POLICY "Users can view own topics"
  ON public.habit_topics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics"
  ON public.habit_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
  ON public.habit_topics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics"
  ON public.habit_topics FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for daily_tasks
CREATE POLICY "Users can view own tasks"
  ON public.daily_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON public.daily_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.daily_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.daily_tasks FOR DELETE
  USING (auth.uid() = user_id);
