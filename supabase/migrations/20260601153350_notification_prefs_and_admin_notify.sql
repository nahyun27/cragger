-- 알림 설정 + 새 제보가 들어오면 관리자에게 알림
--
-- 1) profiles.notification_prefs JSONB — { channel_key: false } 로 끄기. 누락 = 켜짐.
--    예) { "gym_submission_new": false, "gym_submission_result": true }
-- 2) gym_submissions INSERT 시 admin 들에게 notification 생성 — type=gym_submission_new
-- 3) 기존 승인/거절 트리거(apply_gym_submission) 의 notification 부분은 그대로 두되,
--    submitter 의 notification_prefs.gym_submission_result === false 면 skip.

-- ── 1) prefs 컬럼 ────────────────────────────────────────────
alter table profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

-- helper: 이 user 가 이 channel 알림을 받겠다고 했는가? (default true)
create or replace function notif_enabled(p_user uuid, p_channel text)
returns boolean as $$
declare
  v_val jsonb;
begin
  select notification_prefs->p_channel into v_val
    from profiles where id = p_user;
  if v_val is null or jsonb_typeof(v_val) <> 'boolean' then
    return true;          -- 누락 = 켜짐
  end if;
  return (v_val::text)::boolean;
end;
$$ language plpgsql stable security definer;

-- ── 2) 새 제보 → admin 알림 ─────────────────────────────────
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
      and id <> new.submitter_id  -- 자기가 보낸 건 자기에게 안 보냄
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

drop trigger if exists trg_notify_admins_on_new_submission on gym_submissions;
create trigger trg_notify_admins_on_new_submission
  after insert on gym_submissions
  for each row execute function notify_admins_on_new_submission();

-- ── 3) 기존 apply_gym_submission 의 submitter 알림은 prefs 체크 추가 ───
-- (function 전체를 다시 정의: 기존 본문에서 notification 부분만 prefs gate)
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
        v_idx := 0;
        for v_color in select jsonb_array_elements_text(v_arr) loop
          update gym_color_schemes
            set order_index = v_idx
            where gym_id = v_target_gym and lower(color) = lower(v_color);
          v_idx := v_idx + 1;
        end loop;
        update gym_color_schemes
          set order_index = order_index + 1000
          where gym_id = v_target_gym
            and lower(color) not in (
              select lower(jsonb_array_elements_text(v_arr))
            );
      end if;
    end if;
  end if;

  -- ─── 알림 (submitter 에게) — prefs 체크 ───────────────────
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

-- profiles 의 notification_prefs UPDATE 권한은 본인에만.
-- 이미 profiles 에 self-update RLS 가 있으면 column 도 자동 포함되지만, 명시적으로 보장.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_update_self'
  ) then
    create policy profiles_update_self on profiles
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;
