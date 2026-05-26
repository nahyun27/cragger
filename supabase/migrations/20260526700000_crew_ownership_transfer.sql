-- 크루장 위임을 위한 RLS 추가.
-- crew_members.role 변경은 현재 owner 만 가능 (자기 + 위임받을 자 모두).
-- crews.owner_id 변경은 기존 owner update policy 로 이미 OK.

create policy cm_update_by_owner on crew_members for update using (
  exists (
    select 1 from crews
    where crews.id = crew_members.crew_id
      and crews.owner_id = auth.uid()
  )
);
