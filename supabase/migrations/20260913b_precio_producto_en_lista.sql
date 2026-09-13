-- Soporte para "ver precios y elegir super" al pulsar un producto de la lista
-- de la compra o la despensa.

-- Imagen del producto, para mostrarla en la pantalla de comparación y luego
-- en la tarjeta del producto elegido.
alter table public.precios_supermercado
  add column if not exists imagen_url text;

-- Código de barras (si se añadió escaneando), y lo elegido al pulsar "comprar
-- aquí": supermercado (columna "supermarket" ya existía), precio de hoy e imagen.
alter table public.shopping_items
  add column if not exists barcode text,
  add column if not exists precio_actual numeric(10,2),
  add column if not exists precio_actualizado_en timestamp with time zone,
  add column if not exists imagen_producto_url text;

create index if not exists shopping_items_barcode_idx
  on public.shopping_items (barcode)
  where barcode is not null;

-- Para emparejar "macarrones" (nombre libre que escribió el usuario) con
-- "Macarrón Hacendado" (nombre del catálogo) cuando no hay código de barras.
create extension if not exists pg_trgm;

create index if not exists precios_supermercado_nombre_trgm_idx
  on public.precios_supermercado using gin (nombre gin_trgm_ops);
