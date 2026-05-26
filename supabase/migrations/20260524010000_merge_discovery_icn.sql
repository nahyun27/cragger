-- 디스커버리클라이밍 ICN 지점 중복 머지.
-- canonical: name='디스커버리클라이밍 클라임스퀘어', branch='ICN'
--            (bulk import — 주소·전화·웹사이트·운영시간·kilter·moonboard 보유)
-- duplicate: name='디스커버리클라이밍', branch='클라임스퀘어 ICN'
--            (seed — size_pyeong=500, opened_at='2015-08-01' 보유)

do $$
declare
  cid uuid;
  did uuid;
begin
  select id into cid from gyms
    where name = '디스커버리클라이밍 클라임스퀘어' and branch = 'ICN';
  select id into did from gyms
    where name = '디스커버리클라이밍' and branch = '클라임스퀘어 ICN';

  if cid is null or did is null then
    raise notice '디스커버리 ICN 머지 skip — canonical=% dup=%', cid, did;
    return;
  end if;

  -- 비-branch 필드 머지 (canonical 우선, dup 의 추가 정보 보충)
  update gyms set
    size_pyeong   = coalesce(size_pyeong,   (select size_pyeong   from gyms where id = did)),
    opened_at     = coalesce(opened_at,     (select opened_at     from gyms where id = did)),
    description   = coalesce(description,   (select description   from gyms where id = did)),
    address       = coalesce(address,       (select address       from gyms where id = did)),
    latitude      = coalesce(latitude,      (select latitude      from gyms where id = did)),
    longitude     = coalesce(longitude,     (select longitude     from gyms where id = did)),
    phone         = coalesce(phone,         (select phone         from gyms where id = did)),
    website_url   = coalesce(website_url,   (select website_url   from gyms where id = did)),
    instagram_handle = coalesce(instagram_handle, (select instagram_handle from gyms where id = did)),
    parking_info  = coalesce(parking_info,  (select parking_info  from gyms where id = did)),
    has_kilter    = has_kilter    or (select has_kilter    from gyms where id = did),
    has_tension   = has_tension   or (select has_tension   from gyms where id = did),
    has_moonboard = has_moonboard or (select has_moonboard from gyms where id = did),
    has_lead      = has_lead      or (select has_lead      from gyms where id = did),
    has_top_rope  = has_top_rope  or (select has_top_rope  from gyms where id = did),
    has_speed     = has_speed     or (select has_speed     from gyms where id = did),
    has_auto_belay = has_auto_belay or (select has_auto_belay from gyms where id = did),
    updated_at    = now()
  where id = cid;

  -- FK 이관 (UNIQUE 제약 있는 쪽은 dup conflict 먼저 삭제)
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

  delete from gyms where id = did;
end $$;
