-- 새 제보 → admin 알림 트리거에서 self-submitter 예외 제거.
-- 1인 admin 환경에서 본인 제보가 본인에게 안 오는 문제 해소.
-- 다인 admin 환경에서 self-noti 가 약간 거슬릴 수 있지만 무해.

create or replace function notify_admins_on_new_submission()
returns trigger as $$
declare
  v_admin record;
  v_gym_name text;
  v_title text;
  v_body text;
begin
  -- 제보 대상 암장 이름 (신규 제안이면 changes->>'name')
  if new.gym_id is not null then
    select name into v_gym_name from gyms where id = new.gym_id;
  else
    v_gym_name := coalesce(new.changes->>'name', '신규 암장');
  end if;
  v_title := '새 제보가 들어왔어요';
  v_body  := coalesce(v_gym_name, '암장') || ' 정보 제보가 검토 대기중이에요.';

  for v_admin in
    select id from profiles
    where is_admin = true
    -- self-submitter 예외 제거 — 본인이 제보한 것도 본인이 받음 (1인 admin 환경 대응)
  loop
    if notif_enabled(v_admin.id, 'gym_submission_new') then
      insert into notifications(user_id, type, title, body, link)
      values (
        v_admin.id,
        'gym_submission_new',
        v_title,
        v_body,
        '/admin/submissions'
      );
    end if;
  end loop;
  return new;
end;
$$ language plpgsql security definer;
