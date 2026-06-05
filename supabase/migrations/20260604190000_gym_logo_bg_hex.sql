-- 암장 로고 배경색 — 흰/검정 로고가 카드 배경과 안 어울리는 경우 brand 색 지정.
-- 예: 흰 로고 + 검정 배경 (#000000), 검정 로고 + 흰 배경 (#ffffff).
-- null = 기본 흰 카드 배경 (현재 fallback 동작).

alter table gyms
  add column if not exists logo_bg_hex text
  check (logo_bg_hex is null or logo_bg_hex ~ '^#[0-9A-Fa-f]{6}$');

-- 제보 승인 트리거에 logo_bg_hex 처리 추가 (UPDATE / INSERT 양쪽).
create or replace function apply_gym_submission()
returns trigger as $$
declare
  v_new_gym_id uuid;
  v_target_gym uuid;
  v_color text;
  v_max_order int;
  v_arr jsonb;
  v_idx int;
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
      has_shower       = coalesce((new.changes->>'has_shower')::boolean, has_shower),
      has_locker       = coalesce((new.changes->>'has_locker')::boolean, has_locker),
      has_parking      = coalesce((new.changes->>'has_parking')::boolean, has_parking),
      logo_url         = coalesce(new.changes->>'logo_url', logo_url),
      -- JSON null 이면 nullif 로 SQL null 로 변환 → 명시적 "없음" 의미.
      -- changes 에 키 자체가 없으면 ->>'logo_bg_hex' 가 SQL null 이라 coalesce 가 기존값 유지.
      -- 키가 있고 값이 hex 면 hex 저장, 키가 있고 값이 'null' 문자열이면 reset.
      logo_bg_hex      = case
                           when new.changes ? 'logo_bg_hex' then nullif(new.changes->>'logo_bg_hex', 'null')
                           else logo_bg_hex
                         end,
      updated_at       = now()
    where id = new.gym_id;
  end if;

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
      logo_url, logo_bg_hex
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
      new.changes->>'logo_url',
      nullif(new.changes->>'logo_bg_hex', 'null')
    )
    returning id into v_new_gym_id;

    update gym_submissions set gym_id = v_new_gym_id where id = new.id;
  end if;

  if new.status = 'approved' and old.status <> 'approved' then
    v_target_gym := coalesce(new.gym_id, v_new_gym_id);
    if v_target_gym is not null then
      v_arr := new.changes->'add_colors';
      if v_arr is not null and jsonb_typeof(v_arr) = 'array' then
        select coalesce(max(order_index), -1) into v_max_order
          from gym_color_schemes where gym_id = v_target_gym;
        for v_color in select jsonb_array_elements_text(v_arr) loop
          if not exists (
            select 1 from gym_color_schemes
            where gym_id = v_target_gym and lower(color) = lower(v_color)
          ) then
            v_max_order := v_max_order + 1;
            insert into gym_color_schemes(gym_id, color, order_index)
            values (v_target_gym, v_color, v_max_order);
          end if;
        end loop;
      end if;

      v_arr := new.changes->'remove_colors';
      if v_arr is not null and jsonb_typeof(v_arr) = 'array' then
        for v_color in select jsonb_array_elements_text(v_arr) loop
          delete from gym_color_schemes
            where gym_id = v_target_gym and lower(color) = lower(v_color);
        end loop;
      end if;

      v_arr := new.changes->'color_order';
      if v_arr is not null and jsonb_typeof(v_arr) = 'array' then
        update gym_color_schemes
          set order_index = -1000 - order_index
          where gym_id = v_target_gym;
        v_idx := 0;
        for v_color in select jsonb_array_elements_text(v_arr) loop
          update gym_color_schemes
            set order_index = v_idx
            where gym_id = v_target_gym and lower(color) = lower(v_color);
          v_idx := v_idx + 1;
        end loop;
        update gym_color_schemes
          set order_index = 2000 + (-order_index)
          where gym_id = v_target_gym and order_index < 0;
      end if;
    end if;
  end if;

  -- 알림 (submitter 에게) — prefs 체크
  if new.status <> old.status and new.status in ('approved', 'rejected') then
    if notif_enabled(new.submitter_id, 'gym_submission_result') then
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
  end if;

  return new;
end;
$$ language plpgsql security definer;
