-- ──────────────────────────────────────────────────────────────
-- 사용자 제보 기반 데이터 보정
-- ──────────────────────────────────────────────────────────────

-- (1) 더클라임 B 홍대점 — 폐업
delete from gyms where name = '더클라임 B' and branch = '홍대점';

-- (2) 캐치스톤클라이밍짐 부천시청역점 — 폐업
delete from gyms where name = '캐치스톤클라이밍짐' and branch = '부천시청역점';

-- (3) 웨이브락 클라이밍 광안점 — 폐업
delete from gyms where name = '웨이브락 클라이밍' and branch = '광안점';

-- (4) 서울볼더스 선유점 — 문보드 보유
update gyms set
  has_moonboard = true,
  updated_at = now()
where name = '서울볼더스 선유' and branch is null;

-- (5) 캐치스톤클라이밍짐 부천역점 중복 머지
-- canonical: branch=NULL  (seed; size_pyeong=300, opened_at, description 보존)
-- duplicate: branch='부천역점' (bulk; address 보유)
-- 처리 순서: 비-branch 필드 머지 → FK 이관 → dup 삭제 → canonical에 branch='부천역점' 부여
-- (branch update를 마지막에 해야 UNIQUE(name,branch) 충돌 안 남)
do $$
declare
  cid uuid;
  did uuid;
begin
  select id into cid from gyms where name = '캐치스톤클라이밍짐' and branch is null;
  select id into did from gyms where name = '캐치스톤클라이밍짐' and branch = '부천역점';

  if cid is null or did is null then
    raise notice '캐치스톤 부천역점 머지 skip — canonical=% dup=%', cid, did;
    return;
  end if;

  -- Phase 1: 비-branch 필드 머지 (canonical 우선, dup의 추가 정보 보충)
  update gyms set
    city             = coalesce((select city from gyms where id = did),     city),
    district         = coalesce((select district from gyms where id = did), district),
    address          = coalesce(address,          (select address          from gyms where id = did)),
    latitude         = coalesce(latitude,         (select latitude         from gyms where id = did)),
    longitude        = coalesce(longitude,        (select longitude        from gyms where id = did)),
    phone            = coalesce(phone,            (select phone            from gyms where id = did)),
    website_url      = coalesce(website_url,      (select website_url      from gyms where id = did)),
    instagram_handle = coalesce(instagram_handle, (select instagram_handle from gyms where id = did)),
    parking_info     = coalesce(parking_info,     (select parking_info     from gyms where id = did)),
    has_kilter       = has_kilter       or (select has_kilter       from gyms where id = did),
    has_tension      = has_tension      or (select has_tension      from gyms where id = did),
    has_moonboard    = has_moonboard    or (select has_moonboard    from gyms where id = did),
    has_lead         = has_lead         or (select has_lead         from gyms where id = did),
    has_top_rope     = has_top_rope     or (select has_top_rope     from gyms where id = did),
    has_speed        = has_speed        or (select has_speed        from gyms where id = did),
    has_auto_belay   = has_auto_belay   or (select has_auto_belay   from gyms where id = did),
    updated_at       = now()
  where id = cid;

  -- Phase 2: FK 이관 (UNIQUE 제약 있는 곳은 dup 쪽 conflict 먼저 삭제)
  update profiles set home_gym_id = cid where home_gym_id = did;
  delete from gym_color_schemes where gym_id = did and
    (color in (select color from gym_color_schemes where gym_id = cid)
     or order_index in (select order_index from gym_color_schemes where gym_id = cid));
  update gym_color_schemes set gym_id = cid where gym_id = did;
  update gym_prices  set gym_id = cid where gym_id = did;
  update sessions    set gym_id = cid where gym_id = did;
  update problems    set gym_id = cid where gym_id = did;
  update memberships set gym_id = cid where gym_id = did;
  delete from grade_votes where gym_id = did and (user_id, color) in
    (select user_id, color from grade_votes where gym_id = cid);
  update grade_votes set gym_id = cid where gym_id = did;
  delete from gym_favorites where gym_id = did and user_id in
    (select user_id from gym_favorites where gym_id = cid);
  update gym_favorites set gym_id = cid where gym_id = did;
  update posts set gym_id = cid where gym_id = did;

  -- Phase 3: dup 삭제 → (name='캐치스톤클라이밍짐', branch='부천역점') slot 해제
  delete from gyms where id = did;

  -- Phase 4: canonical에 branch='부천역점' 부여 (이제 UNIQUE 충돌 없음)
  update gyms set branch = '부천역점' where id = cid;
end $$;
