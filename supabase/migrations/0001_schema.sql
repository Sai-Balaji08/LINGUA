-- LINGUA schema. Run migrations in order: 0001_schema -> 0002_functions -> 0003_rls, then seed.sql.
-- Hierarchy: languages -> courses -> levels -> units -> lessons -> exercises -> exercise_options

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type public.user_role as enum ('learner', 'admin');

create type public.exercise_type as enum (
  'multiple_choice', 'translation', 'fill_blank', 'word_arrangement', 'listening',
  'reading', 'matching', 'grammar', 'writing', 'speaking'
);

create type public.skill as enum ('reading', 'listening', 'writing', 'speaking', 'grammar', 'vocabulary');

-- ---------- helper: updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- public learning content ----------
create table public.languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- BCP-47 short code, e.g. 'es'
  name text not null,                        -- English name
  native_name text not null,                 -- Name in the language itself
  greeting text not null default 'Hello',    -- shown in the language showcase
  speech_locale text not null default 'en-US', -- used for browser speech synthesis/recognition
  published boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references public.languages(id) on delete cascade,
  title text not null,
  description text not null default '',
  taught_in text not null default 'en',      -- language the course is explained in
  published boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  code text not null,                        -- e.g. 'A1'
  title text not null,
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, code)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id) on delete cascade,
  title text not null,
  description text not null default '',
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  title text not null,
  description text not null default '',
  grammar_note text,                         -- short explanation shown before the exercises
  estimated_minutes int not null default 5 check (estimated_minutes between 1 and 60),
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  type public.exercise_type not null,
  skill public.skill not null,
  prompt text not null,
  instructions text not null default '',
  explanation text not null default '',
  audio_url text,                            -- optional audio reference (e.g. Supabase Storage URL)
  content jsonb not null default '{}'::jsonb, -- type-specific data, see src/lib/exercises/types.ts
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercise_options (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  text text not null,
  match_text text,                           -- only for 'matching': the partner of `text`
  is_correct boolean not null default false, -- only for choice-based exercises
  position int not null default 0
);

-- ---------- vocabulary ----------
-- owner_id IS NULL  -> curated word managed by admins.
-- owner_id = user   -> private word a learner added.
create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references public.languages(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  term text not null,
  translation text not null,
  transliteration text,
  part_of_speech text,
  definition text,
  example_sentence text,
  example_translation text,
  audio_url text,
  created_at timestamptz not null default now()
);
create unique index vocabulary_curated_unique on public.vocabulary (language_id, term, translation) where owner_id is null;
create unique index vocabulary_owner_unique on public.vocabulary (owner_id, language_id, term, translation) where owner_id is not null;

create table public.lesson_vocabulary (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  primary key (lesson_id, vocabulary_id)
);

-- ---------- users ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.user_role not null default 'learner',
  native_language text,                       -- language code, e.g. 'en'
  target_language_id uuid references public.languages(id) on delete set null,
  proficiency text check (proficiency in ('beginner', 'elementary', 'intermediate', 'advanced')),
  objective text check (objective in ('travel', 'work', 'study', 'culture', 'family', 'fun')),
  daily_goal_minutes int not null default 10 check (daily_goal_minutes between 5 and 120),
  learning_style text check (learning_style in ('visual', 'listening', 'reading', 'speaking', 'mixed')),
  onboarded boolean not null default false,
  notify_daily_reminder boolean not null default true,
  notify_weekly_summary boolean not null default true,
  allow_ai_feedback boolean not null default true, -- privacy: may text be sent to the AI provider
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_languages (
  user_id uuid not null references auth.users(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  proficiency text,
  started_at timestamptz not null default now(),
  primary key (user_id, language_id)
);

-- ---------- learning records (private) ----------
create table public.lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score numeric(5,2) not null check (score between 0 and 100),
  correct_count int not null default 0,
  total_count int not null default 0,
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  xp_earned int not null default 0 check (xp_earned >= 0), -- engagement stat, NOT a proficiency measure
  passed boolean not null default false,
  completed_at timestamptz not null default now()
);

-- One row per answered exercise. This is the source for skill analytics.
create table public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.lesson_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  skill public.skill not null,
  score numeric(4,3) not null check (score between 0 and 1),
  is_correct boolean not null,
  measured boolean not null default true, -- false when the skill could not be assessed (e.g. self-rated speaking)
  response jsonb not null default '{}'::jsonb,
  time_ms int not null default 0 check (time_ms >= 0),
  created_at timestamptz not null default now()
);

create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  best_score numeric(5,2) not null default 0,
  attempts int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity text not null check (activity in ('lesson', 'review', 'conversation')),
  ref_id uuid,
  duration_seconds int not null default 0 check (duration_seconds >= 0 and duration_seconds <= 14400),
  started_at timestamptz not null default now()
);

-- ---------- vocabulary tracking + spaced repetition ----------
create table public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary(id) on delete cascade,
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  interval_days int not null default 0 check (interval_days >= 0),
  repetitions int not null default 0,
  lapses int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, vocabulary_id)
);

create table public.vocabulary_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_vocabulary_id uuid not null references public.user_vocabulary(id) on delete cascade,
  rating smallint not null check (rating between 0 and 3), -- 0 again, 1 hard, 2 good, 3 easy
  interval_before int not null,
  interval_after int not null,
  ease_after numeric(4,2) not null,
  time_ms int not null default 0,
  reviewed_at timestamptz not null default now()
);

-- ---------- achievements ----------
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon text not null default 'award'
);

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------- AI ----------
create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  requests int not null default 0,
  primary key (user_id, day)
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  language_id uuid references public.languages(id) on delete set null,
  scenario text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  messages jsonb not null default '[]'::jsonb,
  summary jsonb,
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ---------- indexes ----------
create index on public.courses (language_id);
create index on public.levels (course_id);
create index on public.units (level_id);
create index on public.lessons (unit_id);
create index on public.exercises (lesson_id);
create index on public.exercise_options (exercise_id);
create index on public.vocabulary (language_id);
create index on public.vocabulary (owner_id);
create index on public.lesson_vocabulary (vocabulary_id);
create index on public.lesson_attempts (user_id, completed_at desc);
create index on public.lesson_attempts (lesson_id);
create index on public.exercise_attempts (user_id, created_at desc);
create index on public.exercise_attempts (attempt_id);
create index on public.user_progress (user_id);
create index on public.learning_sessions (user_id, started_at desc);
create index on public.user_vocabulary (user_id, due_at);
create index on public.vocabulary_reviews (user_id, reviewed_at desc);
create index on public.ai_conversations (user_id, started_at desc);

-- ---------- updated_at triggers ----------
create trigger languages_updated before update on public.languages for each row execute function public.set_updated_at();
create trigger courses_updated before update on public.courses for each row execute function public.set_updated_at();
create trigger levels_updated before update on public.levels for each row execute function public.set_updated_at();
create trigger units_updated before update on public.units for each row execute function public.set_updated_at();
create trigger lessons_updated before update on public.lessons for each row execute function public.set_updated_at();
create trigger exercises_updated before update on public.exercises for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
