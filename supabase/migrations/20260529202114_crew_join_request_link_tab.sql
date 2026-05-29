-- 크루장 알림(가입 요청 도착) 의 link 에 ?tab=members 추가 →
-- 알림에서 진입 시 자동으로 멤버 탭으로 가서 요청 카드 노출.

create or replace function crew_join_request_notify_owner()
returns trigger as $$
declare
  v_crew_name text;
  v_owner_id uuid;
  v_username text;
begin
  if new.status <> 'pending' then return new; end if;
  select c.name, c.owner_id into v_crew_name, v_owner_id
    from crews c where c.id = new.crew_id;
  select coalesce(p.display_name, p.username) into v_username
    from profiles p where p.id = new.user_id;

  if v_owner_id is not null and v_owner_id <> new.user_id then
    insert into notifications(user_id, type, title, body, link)
    values (
      v_owner_id,
      'crew_join_request',
      '가입 요청 도착',
      coalesce(v_username, '누군가') || ' 님이 ' || v_crew_name || ' 가입을 요청했어요.',
      '/crew/' || new.crew_id::text || '?tab=members'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;
