-- Satranç Akademisi (Chess Academy) Supabase PostgreSQL Schema & Row Level Security
-- Synchronizes Web (Vercel) and macOS (Tauri 2) user accounts, lessons, openings, puzzles, and games.

create extension if not exists "uuid-ossp";

-- 1. profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Öğrenci',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. user_settings
create table if not exists public.user_settings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  locale text not null default 'tr',
  coach_level text not null default 'beginner',
  board_theme text not null default 'emerald',
  sound_enabled boolean not null default true,
  show_coordinates boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. lessons (Reference Catalog)
create table if not exists public.lessons (
  id text primary key,
  module_id text not null,
  order_index integer not null,
  title_tr text not null,
  difficulty text not null default 'Başlangıç',
  created_at timestamptz not null default now()
);

alter table public.lessons enable row level security;

create policy "Lessons catalog is readable by everyone"
  on public.lessons for select
  using (true);

-- 4. lesson_progress
create table if not exists public.lesson_progress (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed boolean not null default false,
  interactive_passed boolean not null default false,
  quiz_passed boolean not null default false,
  attempts integer not null default 1,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.lesson_progress enable row level security;

create policy "Users can manage own lesson_progress"
  on public.lesson_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. opening_progress
create table if not exists public.opening_progress (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  opening_id text not null,
  practiced_count integer not null default 0,
  correct_runs integer not null default 0,
  mastery_score integer not null default 0,
  missed_step_indices jsonb not null default '[]'::jsonb,
  next_review_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.opening_progress enable row level security;

create policy "Users can manage own opening_progress"
  on public.opening_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. games
create table if not exists public.games (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date timestamptz not null default now(),
  player_color text not null check (player_color in ('w', 'b')),
  difficulty_level integer not null default 3,
  mode text not null default 'learning',
  result text not null,
  pgn text not null default '',
  final_fen text not null,
  inaccuracies integer not null default 0,
  mistakes integer not null default 0,
  blunders integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "Users can manage own games"
  on public.games for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. game_moves
create table if not exists public.game_moves (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  move_number integer not null,
  move_san text not null,
  move_uci text not null,
  before_fen text not null,
  after_fen text not null,
  classification text not null,
  explanation_tr text not null,
  created_at timestamptz not null default now()
);

alter table public.game_moves enable row level security;

create policy "Users can manage own game_moves"
  on public.game_moves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8. game_analyses
create table if not exists public.game_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  summary_json jsonb not null default '{}'::jsonb,
  turning_point_move integer,
  updated_at timestamptz not null default now()
);

alter table public.game_analyses enable row level security;

create policy "Users can manage own game_analyses"
  on public.game_analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 9. puzzle_attempts
create table if not exists public.puzzle_attempts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_id text not null,
  theme text not null,
  solved boolean not null default false,
  hints_used integer not null default 0,
  attempts integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.puzzle_attempts enable row level security;

create policy "Users can manage own puzzle_attempts"
  on public.puzzle_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 10. study_sessions
create table if not exists public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  minutes_spent integer not null default 0,
  activity_type text not null default 'general',
  updated_at timestamptz not null default now()
);

alter table public.study_sessions enable row level security;

create policy "Users can manage own study_sessions"
  on public.study_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 11. user_recommendations
create table if not exists public.user_recommendations (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title_tr text not null,
  message_tr text not null,
  action_route text not null,
  priority text not null default 'medium',
  updated_at timestamptz not null default now()
);

alter table public.user_recommendations enable row level security;

create policy "Users can manage own user_recommendations"
  on public.user_recommendations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
