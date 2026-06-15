-- 스프레이월 사진 업로드용 Storage 버킷 생성.
-- use-spray-wall.ts 에서 'gym-photos' 버킷에 spray-wall/<gym_id>/<timestamp>.<ext> 경로로 업로드.

insert into storage.buckets (id, name, public)
values ('gym-photos', 'gym-photos', true)
on conflict (id) do nothing;

-- 모든 사람 read (public bucket)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gym_photos_public_read'
  ) then
    create policy gym_photos_public_read on storage.objects for select
      using (bucket_id = 'gym-photos');
  end if;
end $$;

-- 인증된 사용자 INSERT
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gym_photos_auth_insert'
  ) then
    create policy gym_photos_auth_insert on storage.objects for insert
      with check (bucket_id = 'gym-photos' and auth.role() = 'authenticated');
  end if;
end $$;

-- 본인 업로드 파일 삭제
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gym_photos_auth_delete'
  ) then
    create policy gym_photos_auth_delete on storage.objects for delete
      using (bucket_id = 'gym-photos' and auth.uid() = owner);
  end if;
end $$;
