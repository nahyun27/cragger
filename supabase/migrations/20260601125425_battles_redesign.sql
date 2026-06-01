-- 크루 대결 — 단일 일자 + 단일 암장 + 사전 참가 신청 + 커스텀 점수 규칙.
--
-- 기존 battles 데이터는 schema 충돌이 커서 깔끔히 drop 후 재생성.
-- (battle_type 값도 'individual' → 'crew_internal' 로 변경)
-- 적용된 row 가 있어도 MVP 단계라 손실 수용.

drop table if exists battles cascade;

create table battles (
  id                uuid primary key default gen_random_uuid(),
  battle_type       text not null
                    check (battle_type in ('crew_internal', 'crew_vs_crew')),
  title             text not null,
  crew_id           uuid not null references crews(id) on delete cascade,
  opponent_crew_id  uuid references crews(id) on delete cascade,
  gym_id            uuid not null references gyms(id) on delete restrict,
  battle_date       date not null,
  status            text not null default 'scheduled'
                    check (status in ('scheduled', 'active', 'ended', 'declined')),
  scoring_rules     jsonb not null default '{"type": "linear", "base": 1}'::jsonb,
  created_by        uuid not null references profiles(id) on delete cascade,
  created_at        timestamptz not null default now()
);

create index idx_battles_crew      on battles(crew_id, status);
create index idx_battles_opponent  on battles(opponent_crew_id) where opponent_crew_id is not null;
create index idx_battles_date      on battles(battle_date desc);

alter table battles enable row level security;

-- 조회: 주최 또는 상대 크루 멤버
create policy battles_select_member on battles for select using (
  exists (
    select 1 from crew_members
    where crew_members.user_id = auth.uid()
      and crew_members.crew_id in (battles.crew_id, coalesce(battles.opponent_crew_id, '00000000-0000-0000-0000-000000000000'::uuid))
  )
);

-- 생성: 크루 멤버 (호스트 크루에 본인이 멤버여야 함)
create policy battles_insert_member on battles for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from crew_members
    where crew_members.user_id = auth.uid()
      and crew_members.crew_id = battles.crew_id
  )
);

-- 수정/삭제: 호스트 크루의 owner 또는 created_by
create policy battles_update_owner on battles for update using (
  created_by = auth.uid()
  or exists (
    select 1 from crews
    where crews.id = battles.crew_id and crews.owner_id = auth.uid()
  )
  or exists (  -- 크루전 상대 owner 는 수락/거절 가능
    select 1 from crews
    where crews.id = battles.opponent_crew_id and crews.owner_id = auth.uid()
  )
);
create policy battles_delete_owner on battles for delete using (
  created_by = auth.uid()
  or exists (
    select 1 from crews
    where crews.id = battles.crew_id and crews.owner_id = auth.uid()
  )
);

-- ─── battle_participants ──────────────────────────────────
create table battle_participants (
  battle_id  uuid not null references battles(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (battle_id, user_id)
);
create index idx_battle_participants_user on battle_participants(user_id);

alter table battle_participants enable row level security;

-- SELECT: 누구나 (대결 자체가 visible 한 사람이면 참가자도 보임)
create policy bp_select_any on battle_participants for select using (
  exists (
    select 1 from battles b
    join crew_members cm on cm.user_id = auth.uid()
      and cm.crew_id in (b.crew_id, coalesce(b.opponent_crew_id, '00000000-0000-0000-0000-000000000000'::uuid))
    where b.id = battle_participants.battle_id
  )
);

-- INSERT: 본인 참가 신청. 단, 해당 battle 의 호스트 또는 상대 크루 멤버여야.
create policy bp_insert_self on battle_participants for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from battles b
    join crew_members cm on cm.user_id = auth.uid()
      and cm.crew_id in (b.crew_id, coalesce(b.opponent_crew_id, '00000000-0000-0000-0000-000000000000'::uuid))
    where b.id = battle_participants.battle_id
  )
);

-- DELETE: 본인 취소
create policy bp_delete_self on battle_participants for delete using (
  user_id = auth.uid()
);
