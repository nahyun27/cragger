-- Public storage bucket for community post images.
-- Path convention: {user_id}/{uuid}.jpg — RLS keys off the first path segment.

insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do nothing;

drop policy if exists "post_images_read" on storage.objects;
drop policy if exists "post_images_insert" on storage.objects;
drop policy if exists "post_images_update" on storage.objects;
drop policy if exists "post_images_delete" on storage.objects;

create policy "post_images_read" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "post_images_insert" on storage.objects
  for insert with check (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "post_images_update" on storage.objects
  for update using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "post_images_delete" on storage.objects
  for delete using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
