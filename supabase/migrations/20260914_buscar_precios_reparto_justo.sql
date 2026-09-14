-- El limite de buscar_precios_contiene/similar era global (top N entre TODOS
-- los supermercados juntos, ordenado por longitud/similitud). Con catalogos
-- muy desiguales (Mercadona/Carrefour con miles de filas vs Aldi con ~100),
-- los supermercados grandes copaban las N plazas antes de que le tocara el
-- turno a uno pequeno: buscar "pan" no devolvia nada de Aldi aunque si tenia
-- coincidencia, simplemente su nombre mas largo quedaba fuera del top 40
-- global. Se reparte el limite POR supermercado con una ventana, no en total.

create or replace function public.buscar_precios_contiene(termino text, limite int default 20)
returns setof public.precios_supermercado
language sql stable as $$
  select p.id, p.supermercado, p.producto_externo_id, p.ean, p.nombre, p.precio,
         p.formato, p.actualizado_en, p.imagen_url
  from (
    select p.*,
           row_number() over (partition by p.supermercado order by length(p.nombre) asc) as posicion
    from public.precios_supermercado p
    where p.nombre ~* ('\y' || termino || '\y')
  ) p
  where p.posicion <= limite
  order by length(p.nombre) asc;
$$;

create or replace function public.buscar_precios_similar(termino text, limite int default 20)
returns table (id uuid, supermercado text, producto_externo_id text, ean text, nombre text,
  precio numeric(10,2), formato text, imagen_url text, actualizado_en timestamptz, sim real)
language sql stable as $$
  select p.id, p.supermercado, p.producto_externo_id, p.ean, p.nombre, p.precio,
         p.formato, p.imagen_url, p.actualizado_en, p.sim
  from (
    select p.*, similarity(p.nombre, termino) as sim,
           row_number() over (partition by p.supermercado order by similarity(p.nombre, termino) desc) as posicion
    from public.precios_supermercado p
  ) p
  where p.posicion <= limite
  order by p.sim desc;
$$;
