-- Mi Viaje: centro de documentos — billetes, QRs, hoteles con borrado automático de la foto
-- El texto extraído se conserva siempre (para compartir el viaje en el futuro);
-- solo el archivo (foto/QR) se borra tras retention_days días desde el fin del viaje.

create table if not exists public.trip_assets (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid references public.trips on delete cascade not null,
  asset_type     text not null default 'other', -- flight | hotel | activity | transport | other
  title          text not null,
  reference_code text,
  event_date     timestamp with time zone,
  location       text,
  file_path      text,             -- ruta en storage; null una vez borrada la foto
  extracted_text text,             -- texto OCR/IA, se conserva siempre
  retention_days integer not null default 30 check (retention_days in (15, 30)),
  expires_at     timestamp with time zone not null,
  photo_deleted_at timestamp with time zone,
  created_at     timestamp with time zone default now()
);

alter table public.trip_assets enable row level security;

create policy "Users CRUD own trip_assets"
  on public.trip_assets for all
  using (auth.uid() = (select user_id from public.trips where id = trip_id));

create index if not exists trip_assets_trip_id_idx on public.trip_assets(trip_id);
create index if not exists trip_assets_expiry_idx on public.trip_assets(expires_at) where file_path is not null;

-- Bucket privado para las fotos/QRs de viaje
insert into storage.buckets (id, name, public)
values ('trip-documents', 'trip-documents', false)
on conflict (id) do nothing;

create policy "Users can view own trip documents"
on storage.objects for select
using (
  bucket_id = 'trip-documents' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);

create policy "Users can upload own trip documents"
on storage.objects for insert
with check (
  bucket_id = 'trip-documents' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);

create policy "Users can delete own trip documents"
on storage.objects for delete
using (
  bucket_id = 'trip-documents' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);
