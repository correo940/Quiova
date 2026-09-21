-- Marcha atrás de la migración shopping_items_pantry_dates (21-09-2026).
-- Borra la fecha de entrada en despensa y la fecha de caducidad de todos los productos.
alter table public.shopping_items drop column if exists pantry_at, drop column if exists expires_at;
