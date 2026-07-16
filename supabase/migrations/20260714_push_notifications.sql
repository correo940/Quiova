-- Web Push: suscripciones por dispositivo/navegador y registro de envíos para
-- evitar duplicados. Permite mandar avisos (medicación, ITV, seguros, etc.)
-- a PWAs instaladas (incluido iPhone vía Safari) aunque la app esté cerrada.

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamp with time zone default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users CRUD own push_subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- Idempotencia: cada (user_id, notif_key, sent_date) se manda como mucho una vez.
create table if not exists public.push_notification_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  notif_key   text not null,
  sent_date   date not null,
  created_at  timestamp with time zone default now(),
  unique (user_id, notif_key, sent_date)
);

alter table public.push_notification_log enable row level security;

create policy "Users read own push_notification_log"
  on public.push_notification_log for select
  using (auth.uid() = user_id);
