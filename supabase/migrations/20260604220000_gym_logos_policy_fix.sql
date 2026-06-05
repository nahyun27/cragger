-- gym-logos 버킷 INSERT 정책 보정.
-- 기존 정책은 auth.role() = 'authenticated' 를 체크 — 환경에 따라
-- 인증된 세션도 'authenticated' 값이 아닐 수 있어 RLS 거부됨.
-- 안전하게 auth.uid() is not null + 경로가 본인 userId 로 시작하는지 체크.

drop policy if exists gym_logos_auth_insert on storage.objects;

create policy gym_logos_auth_insert on storage.objects for insert
  with check (
    bucket_id = 'gym-logos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- read 정책도 멱등 보장 (public)
drop policy if exists gym_logos_public_read on storage.objects;
create policy gym_logos_public_read on storage.objects for select
  using (bucket_id = 'gym-logos');
