-- Mi Viaje: coordenadas por evento, para el mapa interactivo del itinerario
alter table public.trip_events
  add column if not exists lat double precision,
  add column if not exists lng double precision;
