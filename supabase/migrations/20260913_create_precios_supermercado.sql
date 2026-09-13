-- Precios de supermercado para comparar al escanear un código de barras.
-- Empieza solo con Mercadona; la columna "supermercado" deja sitio para más.
-- El listado de categorías de Mercadona trae precio pero no EAN, así que el EAN
-- se rellena aparte (una vez por producto, ya no cambia) vía /api/products/<id>/.

create table if not exists public.precios_supermercado (
  id                  uuid primary key default gen_random_uuid(),
  supermercado        text not null,
  producto_externo_id text not null,
  ean                 text,
  nombre              text not null,
  precio              numeric(10,2) not null,
  formato             text,
  actualizado_en      timestamp with time zone not null default now(),
  unique (supermercado, producto_externo_id)
);

alter table public.precios_supermercado enable row level security;

-- Datos de catálogo, no de un usuario: cualquiera con sesión puede leerlos.
-- Solo el cron (con supabaseAdmin, que salta RLS) escribe.
create policy "Usuarios autenticados leen precios_supermercado"
  on public.precios_supermercado for select
  to authenticated
  using (true);

create index if not exists precios_supermercado_ean_idx
  on public.precios_supermercado (ean);

create index if not exists precios_supermercado_ean_pendiente_idx
  on public.precios_supermercado (supermercado)
  where ean is null;
