-- 크루 4단계: 대결.
-- 개인전(크루 내) + 크루전(크루 vs 크루). 점수는 V그레이드 합산 (client 집계).
-- 별도 점수 저장 X — attempts 에서 실시간 집계.

create table battles (
  id                uuid primary key default gen_random_uuid(),
  battle_type       text not null,
  -- 'individual' = 크루 내 개인전 / 'crew_vs_crew' = 크루전
  title             text not null,
  crew_id           uuid not null references crews(id) on delete cascade,
  opponent_crew_id  uuid references crews(id) on delete cascade,
  status            text not null default 'pending',
  -- 'pending' = 크루전 상대 수락 대기 / 'active' / 'ended' / 'declined'
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  created_by        uuid not null references profiles(id) on delete cascade,
  created_at        timestamptz not null default now()
);
create index idx_battles_crew on battles(crew_id, status);
create index idx_battles_opponent on battles(opponent_crew_id)
  where opponent_crew_id is not null;

alter table battles enable row level security;

-- 조회: 주최 또는 상대 크루 멤버
create policy battles_select_member on battles for select using (
  exists (
    select 1 from crew_members
    where crew_members.crew_id = battles.crew_id
      and crew_members.user_id = auth.uid()
  )
  or (
    opponent_crew_id is not null and exists (
      select 1 from crew_members
      where crew_members.crew_id = battles.opponent_crew_id
        and crew_members.user_id = auth.uid()
    )
  )
);

-- 생성: 주최 크루 멤버만
create policy battles_insert_member on battles for insert with check (
  exists (
    select 1 from crew_members
    where crew_members.crew_id = battles.crew_id
      and crew_members.user_id = auth.uid()
  )
);

-- 수정: 생성자 또는 상대 크루 owner (수락/거절용)
create policy battles_update_creator_or_opponent on battles for update using (
  created_by = auth.uid()
  or (
    opponent_crew_id is not null and exists (
      select 1 from crews
      where crews.id = battles.opponent_crew_id
        and crews.owner_id = auth.uid()
    )
  )
);

-- 삭제: 생성자만
create policy battles_delete_creator on battles for delete using (created_by = auth.uid());
