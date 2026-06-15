-- apply_gym_submission 트리거에 spray_wall_photos 배열 처리 추가.
-- changes.spray_wall_photos (string[]) 가 있으면 spray_wall_photos 테이블에 INSERT.

create or replace function apply_gym_submission()
returns trigger as $$
declare
  v_photo_url text;
  v_order     int;
  v_gym_name  text;
  v_title     text;
  v_body      text;
begin
  if new.status = 'approved' and old.status <> 'approved' and new.gym_id is not null then
    update gyms set
      city             = coalesce(new.changes->>'city', city),
      district         = coalesce(new.changes->>'district', district),
      address          = coalesce(new.changes->>'address', address),
      size_pyeong      = coalesce((new.changes->>'size_pyeong')::int, size_pyeong),
      floors_count     = coalesce((new.changes->>'floors_count')::int, floors_count),
      opened_at        = coalesce((new.changes->>'opened_at')::date, opened_at),
      description      = coalesce(new.changes->>'description', description),
      parking_info     = coalesce(new.changes->>'parking_info', parking_info),
      phone            = coalesce(new.changes->>'phone', phone),
      website_url      = coalesce(new.changes->>'website_url', website_url),
      instagram_handle = coalesce(new.changes->>'instagram_handle', instagram_handle),
      has_boulder      = coalesce((new.changes->>'has_boulder')::boolean, has_boulder),
      has_lead         = coalesce((new.changes->>'has_lead')::boolean, has_lead),
      has_top_rope     = coalesce((new.changes->>'has_top_rope')::boolean, has_top_rope),
      has_speed        = coalesce((new.changes->>'has_speed')::boolean, has_speed),
      has_auto_belay   = coalesce((new.changes->>'has_auto_belay')::boolean, has_auto_belay),
      has_moonboard    = coalesce((new.changes->>'has_moonboard')::boolean, has_moonboard),
      has_kilter       = coalesce((new.changes->>'has_kilter')::boolean, has_kilter),
      has_tension      = coalesce((new.changes->>'has_tension')::boolean, has_tension),
      has_spray_wall   = coalesce((new.changes->>'has_spray_wall')::boolean, has_spray_wall),
      has_shower       = coalesce((new.changes->>'has_shower')::boolean, has_shower),
      has_locker       = coalesce((new.changes->>'has_locker')::boolean, has_locker),
      has_parking      = coalesce((new.changes->>'has_parking')::boolean, has_parking),
      logo_url         = coalesce(new.changes->>'logo_url', logo_url),
      updated_at       = now()
    where id = new.gym_id;

    -- 스프레이월 사진 — URL 배열을 spray_wall_photos 에 INSERT
    if new.changes ? 'spray_wall_photos' then
      select coalesce(max(display_order) + 1, 0)
        into v_order
        from spray_wall_photos
       where gym_id = new.gym_id;

      for v_photo_url in
        select jsonb_array_elements_text(new.changes->'spray_wall_photos')
      loop
        insert into spray_wall_photos(gym_id, photo_url, display_order, uploaded_by)
        values (new.gym_id, v_photo_url, v_order, new.decided_by);
        v_order := v_order + 1;
      end loop;
    end if;
  end if;

  -- 승인/거절 시 제보자에게 알림
  if new.status <> old.status and new.status in ('approved', 'rejected') then
    select name into v_gym_name from gyms where id = new.gym_id;
    if new.status = 'approved' then
      v_title := '암장 정보 제보가 반영됐어요';
      v_body := coalesce(v_gym_name, '암장') || ' 정보 제보가 승인됐어요. 감사합니다!';
    else
      v_title := '암장 정보 제보가 거절됐어요';
      v_body := coalesce(v_gym_name, '암장') || ' 정보 제보가 거절됐어요.'
        || case when new.admin_notes is not null then ' 사유: ' || new.admin_notes else '' end;
    end if;
    insert into notifications(user_id, type, title, body, link)
    values (
      new.submitter_id,
      'gym_submission_' || new.status,
      v_title,
      v_body,
      case when new.gym_id is not null then '/gym/' || new.gym_id::text else null end
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;
