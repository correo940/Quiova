-- ROLLBACK del cierre de Storage (2026-09-06).
update storage.buckets set public = true
 where id in ('secure-docs','avatars','chat-audio','chat-images','debate-audio',
              'debate-media','journal-media','receipts','shopping-photos');

create policy "Allow public select for bridge-uploads" on storage.objects for select to public
  using (bucket_id = 'secure-docs');
create policy "Allow public uploads to bridge-uploads" on storage.objects for insert to public
  with check (bucket_id = 'secure-docs' and (storage.foldername(name))[1] = 'bridge-uploads');

drop policy if exists "Auth can read chat audio" on storage.objects;
create policy "Anyone can read chat audio" on storage.objects for select to public using (bucket_id = 'chat-audio');
drop policy if exists "Auth can read chat images" on storage.objects;
create policy "Anyone can read chat images" on storage.objects for select to public using (bucket_id = 'chat-images');
drop policy if exists "Auth can read receipts" on storage.objects;
create policy "Anyone can read receipts" on storage.objects for select to public using (bucket_id = 'receipts');
drop policy if exists "Auth can read journal media" on storage.objects;
create policy "Public Access" on storage.objects for select to public using (bucket_id = 'journal-media');
drop policy if exists "Auth can read thought media" on storage.objects;
create policy "Anyone can view thought media" on storage.objects for select to public using (bucket_id = 'confessions');
drop policy if exists "Auth can read avatars" on storage.objects;
create policy "Avatar images are public" on storage.objects for select to public using (bucket_id = 'avatars');
drop policy if exists "Auth can read shopping photos" on storage.objects;
create policy "Shopping photos are public" on storage.objects for select to public using (bucket_id = 'shopping-photos');
drop policy if exists "Auth can read debate audio" on storage.objects;
create policy "Public Access Debate Audio" on storage.objects for select to public using (bucket_id = 'debate-audio');
drop policy if exists "Auth can read debate media" on storage.objects;
create policy "Public Access Debate Media" on storage.objects for select to public using (bucket_id = 'debate-media');
