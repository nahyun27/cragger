-- gym-logos 버킷이 어떤 이유로든 누락된 경우 다시 보장.
-- 이전 마이그레이션 (20260531223134) 에서 이미 만들었지만 환경에 따라 누락되는 경우 있음.

insert into storage.buckets (id, name, public)
values ('gym-logos', 'gym-logos', true)
on conflict (id) do nothing;

-- 정책도 멱등 보장
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gym_logos_public_read'
  ) then
    create policy gym_logos_public_read on storage.objects for select
      using (bucket_id = 'gym-logos');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'gym_logos_auth_insert'
  ) then
    create policy gym_logos_auth_insert on storage.objects for insert
      with check (bucket_id = 'gym-logos' and auth.role() = 'authenticated');
  end if;
end $$;
