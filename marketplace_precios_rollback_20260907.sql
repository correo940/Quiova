-- ROLLBACK: restaura los precios que tenia marketplace_apps antes de ponerlos
-- a 0 el 2026-09-07. Al volver a tener precio > 0, las apps se bloquean solas
-- para quien no las haya comprado (esa logica no se toco, solo ignora el 0).
update public.marketplace_apps set price = 9.99 where key = 'assistant';
update public.marketplace_apps set price = 3.99 where key = 'roster';
update public.marketplace_apps set price = 1.99 where key = 'tasks';
update public.marketplace_apps set price = 1.99 where key = 'desktop';
update public.marketplace_apps set price = 4.99 where key = 'documents';
update public.marketplace_apps set price = 5.99 where key = 'passwords';
update public.marketplace_apps set price = 2.99 where key = 'chef-ia';
update public.marketplace_apps set price = 4.99 where key = 'shopping';
