-- Tabla para las tareas del TasksContext (gamificadas, distintas de las del calendario)
create table if not exists public.personal_tasks (
  id          text primary key,           -- id numérico del contexto como texto
  user_id     uuid references auth.users not null,
  text        text not null,
  completed   boolean default false,
  created_at  text not null,
  completed_at text,
  category    text default 'personal',
  priority    text default 'medium',
  due_date    text,
  subtasks    jsonb default '[]',
  updated_at  timestamp with time zone default now()
);

alter table public.personal_tasks enable row level security;

create policy "Users CRUD own personal_tasks"
  on public.personal_tasks for all
  using (auth.uid() = user_id);

-- Tabla para gamificación (puntos y racha)
create table if not exists public.user_gamification (
  user_id       uuid references auth.users primary key,
  magic_points  integer default 0,
  current_streak integer default 0,
  updated_at    timestamp with time zone default now()
);

alter table public.user_gamification enable row level security;

create policy "Users CRUD own gamification"
  on public.user_gamification for all
  using (auth.uid() = user_id);
