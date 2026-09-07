-- ROLLBACK del paso 3 (2026-09-07): vuelve a "cualquier registrado lee todo"
-- en estos buckets. Solo si algo se rompe; es menos seguro que el estado actual.
drop policy if exists "Own journal media" on storage.objects;
create policy "Auth can read journal media" on storage.objects for select to authenticated using (bucket_id = 'journal-media');
drop policy if exists "Own receipts" on storage.objects;
create policy "Auth can read receipts" on storage.objects for select to authenticated using (bucket_id = 'receipts');
drop policy if exists "Own shopping photos" on storage.objects;
create policy "Auth can read shopping photos" on storage.objects for select to authenticated using (bucket_id = 'shopping-photos');
drop policy if exists "Chat images of my family" on storage.objects;
create policy "Auth can read chat images" on storage.objects for select to authenticated using (bucket_id = 'chat-images');
drop policy if exists "Chat audio of my family" on storage.objects;
create policy "Auth can read chat audio" on storage.objects for select to authenticated using (bucket_id = 'chat-audio');
