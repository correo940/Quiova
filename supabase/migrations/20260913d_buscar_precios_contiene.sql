-- El parecido de texto (similarity) cuela falsos positivos: buscando "pan"
-- aparecía "Patata" (comparten suficientes trocitos de letras). Esta función
-- busca primero la palabra completa dentro del nombre (con límites de
-- palabra, \y): "pan" encuentra "Pan Viena" o "Barra de pan", pero no
-- "Patata" ni tampoco "Panceta" o "Empanada" (ahí "pan" va pegado a otras
-- letras, no es una palabra suelta). El llamador prueba esto primero y solo
-- si no hay nada cae en buscar_precios_similar (parecido por texto), que es
-- lo que hace falta para casos como "macarrones" -> "Macarrón" (con acento y
-- sin la ese, no hay match de palabra exacta posible).
create or replace function public.buscar_precios_contiene(termino text, limite int default 20)
returns setof public.precios_supermercado
language sql
stable
as $$
  select *
  from public.precios_supermercado
  where nombre ~* ('\y' || termino || '\y')
  order by length(nombre) asc
  limit limite;
$$;
