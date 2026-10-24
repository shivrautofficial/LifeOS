-- ==============================================================================
-- LifeOS — Complete Production PostgreSQL Database Schema & Realtime Setup
-- Execute this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- Includes: User Profiles, Relational Domain Tables, Row Level Security (RLS),
-- Realtime Subscriptions, Indexes, Cascades & Automated Profile Provisioning
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. User Profiles Table (Primary Identity & Preferences)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    phone TEXT,
    email TEXT,
    profession TEXT DEFAULT 'engineer',
    role_title TEXT DEFAULT 'Software Engineer',
    timezone TEXT DEFAULT 'UTC',
    locale TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'dark',
    preferences JSONB DEFAULT '{"notifications": true, "soundFx": true, "weekStartsOn": "monday"}'::jsonb,
    onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- 2. Tasks Table (Deliverables & Kanban Pipeline)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    due_date TEXT,
    completed BOOLEAN DEFAULT FALSE,
    category TEXT DEFAULT 'work',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- 3. Habits Table (Consistency, Streaks & Daily Check-Ins)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.habits (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',
    streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    color TEXT DEFAULT 'indigo',
    is_active BOOLEAN DEFAULT TRUE,
    done BOOLEAN DEFAULT FALSE,
    history JSONB DEFAULT '[]'::jsonb,
    completions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- 4. Goals Table (Strategic OKRs & Milestones)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Personal',
    target_date TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused', 'cancelled')),
    milestones JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- 5. Projects Table (Initiatives, Roadmaps & Delivery Sprints)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    deadline TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- 6. Calendar Events Table (Focus Blocks & Daily Agenda)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    time TEXT,
    date TEXT DEFAULT 'Today',
    tag TEXT DEFAULT 'Deep Work',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- 7. Notes Table (Second Brain Knowledge Hub & Markdown)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    tags TEXT[] DEFAULT '{}',
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

<<<<<<< HEAD
-- 5. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    deadline TEXT DEFAULT 'Ongoing',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 6. Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    tag TEXT DEFAULT 'Deep Work',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Health Profile & Telemetry Table
CREATE TABLE IF NOT EXISTS public.health_data (
    id TEXT PRIMARY KEY, -- 'health_user' or user_id
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile JSONB DEFAULT '{}'::jsonb,
    daily_logs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 8. User State & Full Backup Sync Table
=======
-- ==============================================================================
-- 8. User Backups Table (Full State Snapshots & Disaster Recovery)
-- ==============================================================================
>>>>>>> 1279229204bce482713b020288d97b2cb5cb3db0
CREATE TABLE IF NOT EXISTS public.user_backups (
    id TEXT PRIMARY KEY, -- user_id as string
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile JSONB DEFAULT '{}'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    full_state JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- Performance Indexes (Accelerate Multi-User Queries & Realtime Filters)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits (user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS idx_user_backups_user_id ON public.user_backups (user_id);

-- ==============================================================================
-- Automated Profile Provisioning (Runs on Supabase Auth Sign-Up)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
  extracted_username TEXT;
BEGIN
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  extracted_username := LOWER(
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(COALESCE(NEW.email, 'user'), '@', 1) || '_' || substr(NEW.id::text, 1, 6)
    )
  );

  INSERT INTO public.profiles (
    id,
    display_name,
    username,
    avatar_url,
    email,
    phone,
    profession,
    role_title,
    onboarded
  )
  VALUES (
    NEW.id,
    extracted_name,
    extracted_username,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'profession', 'engineer'),
    COALESCE(NEW.raw_user_meta_data->>'role_title', 'Software Engineer'),
    COALESCE((NEW.raw_user_meta_data->>'onboarded')::boolean, FALSE)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    updated_at = TIMEZONE('utc', NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Row Level Security (RLS) Configuration — Strict Zero-Trust Ownership
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

<<<<<<< HEAD
-- Allow public / anon read & write policies for standalone and single-user apps
DROP POLICY IF EXISTS "Public access for tasks" ON public.tasks;
CREATE POLICY "Public access for tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for habits" ON public.habits;
CREATE POLICY "Public access for habits" ON public.habits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for goals" ON public.goals;
CREATE POLICY "Public access for goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for notes" ON public.notes;
CREATE POLICY "Public access for notes" ON public.notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for projects" ON public.projects;
CREATE POLICY "Public access for projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for calendar_events" ON public.calendar_events;
CREATE POLICY "Public access for calendar_events" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for health_data" ON public.health_data;
CREATE POLICY "Public access for health_data" ON public.health_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for user_backups" ON public.user_backups;
CREATE POLICY "Public access for user_backups" ON public.user_backups FOR ALL USING (true) WITH CHECK (true);
=======
-- 1. Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- 2. Tasks Policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own tasks" ON public.tasks;
CREATE POLICY "Users can create own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Habits Policies
DROP POLICY IF EXISTS "Users can view own habits" ON public.habits;
CREATE POLICY "Users can view own habits" ON public.habits
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own habits" ON public.habits;
CREATE POLICY "Users can create own habits" ON public.habits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own habits" ON public.habits;
CREATE POLICY "Users can update own habits" ON public.habits
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own habits" ON public.habits;
CREATE POLICY "Users can delete own habits" ON public.habits
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Goals Policies
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;
CREATE POLICY "Users can create own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
CREATE POLICY "Users can delete own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Projects Policies
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Calendar Events Policies
DROP POLICY IF EXISTS "Users can view own calendar events" ON public.calendar_events;
CREATE POLICY "Users can view own calendar events" ON public.calendar_events
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own calendar events" ON public.calendar_events;
CREATE POLICY "Users can create own calendar events" ON public.calendar_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own calendar events" ON public.calendar_events;
CREATE POLICY "Users can update own calendar events" ON public.calendar_events
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own calendar events" ON public.calendar_events;
CREATE POLICY "Users can delete own calendar events" ON public.calendar_events
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Notes Policies
DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
CREATE POLICY "Users can view own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own notes" ON public.notes;
CREATE POLICY "Users can create own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
CREATE POLICY "Users can update own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
CREATE POLICY "Users can delete own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- 8. User Backups Policies
DROP POLICY IF EXISTS "Users can view own backups" ON public.user_backups;
CREATE POLICY "Users can view own backups" ON public.user_backups
    FOR SELECT USING (auth.uid() = user_id OR auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can insert own backups" ON public.user_backups;
CREATE POLICY "Users can insert own backups" ON public.user_backups
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own backups" ON public.user_backups;
CREATE POLICY "Users can update own backups" ON public.user_backups
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid()::text = id)
    WITH CHECK (auth.uid() = user_id OR auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can delete own backups" ON public.user_backups;
CREATE POLICY "Users can delete own backups" ON public.user_backups
    FOR DELETE USING (auth.uid() = user_id OR auth.uid()::text = id);
>>>>>>> 1279229204bce482713b020288d97b2cb5cb3db0

-- ==============================================================================
-- Realtime Subscriptions Configuration
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
<<<<<<< HEAD
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks, public.habits, public.goals, public.notes, public.projects, public.calendar_events, public.health_data;
=======
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.profiles,
      public.tasks,
      public.habits,
      public.goals,
      public.projects,
      public.calendar_events,
      public.notes;
>>>>>>> 1279229204bce482713b020288d97b2cb5cb3db0
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
