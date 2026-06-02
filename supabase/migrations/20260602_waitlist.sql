create table if not exists public.waitlist (
  id         uuid default uuid_generate_v4() primary key,
  email      text unique not null,
  created_at text not null
);

-- Solo admins pueden leer; inserts via service_role (API route)
alter table public.waitlist enable row level security;

create policy "Admins can read waitlist"
  on public.waitlist for select
  using (auth.uid() in (
    select id from auth.users where raw_user_meta_data->>'role' = 'admin'
  ));
