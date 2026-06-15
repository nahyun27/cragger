-- 팀전 호스트가 크루 멤버를 생성 시점에 사전 배정할 수 있도록 RLS 추가.
-- 기존 bp_insert_self 는 user_id = auth.uid() 만 허용 → 호스트가 남을 못 넣음.
-- 새 정책: battles.created_by = auth.uid() && 추가 대상이 그 크루 멤버인 경우 허용.

create policy bp_insert_host on battle_participants for insert with check (
  exists (
    select 1
    from battles b
    join crew_members cm on cm.crew_id = b.crew_id
    where b.id = battle_participants.battle_id
      and b.created_by = auth.uid()
      and cm.user_id = battle_participants.user_id
  )
);

-- 호스트가 사전 배정 멤버를 빼는 것도 가능하게.
create policy bp_delete_host on battle_participants for delete using (
  exists (
    select 1 from battles b
    where b.id = battle_participants.battle_id
      and b.created_by = auth.uid()
  )
);
