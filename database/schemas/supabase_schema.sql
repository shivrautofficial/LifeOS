-- ==============================================================================
-- LifeOS — Supabase PostgreSQL Schema & Realtime Setup
-- Execute this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TEXT,
    completed BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Habits Table
CREATE TABLE IF NOT EXISTS public.habits (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',
    streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    color TEXT DEFAULT 'indigo',
    is_active BOOLEAN DEFAULT TRUE,
    completions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Personal',
    target_date TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused', 'cancelled')),
    milestones JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 5. User State & Full Backup Sync Table
CREATE TABLE IF NOT EXISTS public.user_backups (
    id TEXT PRIMARY KEY, -- can be user_id or device identifier (e.g. 'local_user')
    profile JSONB DEFAULT '{}'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    full_state JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

-- Allow public / anon read & write policies for standalone and single-user apps
-- (If you enable Supabase Auth later, replace these with auth.uid() = user_id)
DROP POLICY IF EXISTS "Public access for tasks" ON public.tasks;
CREATE POLICY "Public access for tasks" ON public.tasks
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for habits" ON public.habits;
CREATE POLICY "Public access for habits" ON public.habits
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for goals" ON public.goals;
CREATE POLICY "Public access for goals" ON public.goals
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for notes" ON public.notes;
CREATE POLICY "Public access for notes" ON public.notes
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for user_backups" ON public.user_backups;
CREATE POLICY "Public access for user_backups" ON public.user_backups
    FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- Realtime Subscriptions (Optional)
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks, public.habits, public.goals, public.notes;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Table might already be added or publication might differ in certain cloud configurations
  NULL;
END $$;
