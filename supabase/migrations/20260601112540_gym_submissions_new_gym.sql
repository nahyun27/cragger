-- 신규 암장 제안 — gym_submissions.gym_id IS NULL 인 행이 'approved' 가
-- 되면 trigger 가 changes 데이터로 새 gyms 행을 INSERT.
-- name 과 city 는 필수.

create or replace function apply_gym_submission()
returns trigger as $$
declare
  v_new_gym_id uuid;
begin
  -- ─── 기존 암장 수정 (gym_id 있는 경우) ───────────────────
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
      has_shower       = coalesce((new.changes->>'has_shower')::boolean, has_shower),
      has_locker       = coalesce((new.changes->>'has_locker')::boolean, has_locker),
      has_parking      = coalesce((new.changes->>'has_parking')::boolean, has_parking),
      logo_url         = coalesce(new.changes->>'logo_url', logo_url),
      updated_at       = now()
    where id = new.gym_id;
  end if;

  -- ─── 신규 암장 (gym_id NULL) ──────────────────────────────
  if new.status = 'approved' and old.status <> 'approved' and new.gym_id is null then
    if (new.changes->>'name') is null or (new.changes->>'city') is null then
      raise exception '신규 암장 제안은 name 과 city 가 필수입니다';
    end if;
    insert into gyms (
      name, branch, city, district, address,
      size_pyeong, floors_count, opened_at,
      description, parking_info, phone, website_url, instagram_handle,
      has_boulder, has_lead, has_top_rope, has_speed, has_auto_belay,
      has_moonboard, has_kilter, has_tension,
      has_shower, has_locker, has_parking,
      logo_url
    ) values (
      new.changes->>'name',
      new.changes->>'branch',
      new.changes->>'city',
      new.changes->>'district',
      new.changes->>'address',
      nullif(new.changes->>'size_pyeong', '')::int,
      coalesce(nullif(new.changes->>'floors_count', '')::int, 1),
      nullif(new.changes->>'opened_at', '')::date,
      new.changes->>'description',
      new.changes->>'parking_info',
      new.changes->>'phone',
      new.changes->>'website_url',
      new.changes->>'instagram_handle',
      coalesce((new.changes->>'has_boulder')::boolean, true),
      coalesce((new.changes->>'has_lead')::boolean, false),
      coalesce((new.changes->>'has_top_rope')::boolean, false),
      coalesce((new.changes->>'has_speed')::boolean, false),
      coalesce((new.changes->>'has_auto_belay')::boolean, false),
      coalesce((new.changes->>'has_moonboard')::boolean, false),
      coalesce((new.changes->>'has_kilter')::boolean, false),
      coalesce((new.changes->>'has_tension')::boolean, false),
      coalesce((new.changes->>'has_shower')::boolean, false),
      coalesce((new.changes->>'has_locker')::boolean, false),
      coalesce((new.changes->>'has_parking')::boolean, false),
      new.changes->>'logo_url'
    )
    returning id into v_new_gym_id;

    -- 제보 행 gym_id 를 신규 gym 으로 연결해두면 알림 link 가 올바름.
    update gym_submissions set gym_id = v_new_gym_id where id = new.id;
  end if;

  -- ─── 알림 (기존 로직 그대로) ─────────────────────────────
  if new.status <> old.status and new.status in ('approved', 'rejected') then
    declare
      v_gym_name text;
      v_title text;
      v_body text;
      v_link_gym_id uuid;
    begin
      v_link_gym_id := coalesce(new.gym_id, v_new_gym_id);
      select name into v_gym_name from gyms where id = v_link_gym_id;
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
        case when v_link_gym_id is not null then '/gym/' || v_link_gym_id::text else null end
      );
    end;
  end if;

  return new;
end;
$$ language plpgsql security definer;
