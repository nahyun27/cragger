-- ============================================================
-- Gym favorites: 사용자가 자주 가는 암장 즐겨찾기
-- 복합 PK (user_id, gym_id) → 자연스러운 unique, UPSERT는 사용 안 함
-- (단순 INSERT / DELETE 토글).
-- ============================================================

create table if not exists gym_favorites (
  user_id    uuid not null references profiles(id) on delete cascade,
  gym_id     uuid not null references gyms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, gym_id)
);

create index if not exists idx_gym_favorites_user
  on gym_favorites(user_id, created_at desc);

alter table gym_favorites enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname='gym_favorites_select_self' and tablename='gym_favorites') then
    create policy gym_favorites_select_self on gym_favorites
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname='gym_favorites_insert_self' and tablename='gym_favorites') then
    create policy gym_favorites_insert_self on gym_favorites
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where policyname='gym_favorites_delete_self' and tablename='gym_favorites') then
    create policy gym_favorites_delete_self on gym_favorites
      for delete using (auth.uid() = user_id);
  end if;
end $$;
