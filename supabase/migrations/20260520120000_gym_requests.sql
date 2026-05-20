-- ============================================================
-- Gym requests: 사용자가 시드에 없는 암장 추가 요청
-- 운영자(개발자 본인)가 Supabase Studio에서 row 검토 후 gyms에 수동 추가.
-- 정식 admin workflow는 v1.1+.
-- ============================================================

create table if not exists gym_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  branch        text check (branch is null or char_length(branch) <= 50),
  location_hint text check (location_hint is null or char_length(location_hint) <= 100),
  note          text check (note is null or char_length(note) <= 300),
  created_at    timestamptz not null default now()
);

create index if not exists idx_gym_requests_created on gym_requests(created_at desc);
create index if not exists idx_gym_requests_user on gym_requests(user_id);

alter table gym_requests enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'gym_requests_select_self' and tablename = 'gym_requests') then
    create policy gym_requests_select_self on gym_requests
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'gym_requests_insert_self' and tablename = 'gym_requests') then
    create policy gym_requests_insert_self on gym_requests
      for insert with check (auth.uid() = user_id);
  end if;
end $$;
