-- Empareja "macarrones" (lo que escribió el usuario) con "Macarrón Hacendado"
-- (nombre real del catálogo) por parecido de texto, no por coincidencia exacta.
-- Sin el operador "%" de pg_trgm: su umbral por defecto (0.3) dejaba fuera
-- pares válidos como "macarrones" / "Macarrón" (similarity ~0.25) por el
-- plural y la tilde. Mejor devolver el ranking completo y que decida quien
-- llama a partir de qué similitud se fía del resultado.
create or replace function public.buscar_precios_similar(termino text, limite int default 20)
returns table (
  id uuid,
  supermercado text,
  producto_externo_id text,
  ean text,
  nombre text,
  precio numeric(10,2),
  formato text,
  imagen_url text,
  actualizado_en timestamp with time zone,
  sim real
)
language sql
stable
as $$
  select p.id, p.supermercado, p.producto_externo_id, p.ean, p.nombre, p.precio,
         p.formato, p.imagen_url, p.actualizado_en,
         similarity(p.nombre, termino) as sim
  from public.precios_supermercado p
  order by sim desc
  limit limite;
$$;
