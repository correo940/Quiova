-- ROLLBACK del cierre de RPCs (2026-09-05).
-- Devuelve el permiso de ejecucion al rol PUBLIC en todas las funciones SECURITY DEFINER
-- de public, que es como estaban antes.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('grant execute on function %s to public', f.sig);
  end loop;
end $$;
