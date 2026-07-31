-- Mi Viaje: MVP — viajes, eventos de itinerario y checklist de preparación
create table if not exists public.trips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  destination   text not null,
  start_date    date not null,
  end_date      date not null,
  status        text not null default 'planning', -- planning | upcoming | active | finished
  cover_emoji   text default '✈️',
  notes         text,
  created_at    timestamp with time zone default now(),
  updated_at    timestamp with time zone default now()
);

alter table public.trips enable row level security;

create policy "Users CRUD own trips"
  on public.trips for all
  using (auth.uid() = user_id);

create table if not exists public.trip_events (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid references public.trips on delete cascade not null,
  title         text not null,
  event_type    text not null default 'other', -- flight | hotel | activity | transport | other
  starts_at     timestamp with time zone not null,
  location      text,
  notes         text,
  created_at    timestamp with time zone default now()
);

alter table public.trip_events enable row level security;

create policy "Users CRUD own trip_events"
  on public.trip_events for all
  using (auth.uid() = (select user_id from public.trips where id = trip_id));

create table if not exists public.trip_checklist_items (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid references public.trips on delete cascade not null,
  label         text not null,
  is_done       boolean default false,
  category      text default 'general', -- documentos | equipaje | general
  created_at    timestamp with time zone default now()
);

alter table public.trip_checklist_items enable row level security;

create policy "Users CRUD own trip_checklist_items"
  on public.trip_checklist_items for all
  using (auth.uid() = (select user_id from public.trips where id = trip_id));

create index if not exists trip_events_trip_id_idx on public.trip_events(trip_id);
create index if not exists trip_checklist_items_trip_id_idx on public.trip_checklist_items(trip_id);
